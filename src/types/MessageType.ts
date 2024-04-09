export const enum MessageType {
    ApiMessage = "apimessage",
    UserMessage = "usermessage"
}

export type RunnerContext = Readonly<string | [string, MessageType.ApiMessage | MessageType.UserMessage] | [string, string][]>