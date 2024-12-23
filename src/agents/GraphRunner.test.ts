import { FakeLLM } from "@langchain/core/utils/testing";
import { GraphNode } from "../types";
import {
  GraphRunner,
  GraphRunnerConfig,
  GraphRunnerInput,
} from "./GraphRunner";

describe("GraphRunner", () => {
  let fakeLLM: FakeLLM;
  let graphRunner: GraphRunner;
  let config: GraphRunnerConfig;

  beforeEach(async () => {
    fakeLLM = new FakeLLM();
    const nodes: GraphNode[] = [
      {
        name: "start",
        instructions: "Start node",
        isConditional: false,
        isExit: false,
      },
      {
        name: "end",
        instructions: "End node",
        isConditional: false,
        isExit: true,
      },
    ];
    graphRunner = await GraphRunner.make({ nodes, model: mockLLM });
  });

  it("should initialize correctly", () => {
    expect(graphRunner).toBeDefined();
    expect(graphRunner["graph"]).toEqual(config.graph);
  });

  it("should process valid input", async () => {
    const input: GraphRunnerInput = {
      messages: [{ content: "Hello", role: "user" }],
    };
    const output = await graphRunner.run(input);
    expect(output).toBeDefined();
    // Add more assertions based on expected output
  });

  it("should handle invalid input gracefully", async () => {
    const input: any = { invalid: "data" };
    await expect(graphRunner.run(input)).rejects.toThrow();
  });

  it("should execute nodes correctly", async () => {
    const input: GraphRunnerInput = {
      messages: [{ content: "Start", role: "user" }],
    };
    const output = await graphRunner.run(input);
    expect(output).toBeDefined();
    // Verify that the graph transitions from start to end
  });

  it("should interact with MockLLM", async () => {
    const input: GraphRunnerInput = {
      messages: [{ content: "Test LLM", role: "user" }],
    };
    const output = await graphRunner.run(input);
    expect(mockLLM.calls).toHaveLength(1);
    // Verify that the LLM was called and processed correctly
  });
});
