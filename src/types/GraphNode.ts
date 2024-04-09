export type GraphNode = {
    name: string;
    instructions: string;
    isConditional?: boolean;
    isTerminal?: boolean;
}