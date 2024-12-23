/**
 Guards against prompt inputs that exceed the maximum tokens for the model.
 */
import { CallbackManager, CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";
import { Runnable, RunnableConfig } from "@langchain/core/runnables";

export interface RunnableChainConfig extends RunnableConfig {
}

export abstract class RunnableChain<RunInput = any, RunOutput = any> extends Runnable<RunInput, RunOutput> {
    public readonly lc_namespace = ["RunnableChain"];

    protected constructor(config: RunnableChainConfig) {
        super(config);

        this.name = config.runName;
    }

    public async invoke(input: RunInput, config?: RunnableConfig): Promise<RunOutput> {
        const callbackManager = config ? await CallbackManager.configure(
            config.callbacks,
            undefined,
            config.tags,
            undefined,
            config.metadata,
            undefined,
            {verbose: false}
        ) : undefined;
        const runManager = await callbackManager?.handleChainStart(
            this.toJSON(),
            input,
            undefined,
            undefined,
            undefined,
            undefined,
            config?.runName || this.name
        );

        const final = await this.run(input, runManager);

        if (runManager) await runManager.handleChainEnd([final]);

        return final;
    }

    public abstract run(input: RunInput, runManager?: CallbackManagerForChainRun): Promise<RunOutput>;
}