import { BaseLanguageModel } from "@langchain/core/dist/language_models/base";
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder, PromptTemplate } from "@langchain/core/prompts";
import { Runnable, RunnableConfig, RunnableLambda } from "@langchain/core/runnables";
import { StructuredTool } from "@langchain/core/tools";
import { BaseCheckpointSaver, END, StateGraph } from "@langchain/langgraph";
import { BinaryOperator } from "@langchain/langgraph/dist/channels/binop";
import { createFunctionCallingExecutor } from "@langchain/langgraph/prebuilt";
import { Pregel } from "@langchain/langgraph/pregel";
import { GraphNode } from "../types";
import { logger, parseWorkflow } from "../utils";
import { END_NODE } from "../utils/variables";

export type AgentState = {
    lastNode?: string;
    messages: BaseMessage[];
};

export interface GraphRunnerConfig extends RunnableConfig {
    graph: Pregel;
}

export type GraphRunnerInput = {
    messages: BaseMessage[];
};
export type GraphRunnerOutput = string;


/**
 *  A Graph Runner executes a workflow.
 *  Construction a runner with make().
 *
 *  @extends Runnable
 */
export class GraphRunner extends Runnable<GraphRunnerInput, GraphRunnerOutput> {
    public declare lc_namespace: ["Graph Runner"];

    private readonly graph: Pregel;

    private constructor(input: GraphRunnerConfig) {
        super({
            ...input,
            runName: "Graph Runner",
        });

        this.graph = input.graph;
    }

    /**
     *  Creates a GraphRunner instance from a workflow.
     *
     *  @param {Object} params - The parameters object.
     *  @param {BaseCheckpointSaver} params.checkpoint - Optional checkpoint saver for the graph.
     *  @param {string} params.config - The yaml configuration of the workflow.
     *  @param {BaseLanguageModel} params.model - The base language model.
     *  @param {StructuredTool[]} params.tools - An array of tools required by the workflow.
     *
     *  @return {Promise<GraphRunner>} - A promise that resolves with a GraphRunner instance.
     */
    public static async fromWorkflow({checkpoint, config, model, tools}: Readonly<{
        checkpoint?: BaseCheckpointSaver,
        config: string,
        model: BaseLanguageModel,
        tools?: StructuredTool[],
    }>): Promise<GraphRunner> {
        const nodes = parseWorkflow(config, tools);
        return GraphRunner.make({
            model,
            nodes,
            checkpoint,
        });
    }

    /**
     *  Creates a new instance of GraphRunner from an array of GraphNodes.
     *
     *  @param {Object} params - The options for creating a new GraphRunner instance.
     *  @param {BaseCheckpointSaver} params.checkpoint - Optional checkpoint saver for the graph.
     *  @param {BaseLanguageModel} params.model - The base language model.
     *  @param {GraphNode[]} params.nodes - The graph nodes defining the workflow.
     *
     *  @returns {Promise<GraphRunner>} A promise that resolves to a new GraphRunner instance.
     */
    public static async make({checkpoint, model, nodes}: Readonly<{
        checkpoint?: BaseCheckpointSaver,
        model: BaseLanguageModel,
        nodes: GraphNode[],
    }>): Promise<GraphRunner> {
        const graph = await GraphRunner.prepareGraph(
            model,
            nodes,
            checkpoint,
        );
        return new GraphRunner({
            graph
        });
    }

