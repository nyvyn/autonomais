import { GraphRunner } from "@/agents";
import { GraphNode } from "@/types/GraphNode";
import { logger } from "@/utils/logger";
import { GPT4_TEXT } from "@/utils/variables";
import { StructuredTool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import * as YAML from "yaml";


/**
 *  Parses a workflow from a source string and returns an array of GraphNode objects.
 *
 *  @param {string} source - The source string representing the workflow in YAML format.
 *  @return {GraphNode[]} - An array of GraphNode objects representing the workflow.
 */
export function parseWorkflow(source: string): GraphNode[] {
    const workflow = YAML.parse(source);
    logger("Running workflow:", workflow);

    const nodes: GraphNode[] = [];

    Object.keys(workflow).map((key) => {
        const prop = workflow[key];
        const node: GraphNode = {
            name: key,
            instructions: prop.instructions,
            isConditional: prop.isConditional || false,
            isTerminal: prop.isTerminal || false,
        };
        nodes.push(node);
    });

    return nodes;
}


/**
 *  Runs a workflow using a set of graph nodes and a prompt.
 *
 *  @param {GraphNode[]} nodes - An array of graph nodes representing the workflow.
 *  @param {string} prompt - The prompt for the workflow.
 *
 *  @throws {Error} - Throws an error if the OpenAI API Key is not set.
 *
 *  @returns {Promise<string>} - Returns a Promise that resolves to the result of the workflow execution.
 */
export async function runWorkflow(nodes: GraphNode[], prompt: string): Promise<string> {
    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!Boolean(openAiApiKey)) {
        throw new Error("OpenAI API Key not set.");
    }

    const model = new ChatOpenAI({
        openAIApiKey: openAiApiKey,
        modelName: GPT4_TEXT,
        temperature: 0,
        topP: 0,
        streaming: false,
        maxRetries: 2,
    });

    const tools: StructuredTool[] = [];

    const runner = await GraphRunner.make({
        model,
        nodes,
        tools,
    });

    return await runner.invoke(prompt);
}