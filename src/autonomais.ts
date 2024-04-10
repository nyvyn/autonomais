#!/usr/bin/env node

import * as fs from "node:fs";
import * as yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { enableVerboseLogging, logger, parseWorkflow, runWorkflow } from "./index";

async function run(path: string | number) {
    if (!path) console.error("No workflow path given");
    const contents = fs.readFileSync(path, "utf-8");
    const nodes = parseWorkflow(contents);
    logger(nodes);
    const completion = await runWorkflow(nodes);

    console.log(completion);
    console.log();
    console.log("Workflow complete");
}

async function main() {
    const argv = await yargs(hideBin(process.argv)).command("$0", "first argument should be path to workflow yaml file", () => {
    }, (argv: { _: (string | number)[]; }) => {
        run(argv._[0]);
    }).option("verbose", {
        alias: "v",
        type: "boolean",
        description: "Run with verbose logging"
    }).parse();

    if (argv.verbose) enableVerboseLogging();
}

main().catch((error) => {
    console.error(`An error occurred: ${error.message}`);
});