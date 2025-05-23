import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import {
  Runnable,
  RunnableConfig,
  RunnableLambda,
} from "@langchain/core/runnables";
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
import { logger } from "../utils";
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
  declare public lc_namespace: ["Graph Runner"];

  private readonly graph: CompiledGraph<string>;

  private constructor(input: GraphRunnerConfig) {
    super({
      ...input,
      runName: "Graph Runner",
    });

    this.graph = input.graph;
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
    logger(`Calling agent: ${node.name}`);

    const messages: BaseMessage[] = [];
    messages.push(...state.messages);
    messages.push(new HumanMessage(node.instructions!));

    let message: BaseMessage;
    let agent: Runnable;

    if (node.tools) {
      agent = createReactAgent({
        llm: model,
        tools: node.tools || [],
      });
    } else {
      const prompt = PromptTemplate.fromTemplate(`Follow the instructions.`);
      agent = prompt.pipe(model);
    }

    const completion = await agent.invoke(
      {
        messages,
      },
      {
        ...config,
        runName: `Agent - ${node.name}`,
      },
    );

    if (typeof completion === "string") {
      message = new AIMessage(completion);
    } else {
      const lastMessage =
        completion.content ??
        completion.messages?.[completion.messages.length - 1].content;
      message = lastMessage
        ? new AIMessage(lastMessage)
        : new AIMessage("No response from AI.");
    }

    logger(message.content as string);

    return {
      lastNode: node.name,
      messages: [message],
    };
  };

  /**
   * Asynchronously processes a "combined" call to both an agent and a conditional node,
   * updating and returning the agent's state after execution. The function first processes
   * the agent logic, then transitions into evaluating the conditional logic using the updated state.
   *
   * @param {AgentState} state - The current state of the agent to be processed.
   * @param {GraphNode} node - The current graph node representing the operation to be executed.
   * @param {BaseChatModel} model - The model instance used for probabilistic or deterministic decision-making within the node operations.
   * @param {RunnableConfig} [config] - Optional configuration object providing additional settings for execution.
   * @returns {Promise<AgentState>} A promise that resolves to the updated agent state after processing both the agent and conditional logic.
   */
  private static callCombined = async (
    state: AgentState,
    node: GraphNode,
    model: BaseChatModel,
    config?: RunnableConfig,
  ): Promise<AgentState> => {
    logger(`Calling combined agent and conditional: ${node.name}`);

    // Run the Agent first
    const agentState = await GraphRunner.callAgent(state, node, model, config);

    // Pass updated state into Conditional
    return GraphRunner.callConditional(agentState, node, model, config);
  };

  /**
   *  Runs a conditional node of the workflow.
   *
   *  @param {AgentState} state - The current state of the workflow.
   *  @param {GraphNode} node - The node represening the agent to invoke.
   *  @param {BaseChatModel} model - The language model to use for the workflow.
   *  @param {RunnableConfig} [config] - Optional configuration for the Runnable.
   *
   *  @returns {Promise<AgentState>} - The updated state of the agent after executing the conditional agent.
   */
  private static callConditional = async (
    state: AgentState,
    node: GraphNode,
    model: BaseChatModel,
    config?: RunnableConfig,
  ): Promise<AgentState> => {
    // Signals that a new agent will be called,
    logger(`Calling conditional: ${node.name}`);

    let message: AIMessage;
    if (node.links?.length === 0) {
      message = new AIMessage("Selected: " + END_NODE);
    } else if (node.links?.length === 1) {
      message = new AIMessage("Selected: " + node.links[0].name);
    } else {
      // Create the list of names for all potential links.
      const linkNames = [];
      const possible = node.links || [];
      possible.forEach((test: GraphNode) => {
        if (test.name && test.name !== node.name) {
          linkNames.push(test.name);
        }
      });

      const prompt = PromptTemplate.fromTemplate(`
                  You are to select the next best mode from a list of possible nodes..
                  This is the conversation so far: \"\"\"{messages}\"\"\".
                  Your instructions are: \"\"\"{instructions}\"\"\".
                  Following the instructions, reply with one (and only one) of the following nodes: ${linkNames.join(", ")}.
              `);
      const completion = await prompt.pipe(model).invoke(
        {
          messages: JSON.stringify(state.messages!),
          instructions: node.instructions!,
        },
        {
          ...config,
          runName: `Conditional - ${node.name}`,
        },
      );

      // Handle both string returns and objects with content
      const raw =
        typeof completion === "string"
          ? completion
          : (completion?.content ?? "");
      message = raw
        ? new AIMessage("Selected: " + raw)
        : new AIMessage("No response from AI.");
    }

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

    // Define a new graph
    const workflow = new StateGraph<
      typeof schema.spec,
      AgentState,
      Partial<AgentState>,
      string
    >(schema);

    // Define the nodes
    nodes.forEach((node) => {
      const hasTools = node.tools?.length > 0;
      const hasLinks = node.links?.length > 0;

      let runnable: RunnableLambda<AgentState, AgentState>;

      if (hasTools && hasLinks) {
        runnable = RunnableLambda.from((state, config) =>
          GraphRunner.callCombined(state, node, model, config),
        );
      } else if (hasLinks) {
        runnable = RunnableLambda.from((state, config) =>
          GraphRunner.callConditional(state, node, model, config),
        );
      } else {
        runnable = RunnableLambda.from((state, config) =>
          GraphRunner.callAgent(state, node, model, config),
        );
      }

      workflow.addNode(node.name!, runnable);
    });

    // Define the edges between the nodes
    nodes.forEach((node, index) => {
      // If this is the first agent, set it as the entry point.
      if (index === 0) {
        workflow.addEdge(START, node.name!);
      }

      if (node.links && node.links.length > 0) {
        if (node.links.length === 1) {
          workflow.addEdge(node.name!, node.links[0].name!);
        } else {
          let mapping: Record<string, string> = {};

          const filteredNodes = nodes.filter((test) =>
            node.links.some((link) => link.name === test.name),
          );

          // Add all filtered agents as possible next nodes
          filteredNodes.forEach((test) => {
            if (test.name && test.name !== node.name) {
              mapping = {
                ...mapping,
                [test.name]: test.name,
              };
            }
          });

          workflow.addConditionalEdges(
            node.name!,
            (state: AgentState) =>
              GraphRunner.determineNextAgent(state, mapping),
            mapping,
          );
        }
      } else {
        workflow.addEdge(node.name, END);
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
        sharedState: {},
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
