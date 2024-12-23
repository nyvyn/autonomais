import * as fs from "node:fs";
import { parseWorkflow } from "./workflow";

describe("parse workflow", () => {
    it("should correctly parse hello world example ", () => {
        const path = "./examples/echo.yaml";
        const contents = fs.readFileSync(path, "utf-8");
        const nodes = parseWorkflow(contents);

        expect(nodes.length).toBe(1);
        expect(nodes[0].name === "hello-world");
    });
});