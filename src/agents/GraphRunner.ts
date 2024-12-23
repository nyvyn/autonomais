import { GraphNode } from "@/types";
import { logger } from "@/utils";
import { END_NODE } from "@/utils/variables";
import { BaseLanguageModel } from "@langchain/core/dist/language_models/base";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { Runnable, RunnableConfig, RunnableLambda } from "@langchain/core/runnables";
import { END, StateGraph } from "@langchain/langgraph";
import { createFunctionCallingExecutor } from "@langchain/langgraph/prebuilt";
import { Pregel } from "@langchain/langgraph/pregel";

export type AgentState = {
    messages: BaseMessage[];
};

export interface GraphRunnerConfig extends RunnableConfig {
    graph: Pregel;
}

export type GraphRunnerInput = {
    messages: BaseMessage[];
};
export type GraphRunnerOutput = string;

export class GraphRunner extends Runnable<GraphRunnerInput, GraphRunnerOutput> {
    public declare lc_namespace: ["Graph Runner"];

    private readonly graph: Pregel;

    constructor(input: GraphRunnerConfig) {
        super({
            ...input,
            runName: "Graph Runner",
        });

        this.graph = input.graph;
    }

    public static async make({model, nodes}: Readonly<{
        model: BaseLanguageModel,
        nodes: GraphNode[],
    }>) {
        const graph = await GraphRunner.prepareGraph(
            model,
            nodes,
        );
        return new GraphRunner({
            graph
        });
    }

    private static callAgent = async (
        state: AgentState, node: GraphNode, model: BaseLanguageModel, config?: RunnableConfig
    ): Promise<AgentState> => {
        // Signals calling a new agent,
        logger(`Calling agent: ${node.name}`);

        let message: BaseMessage;
        if (node.tools?.length > 0) {
            const toolChain = createFunctionCallingExecutor({
                model,
                tools: node.tools,
            });

            const messages: BaseMessage[] = [];
            messages.push(new HumanMessage({content: node.instructions!}));
            messages.push(...state.messages);

            const completion = await toolChain.invoke({
                messages,
            }, {
                ...config,
                runName: `Tool Agent - ${node.name}`,
            });

            const lastMessage = completion.messages[completion.messages.length - 1];

            message = lastMessage ? new AIMessage(lastMessage.content) : new AIMessage("No response from AI.");

        } else {
            const prompt = PromptTemplate.fromTemplate(`
                You are a helpful AI assistant.
                This is the conversation so far: \"\"\"{messages}\"\"\".
                Your instructions are: \"\"\"{instructions}\"\"\".
            `);
            const completion = await prompt.pipe(model).invoke({
                messages: JSON.stringify(state.messages!),
                instructions: node.instructions!,
            }, {
                ...config,
                runName: `Node Agent - ${node.name}`,
            });

            message = completion.content ? new AIMessage(completion.content) : new AIMessage("No response from AI.");
        }

        logger(message.content as string);

        return {
            messages: [message],
        };
    };

    private static callConditional = async (
        state: AgentState, node: GraphNode, nodes: GraphNode[], model: BaseLanguageModel, config?: RunnableConfig
    ): Promise<AgentState> => {
        // Signals that a new agent will be called,
        logger(`Calling conditional: ${node.name}`);

        const conditionalAgents = [];
        nodes.forEach((test: GraphNode) => {
            if (test.name && test.name !== node.name) {
                conditionalAgents.push(test.name);
            }
        });
        if (node.isExit) conditionalAgents.push(END_NODE);

        const prompt = PromptTemplate.fromTemplate(`
            You have been called to make a decision based on the context of the conversation.
            This is the conversation so far: \"\"\"{messages}\"\"\".
            Your instructions are: \"\"\"{instructions}\"\"\".
            Based on the previous instructions and message history, reply with one (and only one) of the following: 
            ${conditionalAgents.join(", ")}.
        `);
        const completion = await prompt.pipe(model).invoke({
            messages: JSON.stringify(state.messages),
            instructions: node.instructions!,
        }, {
            ...config,
            runName: `Node Conditional - ${node.name}`,
        });

        const message = completion.content ? new AIMessage("Selected: " + completion.content) : new AIMessage("No response from AI.");

        logger(message.content as string);

        return {
            messages: [message],
        };
    };

