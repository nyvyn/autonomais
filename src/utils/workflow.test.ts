import { parseWorkflow, runWorkflow } from "@/utils/workflow";
import * as fs from "node:fs";

describe("parse workflow", () => {
    it("should correctly parse hello world example ", () => {
        const path = "./examples/helloworld.yaml";
        const contents = fs.readFileSync(path, "utf-8");
        const nodes = parseWorkflow(contents);

        expect(nodes.length).toBe(1);
        expect(nodes[0].name === "hello-world");
    });

    it("should correctly run hello world example", () => {
        const path = "./examples/helloworld.yaml";
        const contents = fs.readFileSync(path, "utf-8");
        const nodes = parseWorkflow(contents);
        runWorkflow(nodes);
    });
});