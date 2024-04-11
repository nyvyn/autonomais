import { GraphRunner } from "@/agents";
import { GraphNode } from "@/types/GraphNode";
import { logger } from "@/utils/logger";
import { GPT4_TEXT } from "@/utils/variables";
import { BingSerpAPI } from "@langchain/community/tools/bingserpapi";
import { Calculator } from "@langchain/community/tools/calculator";
import { SearxngSearch } from "@langchain/community/tools/searxng_search";
import { BaseMessage } from "@langchain/core/messages";
import { StructuredTool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import * as process from "node:process";
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
            isConditional: prop.conditional || false,
            isExit: prop.exit || false,
            tools: prop.tools || [],
        };
        nodes.push(node);
    });

    return nodes;
}


/**
 *  Runs a workflow using a set of graph nodes and a prompt.
 *
 *  @param {GraphNode[]} nodes - An array of graph nodes representing the workflow.
 *  @param {BaseMessage[]} messages - The current message context of the workflow
 *
 *  @throws {Error} - Throws an error if the OpenAI API Key is not set.
 *
 *  @returns {Promise<string>} - Returns a Promise that resolves to the result of the workflow execution.
 */
export async function runWorkflow(nodes: GraphNode[], messages: BaseMessage[]): Promise<string> {
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

    // Loop through the graph nodes collecting the unique tools
    const requestedTools = new Set<string>();
    nodes.forEach(node => {
        node.tools && node.tools.forEach(toolName => {
            requestedTools.add(toolName);
        });
    });

    const makeTool = (
        ToolConstructor: any,
        envVariable?: string,
        toolOptions = {}
    ): StructuredTool => {
        let envOptions = {};
        if (envVariable) {
            const envVarValue = process.env[envVariable];
            if (!Boolean(envVarValue)) {
                throw new Error(`${envVariable} not set.`);
            }
            envOptions = {
                apiKey: envVarValue
            };
        }
        return new ToolConstructor({...envOptions, ...toolOptions});
    };

    // Loop through the tools by string name
    const tools: StructuredTool[] = Array.from(requestedTools).map(toolName => {
        switch (toolName.toLowerCase()) {
            case "bing-search":
                return makeTool(
                    BingSerpAPI,
                    "BING_SEARCH_API_KEY",
                );
            case "calculator":
                return makeTool(
                    Calculator
                );
            case "searxng-search":
                return makeTool(
                    SearxngSearch,
                    "SEARXNG_SEARCH_BASE_URL",
                    {
                        params: {
                            format: "json",
                            engines: "google",
                        },
                    }
                );
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }).filter(tool => tool !== null);

    const runner = await GraphRunner.make({
        model,
        nodes,
        tools,
    });

    return await runner.invoke({
        messages,
    });
}