    /**
     *  Runs an agent node of the workflow.
     *
     *  @param {AgentState} state - The current state of the workflow.
     *  @param {GraphNode} node - The node represening the agent to invoke.
     *  @param {BaseLanguageModel} model - The language model to use for the Runnable.
     *  @param {RunnableConfig} [config] - Optional configuration for the Runnable.
     *
     *  @returns {Promise<AgentState>} The updated state after calling the agent.
     */
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
            lastNode: node.name,
            messages: [message],
        };
    };

    /**
     *  Runs a conditional node of the workflow.
     *
     *  @param {AgentState} state - The current state of the workflow.
     *  @param {GraphNode} node - The node represening the agent to invoke.
     *  @param {GraphNode[]} nodes - The list of all graph nodes (used for selecting the next node).
     *  @param {BaseLanguageModel} model - The language model to use for the workflow.
     *  @param {RunnableConfig} [config] - Optional configuration for the Runnable.
     *
     *  @returns {Promise<AgentState>} - The updated state of the agent after executing the conditional agent.
     */
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

        const prompt = ChatPromptTemplate.fromMessages([
            new SystemMessage(
                `You have been called to make a decision based on the context of the conversation.`
            ),
            new MessagesPlaceholder("messages"),
            new HumanMessage(`Your instructions are: \"\"\"{instructions}\"\"\".`),
            new HumanMessage(`Based on the previous instructions and message history, reply with one (and only one) of the following: 
            ${conditionalAgents.join(", ")}.`),
        ]);
        const completion = await prompt.pipe(model).invoke({
            messages: state.messages,
            instructions: node.instructions!,
        }, {
            ...config,
            runName: `Node Conditional - ${node.name}`,
        });

        const message = completion.content ? new AIMessage("Selected: " + completion.content) : new AIMessage("No response from AI.");

        logger(message.content as string);

        return {
            lastNode: node.name,
            messages: [message],
        };
    };

    /**
     *  Determines the next agent based on the current agent state and mapping.
     *
     *  @param {AgentState} state - The current agent state.
     *  @param {Record<string, string>} mapping - The mapping of node names to nodes.
     *
     *  @returns string The next node to run in the workflow.
     */
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

    /**
     *  Converts the provided nodes into a Pregel graph.
     *
     *  @param {BaseLanguageModel} model - The base language model.
     *  @param {GraphNode[]} nodes - An array of graph nodes defining the workflow.
     *  @param {BaseCheckpointSaver} checkpoint - Optional checkpoint saver for the graph.
     *
     *  @returns {Promise<Pregel>} - A promise that resolves to a compiled graph representing the workflow.
     *
     *  @throws {Error} - Throws an error if a node is misconfigured or if the graph has invalid properties.
     */
    private static async prepareGraph(
        model: BaseLanguageModel,
        nodes: GraphNode[],
        checkpoint?: BaseCheckpointSaver,
    ): Promise<Pregel> {
        nodes.forEach((node) => {
            if (!node.name) {
                throw new Error("Graph misconfigured. Node name is required.");
            }
            if (!node.instructions) {
                throw new Error(`Graph misconfigured. Node instructions are required for node: ${node.name}`);
            }
        });

        const schema: {
            lastNode: {
                value: BinaryOperator<unknown> | null;
                default?: () => unknown;
            };
            messages: {
                value: BinaryOperator<unknown> | null;
                default?: () => unknown;
            }
        } = {
            lastNode: {
                value: null,
            },
            messages: {
                value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
                default: () => [],
            },
        };

        // Define a new graph
        const workflow = new StateGraph({
            channels: schema,
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
            // If this is the first agent, set it as the entry point.
            if (index === 0) {
                workflow.setEntryPoint(node.name!);
            }

            // If this is the last node, set it as the finish point.
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

                // If not the last node, add the edge to the next node.
                if (index < nodes.length - 1) {
                    if (node.isExit) {
                        workflow.addEdge(node.name, END);
                    } else {
                        workflow.addEdge(node.name, nodes[index + 1].name!);
                    }
                }
            }
        });

        return workflow.compile(checkpoint);
    }

    /**
     *  Invokes the graph runner to process the given input messages.
     *
     *  @param {GraphRunnerInput} input - The input messages to be processed by the graph runner.
     *  @param {RunnableConfig} [options] - Optional configuration for the Runnable.
     *
     *  @returns {Promise<GraphRunnerOutput>} A promise that resolves with the output of the graph runner.
     *
     *  @throws {Error} If the response from AI is invalid.
     */
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