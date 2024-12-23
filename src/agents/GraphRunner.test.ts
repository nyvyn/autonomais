import { HumanMessage } from "@langchain/core/messages";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { GraphNode } from "../types";
import {
  GraphRunner,
  GraphRunnerConfig,
  GraphRunnerInput,
} from "./GraphRunner";

describe("GraphRunner", () => {
  let fakeLLM: FakeListChatModel;
  let graphRunner: GraphRunner;
  let config: GraphRunnerConfig;

  beforeEach(async () => {
    fakeLLM = new FakeListChatModel({
      responses: ["Hello"],
    });
    const nodes: GraphNode[] = [
      {
        name: "start",
        instructions: "Reply with hello",
        isConditional: false,
        isExit: false,
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
});
