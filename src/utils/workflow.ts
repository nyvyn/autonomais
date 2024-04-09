import { GraphRunner } from "@/agents";
import { GraphNode } from "@/types/GraphNode";
import { log } from "@/utils/logger";
import { GPT4_TEXT } from "@/utils/variables";
import { StructuredTool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import * as YAML from "yaml";

export function parseWorkflow(source: string) {
    const workflow = YAML.parse(source);
    log("Running workflow:", workflow);

    const nodes: GraphNode[] = [];

    Object.keys(workflow).map((key) => {
        const prop = workflow[key];
        const node: GraphNode = {
            name: prop.name,
            instructions: prop.instructions,
            isConditional: prop.isConditional || false,
            isTerminal: prop.isTerminal || false,
        };
        nodes.push(node);
    });

    return nodes;
}

export async function runWorkflow(nodes: GraphNode[]) {
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

    await runner.invoke(undefined);
}