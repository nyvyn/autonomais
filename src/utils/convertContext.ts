import { MessageContext, MessageType } from "@/types/MessageType";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";

/**
 *  Converts a context into a list of messages for a LangChain chain.
 *  @param context - The context to convert.
 *  @param tokenLimit - The maximum amount to use (or infinite if not provided).
 *
 *  @returns An object that includes the messages that fit the length and all removed messages.
 */
export function convertContextToLangChainMessages(
    context?: MessageContext,
    tokenLimit?: number
): Readonly<{
    removed: BaseMessage[],
    messages: BaseMessage[],
}> {
    // First, format the context into a list of messages
    let messages: BaseMessage[] = [];
    if (context) {
        if (typeof context === "string") {
            // Case: string
            if (context) messages.push(new HumanMessage(context));
        } else if (Array.isArray(context)) {
            // Case: string array, or an array of string arrays
            // Example: ["Hi there! How can I help?", "apimessage"]
            if (typeof context[0] === "string") {
                // Case: array of two strings
                const [message, type] = context;
                if (message && type === MessageType.UserMessage.toString()) messages.push(new HumanMessage(message));
                if (message && type === MessageType.ApiMessage.toString()) messages.push(new AIMessage(message));
            } else if (Array.isArray(context[0])) {
                // Case: array of string arrays
                // Example: [["Hi there! How can I help?", "apimessage"]]
                for (const [message, type] of context) {
                    if (message && type === MessageType.UserMessage.toString()) messages.push(new HumanMessage(message));
                    if (message && type === MessageType.ApiMessage.toString()) messages.push(new AIMessage(message));
                }
            }
        }
    }

    const removed: BaseMessage[] = [];
    if (tokenLimit) {
        // The character limit is 4x the token limit, minus the length of the first and last messages.
        const limit = tokenLimit * 4;

        // Remove first messages until the length is less than the limit, always preserving the last of the middle messages.
        let currentLength = messages.reduce((acc, message) => acc + (message?.content?.length ?? 0), 0);
        while (currentLength > limit && messages.length > 1) {
            currentLength -= messages[0]?.content?.length ?? 0;
            messages.shift();
        }
    }

    return {
        removed,
        messages,
    };
}