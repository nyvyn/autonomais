#!/usr/bin/env node

import * as fs from "node:fs";
import * as yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { enableVerboseLogging, logger, parseWorkflow, runWorkflow } from "./index";


/**
 * Runs a workflow.
 *
 * @param {string|number} path - The path to the workflow file.
 * @param {string} [prompt] - An optional prompt for user input during the workflow.
 *
 * @returns {Promise<void>} - A promise that resolves when the workflow is complete.
 */
async function run(path: string | number, prompt?: string): Promise<void> {
    if (!path) console.error("No workflow path given");
    const contents = fs.readFileSync(path, "utf-8");
    const nodes = parseWorkflow(contents);
    logger(nodes);
    const completion = await runWorkflow(nodes, prompt);

    console.log("AI: " + completion);
    console.log();
    console.log("Workflow complete");
}


/**
 * Main function to run the program.
 *
 * This function is asynchronous and handles the command line arguments using the yargs library.
 * It parses the command line arguments, extracts the necessary options, and executes the corresponding logic.
 *
 * @returns {Promise<void>}
 */
async function main(): Promise<void> {
    const argv = await yargs(
        hideBin(process.argv)
    ).usage(
        "Usage: $0 <workflow> [prompt]"
    ).command({
        command: ["source", "$0"],
        describe: "autonomais.ts <source> [prompt]",
        handler: args => {
            run(args._[0], args.prompt);
        }
    }).option("prompt", {
        alias: "p",
        type: "string",
        description: "Optional prompt to send to the workflow"
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