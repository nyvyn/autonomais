import { RunnerContext } from "@/types/MessageType";
import { convertContextToLangChainMessages } from "@/utils/convertContext";
import { BaseMessage } from "@langchain/core/messages";
import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { Pregel } from "@langchain/langgraph/pregel";

type AgentState = {
    messages: Array<BaseMessage>;
    viewstate?: Record<any, any>
};

export interface GraphRunnerConfig extends RunnableConfig {
    graph: Pregel;
}

export class GraphRunner extends Runnable<
    RunnerContext,
    string
> {
    lc_namespace: ["Graph Runner"];

    private readonly graph: Pregel;

    private constructor(config: GraphRunnerConfig) {
        super(config);
        this.graph = config.graph;
    }

    public make() {
        return;
    }

    public async invoke(input: RunnerContext, options: Partial<RunnableConfig> | undefined): Promise<any> {
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