    private static determineNextAgent = (state: AgentState, mapping: Record<string, string>) => {
        const lastMessage = state.messages[state.messages.length - 1];
        const lastContent = lastMessage.content;
        if (typeof lastContent === "string") {
            if (lastContent in mapping) {
                return mapping[lastContent];
            } else {
                for (const key in mapping) {
                    if (lastContent.toLowerCase().includes(key.toLowerCase())) {
                        return mapping[key];
                    }
                }
                return END;
            }
        } else {
            throw new Error("Last message content is not a string.");
        }
    };

    private static async prepareGraph(
        model: BaseLanguageModel,
        nodes: GraphNode[],
    ): Promise<Pregel> {
        nodes.forEach((node) => {
            if (!node.name) {
                throw new Error("Graph misconfigured. Node name is required.");
            }
            if (!node.instructions) {
                throw new Error("Graph misconfigured. Node instructions are required.");
            }
        });

        const agentState = {
            messages: {
                value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
                default: () => [],
            },
            viewstate: {
                value: (x: Record<any, any>, y: Record<any, any>) => ({...x, ...y}),
                default: () => {
                },
            },
        };

        // Define a new graph
        const workflow = new StateGraph({
            channels: agentState,
        });

        // Define the nodes
        nodes.forEach((node) => {
            if (node.isConditional) {
                workflow.addNode(
                    node.name!,
                    RunnableLambda.from(
                        (state: AgentState, config) => GraphRunner.callConditional(state, node, nodes, model, config),
                    )
                );
            } else {
                workflow.addNode(
                    node.name!,
                    RunnableLambda.from(
                        (state: AgentState, config) => GraphRunner.callAgent(state, node, model, config),
                    )
                );
            }
        });

        // Define the edges between the nodes
        nodes.forEach((node, index) => {
            // If this is the first agent, set it as the entry point
            if (index === 0) {
                workflow.setEntryPoint(node.name!);
            }

            // If this is the last node, set it as the finish point
            if (index === nodes.length - 1) {
                workflow.setFinishPoint(node.name!);
            }

            if (node.isConditional) {
                let mapping: Record<string, string> = {};

                if (node.isExit) {
                    mapping = {
                        ...mapping,
                        [END_NODE]: END,
                    };
                }

                // Add all agents as possible next nodes
                nodes.forEach((test) => {
                    if (test.name && test.name !== node.name) {
                        mapping = {
                            ...mapping,
                            [test.name]: test.name,
                        };
                    }
                });

                workflow.addConditionalEdges(
                    node.name!,
                    (state: AgentState) => GraphRunner.determineNextAgent(state, mapping),
                    mapping
                );

            } else {

                // If not the last node, add the edge to the next node
                if (index < nodes.length - 1) {
                    if (node.isExit) {
                        workflow.addEdge(node.name!, END);
                    } else {
                        workflow.addEdge(node.name!, nodes[index + 1].name!);
                    }
                }
            }
        });

        return workflow.compile();
    }

    public async invoke(input: GraphRunnerInput, options?: RunnableConfig): Promise<GraphRunnerOutput> {

        const output: {
            messages: BaseMessage[]
        } = await this.graph.invoke({
            messages: input.messages,
        }, {
            ...options,
            runName: "Graph Runner - Graph Run",
        });

        if (!output) return "Invalid response from AI.";

        const lastMessage = output.messages[output.messages.length - 1];
        let completion: string;
        if (output.messages.length > 0) {
            const content = lastMessage.content;
            if (typeof content === "string") {
                completion = content;
            } else {
                completion = JSON.stringify(content);
            }
        }

        return completion || "No response from AI.";
    }
}