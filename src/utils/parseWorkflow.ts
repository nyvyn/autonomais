import * as YAML from "yaml";

export function parseWorkflow(
    source: string
) {
    const workflow = YAML.parse(source);
    console.log("workflow", workflow);
}