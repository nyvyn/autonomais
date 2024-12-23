import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { encodingForModel } from "js-tiktoken";
import { TiktokenModel } from "js-tiktoken/lite";

export function getModelName(model: BaseLanguageModelInterface): string {
    return model._identifyingParams()["model_name"];
}

export function getModelNameForTiktoken(model: BaseLanguageModelInterface): TiktokenModel {
    const modelName = getModelName(model);

    return modelName as TiktokenModel;
}

export async function calculateNumberTokens({prompt, model}: { prompt: string, model: BaseLanguageModelInterface }): Promise<number> {
    const tiktokenName = getModelNameForTiktoken(model);

    // fallback to approximate calculation if tiktoken is not available
    let numTokens = Math.ceil(prompt.length / 4);
    try {
        numTokens = encodingForModel(tiktokenName).encode(prompt).length;
    } catch (error) {
        console.warn(
            "Failed to calculate number of tokens, falling back to approximate count"
        );
    }

    return numTokens;
}

export async function calculateRemainingTokens({prompt, model}: { prompt: string, model: BaseLanguageModelInterface }): Promise<number> {
    const numTokens = await calculateNumberTokens({prompt, model});

    const maxTokens = getModelContextSize(model);
    return maxTokens - numTokens;
}

export function getEmbeddingContextSize(modelName?: string): number {
    switch (modelName) {
        case "text-embedding-ada-002":
            return 8191;
        default:
            return 2046;
    }
}

export function getModelContextSize(model: BaseLanguageModelInterface): number {
    switch (getModelNameForTiktoken(model)) {
        case "gpt-4-vision-preview":
            return 128000;
        case "gpt-4-1106-preview":
            return 128000;
        case "gpt-4-32k":
            return 32768;
        case "gpt-4":
            return 8192;
        case "gpt-3.5-turbo-1106":
            return 16385;
        case "gpt-3.5-turbo-16k":
            return 16384;
        case "gpt-3.5-turbo":
            return 4096;
        case "text-davinci-003":
            return 4097;
        case "text-curie-001":
            return 2048;
        case "text-babbage-001":
            return 2048;
        case "text-ada-001":
            return 2048;
        case "code-davinci-002":
            return 8000;
        case "code-cushman-001":
            return 2048;
        default:
            return 4097;
    }
}