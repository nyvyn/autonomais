import { HumanMessage } from "@langchain/core/messages";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { GraphNode } from "../types";
import { GraphRunner, GraphRunnerInput } from "./GraphRunner";

describe("GraphRunner", () => {
  let fakeLLM: FakeListChatModel;
  let graphRunner: GraphRunner;

  beforeEach(async () => {
    fakeLLM = new FakeListChatModel({
      responses: ["Hello"],
    });
    const nodes: GraphNode[] = [
      {
        name: "start",
        instructions: "Reply with hello",
      },
    ];
    graphRunner = await GraphRunner.make({ nodes, model: fakeLLM });
  });

  it("should process valid input", async () => {
    const input: GraphRunnerInput = {
      messages: [new HumanMessage("Hello")],
    };
    const output = await graphRunner.invoke(input);
    expect(output).toBeDefined();
  });

  it("should process node with tool and single link", async () => {
    const dummyTool = {
      name: "dummy",
      description: "dummy tool",
      schema: {},
      returnDirect: false,
      verboseParsingErrors: false,
      lc_namespace: ["dummy"],
      _call: async () => "",
    } as any;
    const nodes: GraphNode[] = [
      {
        name: "start",
        instructions: "Perform action",
        tools: [dummyTool],
        links: [{ name: "option", instructions: "Finish" }],
      },
      {
        name: "option",
        instructions: "End process",
      },
    ];
    fakeLLM = new FakeListChatModel({
      responses: ["Agent response", "Selected: option"],
    });
    fakeLLM.bindTools = () => fakeLLM;
    const runner = await GraphRunner.make({ nodes, model: fakeLLM });
    const input: GraphRunnerInput = {
      messages: [new HumanMessage("Test")],
    };
    const output = await runner.invoke(input);
    expect(output).toContain("Selected:");
  });

  it("should process node with tool and multiple links", async () => {
    const dummyTool = {
      name: "dummy",
      description: "dummy tool",
      schema: {},
      returnDirect: false,
      verboseParsingErrors: false,
      lc_namespace: ["dummy"],
      _call: async () => "",
    } as any;
    const nodes: GraphNode[] = [
      {
        name: "start",
        instructions: "Perform multi",
        tools: [dummyTool],
        links: [
          { name: "option1", instructions: "Option one" },
          { name: "option2", instructions: "Option two" },
        ],
      },
      {
        name: "option1",
        instructions: "End process 1",
      },
      {
        name: "option2",
        instructions: "End process 2",
      },
    ];
    fakeLLM = new FakeListChatModel({
      responses: ["Selected: option1"],
    });
    fakeLLM.bindTools = () => fakeLLM;
    const runner = await GraphRunner.make({ nodes, model: fakeLLM });
    const input: GraphRunnerInput = {
      messages: [new HumanMessage("Test multi")],
    };
    const output = await runner.invoke(input);
    expect(output).toContain("Selected:");
  });
});
