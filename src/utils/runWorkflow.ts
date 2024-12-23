import { log } from "@/utils/logger";
import * as YAML from "yaml";

export function runWorkflow(
    source: string
) {
    const workflow = YAML.parse(source);
    log("Running workflow:", workflow);
}