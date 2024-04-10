import { RunnableChain, RunnableChainConfig } from "@/agents/RunnableChain";
import { logger } from "@/utils";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";
import { StructuredTool } from "@langchain/core/tools";
import OpenAI from "openai";
import { JSONSchema } from "openai/lib/jsonschema";
import { RunnableToolFunctionWithParse } from "openai/lib/RunnableFunction";
import { ChatCompletionMessageParam } from "openai/resources";
import { z, ZodSchema } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export interface ToolChainConfig extends RunnableChainConfig {
    model: string;
    openai: OpenAI;
    tools: StructuredTool[];
}

export interface ToolChainInput {
    messages: ChatCompletionMessageParam[];
}

export interface ToolChainOutput {
    steps: ChatCompletionMessageParam[];
    completion: string | null;
}

export class ToolChain extends RunnableChain<ToolChainInput, ToolChainOutput> {
    public readonly lc_namespace = ["ToolChain"];

    private readonly model: string;
    private readonly openai: OpenAI;
    private readonly tools: StructuredTool[];

    constructor(input: ToolChainConfig) {
        super(input);

        this.model = input.model;
        this.openai = input.openai;
        this.tools = input.tools;
    }

    public async run(
        input: ToolChainInput,
        runManager?: CallbackManagerForChainRun,
    ): Promise<ToolChainOutput> {
        const steps: ChatCompletionMessageParam[] = [];

        const tools: RunnableToolFunctionWithParse<any>[] = this.tools.map(tool => {
            return zodFunction({
                description: tool.description,
                function: (arg: z.infer<typeof tool.schema>) => tool.call(arg, runManager?.getChild()),
                name: tool.name,
                schema: tool.schema,
            });
        });
        const runner = this.openai.beta.chat.completions.runTools({
            model: this.model,
            messages: input.messages,
            tools,
            stream: true,
        }).on("connect", () => {
            console.log("Connected to OpenAI API", this.model, input.messages);
        }).on("content", (content) => {
            logger(content);
        }).on("end", () => {
            console.log("Completed OpenAI API call");
        }).on("finalMessage", (message) => {
            console.log("Final message", message);
        }).on("message", (message) => {
            steps.push(message);
        });

        const completion = await runner.finalContent();

        return {
            steps,
            completion,
        };
    }
}


/**
 * A generic utility function that returns a RunnableFunction
 * you can pass to `.runTools()`,
 * with a fully validated, typesafe parameters schema.
 *
 * You are encouraged to copy/paste this into your codebase!
 * From: https://github.com/openai/openai-node/blob/master/examples/tool-call-helpers-zod.ts#L118
 */
function zodFunction<T extends object>({
    function: fn,
    schema,
    description = "",
    name,
}: {
    function: (args: T) => Promise<object | string>;
    schema: ZodSchema<T>;
    description?: string;
    name?: string;
}): RunnableToolFunctionWithParse<T> {
    return {
        type: "function",
        function: {
            function: fn,
            name: name ?? fn.name,
            description: description,
            parameters: zodToJsonSchema(schema) as JSONSchema,
            parse(input: string): T {
                const obj = JSON.parse(input);
                return schema.parse(obj);
            },
        },
    };
}