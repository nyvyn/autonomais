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
async function run(path: string | number): Promise<void> {
    if (!path) {
        console.error("No workflow path given");
        return;
    }
    const contents = fs.readFileSync(path.toString(), "utf-8");
    const nodes = parseWorkflow(contents);

    const replServer = repl.start({
        prompt: "Enter your prompt: ",
        eval: async (cmd, context, filename, callback) => {
            try {
                const completion = await runWorkflow(nodes, cmd);
                console.log("AI: " + completion);
                callback(null, completion);
            } catch (error) {
                console.error("Error running workflow:", error);
                callback(error);
            }
        },
    });

    replServer.on('exit', () => {
        console.log('REPL session ended. Workflow complete.');
        process.exit();
    });

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
        handler: async args => {
            await run(args._[0]);
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