/**
 Guards against prompt inputs that exceed the maximum tokens for the model.
 */
import { RunnableChain, RunnableChainConfig } from "@/agents/RunnableChain";
import { calculateRemainingTokens } from "@/utils/tokens";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";
import { BaseLanguageModel } from "@langchain/core/language_models/base";
import { BasePromptTemplate } from "@langchain/core/prompts";
import { ChainValues } from "@langchain/core/utils/types";

export interface GuardChainConfig extends RunnableChainConfig {
    model: BaseLanguageModel;
    prompt: BasePromptTemplate;
}

export type GuardChainOutput = string;

export class GuardChain<RunInput = any, RunOutput = any> extends RunnableChain<RunInput, GuardChainOutput> {
    public readonly lc_namespace = ["GuardChain"];

    protected readonly model: BaseLanguageModel;
    protected readonly prompt: BasePromptTemplate;

    public constructor(config: GuardChainConfig) {
        super(config);

        this.model = config.model;
        this.prompt = config.prompt;
    }

    public async run(input: RunInput, runManager?: CallbackManagerForChainRun): Promise<GuardChainOutput> {

        const prompt = await this.prompt.format(input as ChainValues);

        const remainingTokens = await calculateRemainingTokens({
            prompt,
            model: this.model
        });

        let final: GuardChainOutput;
        if (remainingTokens < 0) {
            final = `Your input exceeds the maximum number of tokens for this model by ${remainingTokens * -1}.`;
        } else {
            const invocation = await this.prompt.pipe(this.model).invoke(input, {
                runName: this.name || "Guard Chain",
                callbacks: runManager?.getChild(),
            });
            final = invocation.content;
        }

        if (runManager) await runManager.handleChainEnd([final]);

        return final;
    }
}