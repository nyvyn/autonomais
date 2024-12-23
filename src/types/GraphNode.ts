import { StructuredTool } from "@langchain/core/tools";

export type GraphNode = {
  name: string;
  instructions: string;
  isConditional: boolean;
  isExit: boolean;
  links?: GraphNode[];
  tools?: StructuredTool[];
  state?: Array<{
    name: string;
    value: string;
    description: string;
  }>;
};
