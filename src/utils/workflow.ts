import { BaseMessage } from "@langchain/core/messages";
import { StructuredTool } from "@langchain/core/tools";
import { ChatOpenAI, ClientOptions } from "@langchain/openai";
import { parse } from "yaml";
import { GraphRunner } from "../agents";
import { GraphNode } from "../types";
import { logger } from "./logger";
import { GTP_MODEL } from "./variables";

/**
 *  Parses a workflow from a source string and returns an array of GraphNode objects.
 *
 *  @param {string} config - The workflow configuration in YAML format.
 *  @param tools - The available tools to match with the optionally defined tools of each workflow node.
 *
 *  @return {GraphNode[]} - An array of GraphNode objects representing the workflow.
 */
export function parseWorkflow(
  config: string,
  tools: StructuredTool[] = [],
): GraphNode[] {
  const workflow = parse(config);
  logger("Running workflow:", workflow);

  const nodes: GraphNode[] = [];

  Object.keys(workflow).map((key) => {
    const prop = workflow[key];

    // the workflow optionally defines tool names for each graph node.
    const selected: StructuredTool[] = prop.tools?.map((toolName: string) => {
      // return the tool matching the tool.name with the provided toolName
      // Otherwise, throw an error if no match found.
      return (
        tools.find((tool) => tool.name === toolName) ||
        (() => {
          throw new Error(`Tool \`${toolName}\` not found.`);
        })()
      );
    });

    const node: GraphNode = {
      name: key,
      instructions: prop.instructions,
      links: [],
      tools: selected || [],
    };
    nodes.push(node);
  });

  // Update each node's links with the corresponding GraphNode objects
  nodes.forEach((node) => {
    const prop = workflow[node.name];
    if (prop.links) {
      node.links = prop.links.map((linkName: string) => {
        const linkedNode = nodes.find((n) => n.name === linkName);
        if (!linkedNode) {
          throw new Error(`Linked node \`${linkName}\` not found.`);
        }
        return linkedNode;
      });
    }
  });

  return nodes;
}

/**
 *  Runs a workflow using a set of graph nodes and a prompt.
 *
 *  @param {GraphNode[]} nodes - An array of graph nodes representing the workflow.
 *  @param {BaseMessage[]} messages - The current message context of the workflow.
 *
 *  @throws {Error} - Throws an error if the OpenAI API Key is not set.
 *
 *  @returns {Promise<string>} - Returns a Promise that resolves to the result of the workflow execution.
 */
export async function runWorkflow(
  nodes: GraphNode[],
  messages: BaseMessage[],
): Promise<string> {
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const openAiApiBase = process.env.OPENAI_API_BASE;

  const config: ClientOptions = {
    apiKey: openAiApiKey,
    baseURL: openAiApiBase,
  };

  const model = new ChatOpenAI({
    configuration: config,
    model: GTP_MODEL,
    temperature: 0,
    streaming: false,
    maxRetries: 2,
  });

  const runner = await GraphRunner.make({
    model,
    nodes,
  });

  return await runner.invoke({
    messages,
  });
}
