export const enum MessageType {
    ApiMessage = "apimessage",
    UserMessage = "usermessage"
}

export type MessageContext = Readonly<string | [string, MessageType.ApiMessage | MessageType.UserMessage] | [string, string][]>