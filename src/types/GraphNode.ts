export type GraphNode = {
    name: string;
    instructions: string;
    isConditional?: boolean;
    isExit?: boolean;
    tools?: string[];
}