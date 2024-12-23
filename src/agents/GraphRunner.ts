import { BaseChatModel } from "@langchain/core/dist/language_models/chat_models";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import {
  Runnable,
  RunnableConfig,
  RunnableLambda,
} from "@langchain/core/runnables";
import { StructuredTool } from "@langchain/core/tools";
import {
  Annotation,
  BaseCheckpointSaver,
  CompiledGraph,
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { GraphNode } from "../types";
import { logger, parseWorkflow } from "../utils";
import { END_NODE } from "../utils/variables";

export type AgentState = {
  lastNode?: string;
  messages: BaseMessage[];
};

export interface GraphRunnerConfig extends RunnableConfig {
  graph: CompiledGraph<string>;
}

export type GraphRunnerInput = {
  messages: BaseMessage[];
};
export type GraphRunnerOutput = string;

/**
 *  A Graph Runner executes a provided workflow.
 *  Construction a runner with make().
 *
 *  @extends Runnable
 */
export class GraphRunner extends Runnable<GraphRunnerInput, GraphRunnerOutput> {
  public declare lc_namespace: ["Graph Runner"];

  private readonly graph: CompiledGraph<string>;

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
   *  @param {string} params.config - The Yaml configuration of the workflow.
   *  @param {BaseChatModel} params.model - The base language model.
   *  @param {StructuredTool[]} params.tools - An array of tools required by the workflow.
   *
   *  @return {Promise<GraphRunner>} - A promise that resolves with a GraphRunner instance.
   */
  public static async fromWorkflow({
    checkpoint,
    config,
    model,
    tools,
  }: Readonly<{
    checkpoint?: BaseCheckpointSaver;
    config: string;
    model: BaseChatModel;
    tools?: StructuredTool[];
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
   *  @param {BaseChatModel} params.model - The language model to interact with.
   *  @param {GraphNode[]} params.nodes - The graph nodes defining the workflow.
   *
   *  @returns {Promise<GraphRunner>} A promise that resolves to a new GraphRunner instance.
   */
  public static async make({
    checkpoint,
    model,
    nodes,
  }: Readonly<{
    checkpoint?: BaseCheckpointSaver;
    model: BaseChatModel;
    nodes: GraphNode[];
  }>): Promise<GraphRunner> {
    const graph = await GraphRunner.prepareGraph(model, nodes, checkpoint);
    return new GraphRunner({
      graph,
    });
  }

  /**
   *  Runs an agent node of the workflow.
   *
   *  @param {AgentState} state - The current state of the workflow.
   *  @param {GraphNode} node - The node represening the agent to invoke.
   *  @param {BaseChatModel} model - The language model to use for the Runnable.
   *  @param {RunnableConfig} [config] - Optional configuration for the Runnable.
   *
   *  @returns {Promise<AgentState>} The updated state after calling the agent.
   */
  private static callAgent = async (
    state: AgentState,
    node: GraphNode,
    model: BaseChatModel,
    config?: RunnableConfig,
  ): Promise<AgentState> => {
    // Signals calling a new agent,
    logger(`Calling agent: ${node.name}`);

    let message: BaseMessage;
    if (node.tools?.length > 0) {
      const toolChain = createReactAgent({
        llm: model,
        tools: node.tools,
      });

      const messages: BaseMessage[] = [];
      messages.push(...state.messages);
      messages.push(new HumanMessage({ content: node.instructions! }));

      const completion = await toolChain.invoke(
        {
          messages,
        },
        {
          ...config,
          runName: `Tool Agent - ${node.name}`,
        },
      );

      const lastMessage = completion.messages[completion.messages.length - 1];

      message = lastMessage
        ? new AIMessage(lastMessage.content)
        : new AIMessage("No response from AI.");
    } else {
      const prompt = PromptTemplate.fromTemplate(`
                You are to evalute a conversation and then follow a set of instructions.
                This is the conversation so far: \"\"\"{messages}\"\"\".
                Your instructions are: \"\"\"{instructions}\"\"\".
            `);
      const completion = await prompt.pipe(model).invoke(
        {
          messages: JSON.stringify(state.messages!),
          instructions: node.instructions!,
        },
        {
          ...config,
          runName: `Node Agent - ${node.name}`,
        },
      );

      message = completion.content
        ? new AIMessage(completion.content.toString())
        : new AIMessage("No response from AI.");
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
   *  @param {BaseChatModel} model - The language model to use for the workflow.
   *  @param {RunnableConfig} [config] - Optional configuration for the Runnable.
   *
   *  @returns {Promise<AgentState>} - The updated state of the agent after executing the conditional agent.
   */
  private static callConditional = async (
    state: AgentState,
    node: GraphNode,
    nodes: GraphNode[],
    model: BaseChatModel,
    config?: RunnableConfig,
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
                You are to select the next best mode from a list of possible nodes..
                This is the conversation so far: \"\"\"{messages}\"\"\".
                Your instructions are: \"\"\"{instructions}\"\"\".
                Following the instructions, reply with one (and only one) of the following nodes: ${conditionalAgents.join(", ")}.
            `);
    const completion = await prompt.pipe(model).invoke(
      {
        messages: JSON.stringify(state.messages!),
        instructions: node.instructions!,
      },
      {
        ...config,
        runName: `Node Conditional - ${node.name}`,
      },
    );

    const message = completion.content
      ? new AIMessage("Selected: " + completion.content)
      : new AIMessage("No response from AI.");

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
  private static determineNextAgent = (
    state: AgentState,
    mapping: Record<string, string>,
  ) => {
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
   *  @param {BaseChatModel} model - The base language model.
   *  @param {GraphNode[]} nodes - An array of graph nodes defining the workflow.
   *  @param {BaseCheckpointSaver} checkpointer - Optional checkpoint saver for the graph.
   *
   *  @returns {Promise<CompiledGraph>} - A promise that resolves to a compiled graph representing the workflow.
   *
   *  @throws {Error} - Throws an error if a node is misconfigured or if the graph has invalid properties.
   */
  private static async prepareGraph(
    model: BaseChatModel,
    nodes: GraphNode[],
    checkpointer?: BaseCheckpointSaver,
  ): Promise<CompiledGraph<string>> {
    nodes.forEach((node) => {
      if (!node.name) {
        throw new Error("Graph misconfigured. Node name is required.");
      }
      if (!node.instructions) {
        throw new Error(
          `Graph misconfigured. Node instructions are required for node: ${node.name}`,
        );
      }
    });

    const schema = Annotation.Root({
      lastNode: Annotation<string>,
      messages: Annotation<BaseMessage[]>({
        reducer: (left: BaseMessage[], right: BaseMessage | BaseMessage[]) => {
          if (Array.isArray(right)) {
            return left.concat(right);
          }
          return left.concat([right]);
        },
        default: () => [],
      }),
    });

    // const schema: {
    //   lastNode: {
    //     reducer: BinaryOperator<string, string> | null;
    //     default?: () => string;
    //   };
    //   messages: {
    //     reducer: BinaryOperator<BaseMessage[], BaseMessage[]> | null;
    //     default?: () => BaseMessage[];
    //   };
    // } = {
    //   lastNode: {
    //     reducer: null,
    //   },
    //   messages: {
    //     reducer: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
    //     default: () => [],
    //   },
    // };

    // Define a new graph
    const workflow = new StateGraph<
      typeof schema.spec,
      AgentState,
      Partial<AgentState>,
      string
    >(schema);

    // Define the nodes
    nodes.forEach((node) => {
      if (node.isConditional) {
        workflow.addNode(
          node.name!,
          RunnableLambda.from((state: AgentState, config) =>
            GraphRunner.callConditional(state, node, nodes, model, config),
          ),
        );
      } else {
        workflow.addNode(
          node.name!,
          RunnableLambda.from((state: AgentState, config) =>
            GraphRunner.callAgent(state, node, model, config),
          ),
        );
      }
    });

    // Define the edges between the nodes
    nodes.forEach((node, index) => {
      // If this is the first agent, set it as the entry point.
      if (index === 0) {
        workflow.addEdge(START, node.name!);
      }

      // If this is the last node, set it as the finish point.
      if (index === nodes.length - 1) {
        workflow.addEdge(node.name!, END);
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
          mapping,
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

    return workflow.compile({ checkpointer });
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
  public async invoke(
    input: GraphRunnerInput,
    options?: RunnableConfig,
  ): Promise<GraphRunnerOutput> {
    const output: {
      messages: BaseMessage[];
    } = await this.graph.invoke(
      {
        messages: input.messages,
      },
      {
        ...options,
        runName: "Graph Runner - Graph Run",
      },
    );

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
