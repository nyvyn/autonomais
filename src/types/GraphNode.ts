import { StructuredTool } from "@langchain/core/tools";

export type GraphNode = {
  name: string;
  instructions: string;
  links?: GraphNode[];
  tools?: StructuredTool[];
};
