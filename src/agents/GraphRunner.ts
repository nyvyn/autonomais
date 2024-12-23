import { GraphNode } from "@/types";
import { RunnerContext } from "@/types/MessageType";
import { log } from "@/utils";
import { convertContextToLangChainMessages } from "@/utils/convertContext";
import { parseJson } from "@/utils/parseJson";
import { END_NODE } from "@/utils/variables";
import { BaseLanguageModel } from "@langchain/core/dist/language_models/base";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { Runnable, RunnableConfig, RunnableLambda } from "@langchain/core/runnables";
import { StructuredTool } from "@langchain/core/tools";
import { END, StateGraph } from "@langchain/langgraph";
import { ToolExecutor } from "@langchain/langgraph/prebuilt";
import { Pregel } from "@langchain/langgraph/pregel";

type AgentState = {
    messages: Array<BaseMessage>;
    viewstate?: Record<any, any>
};

export class GraphRunner extends Runnable<
    RunnerContext,
    string
> {
    lc_namespace: ["Graph Runner"];

    private readonly graph: Pregel;

    public constructor({graph}: Readonly<{
        graph: Pregel;
    }>) {
        super();
        this.graph = graph;
    }

    public static async make({model, nodes, tools}: Readonly<{
        model: BaseLanguageModel,
        nodes: GraphNode[],
        tools: StructuredTool[],
    }>) {
        const graph = await GraphRunner.prepareGraph(
            model,
            nodes,
            tools,
        );
        return new GraphRunner({
            graph
        });
    }

    private static callAgent = async (
        state: AgentState, node: GraphNode, tools: StructuredTool[], config?: RunnableConfig
    ): Promise<AgentState> => {
        // Signals calling a new agent,
        log(`Calling agent: ${node.name}`);

        state.messages.push(new AIMessage({
            content: `"This is the current state: \`\`\`json${JSON.stringify(state.viewstate)}\`\`\`.`,
        }));
        if (node.instructions) state.messages.push(new HumanMessage({
            content: node.instructions,
        }));

        const toolChain = new ToolExecutor({
            tools
        });

        const results = await toolChain.invoke({
            messages: state.messages
        }, {
            ...config,
            runName: `Graph Runner - ${node.name}`,
        });

        // Send Data to the Agent View
        const matched = results.completion?.match(/(```json\s+?{.*}\s+?```)/s);
        if (matched && matched[1]) {
            const json = parseJson(matched[1]);
            state.viewstate = json;
            log(json);
        }

        const message = results.completion ? new AIMessage(results.completion) : new AIMessage("No response from AI.");

        log(message.content as string);

        return {
            messages: [message],
            viewstate: state.viewstate,
        };
    };

    private static callConditional = async (
        state: AgentState, node: GraphNode, nodes: GraphNode[], model: BaseLanguageModel, config?: RunnableConfig
    ): Promise<AgentState> => {
        // Signals that a new agent will be called,
        log(`Calling conditional: ${node.name}`);

        const conditionalAgents = [];
        nodes.forEach((test: GraphNode) => {
            if (test.name && test.name !== node.name) {
                conditionalAgents.push(test.name);
            }
        });
        if (node.isTerminal) conditionalAgents.push(END_NODE);

        const prompt = PromptTemplate.fromTemplate(`
            You have been called to make a decision based on the context of the conversation.
            This is the conversation so far: \"\"\"{context}\"\"\".
            This is the current state: \`\`\`json{state}\`\`\`.
            Your instructions are: \"\"\"{objective}\"\"\".
            Based on the previous instructions and message history, reply with one (and only one) of the following: 
            ${conditionalAgents.join(", ")}.
        `);

        const completion = await prompt.bind(model).invoke({
            context: JSON.stringify(state.messages),
            objective: node.instructions!,
            state: JSON.stringify(state.viewstate),
        }, {
            ...config,
            runName: `Graph Conditional - ${node.name}`,
        });

        const message = completion ? new AIMessage("Selected: " + completion) : new AIMessage("No response from AI.");

        log(message.content as string);

        return {
            messages: [message],
            viewstate: state.viewstate,
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
        tools: StructuredTool[],
    ): Promise<Pregel> {
        nodes.forEach((agent) => {
            if (!agent.name) {
                throw new Error("Graph misconfigured. NOde name is required.");
            }
            if (!agent.instructions) {
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
                        (state: AgentState, config) => GraphRunner.callAgent(state, node, tools, config),
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

                if (node.isTerminal) {
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
                    if (node.isTerminal) {
                        workflow.addEdge(node.name!, END);
                    } else {
                        workflow.addEdge(node.name!, nodes[index + 1].name!);
                    }
                }
            }
        });

        return workflow.compile();
    }

    public async invoke(input: RunnerContext, options?: Partial<RunnableConfig> | undefined): Promise<any> {
        const messages = convertContextToLangChainMessages(input);

        const output: {
            messages: BaseMessage[]
        } = await this.graph.invoke({
            messages,
        }, {
            runName: "Graph Runner - Graph Run",
            ...options
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