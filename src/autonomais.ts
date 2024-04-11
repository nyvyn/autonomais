#!/usr/bin/env node

import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import * as console from "node:console";
import * as fs from "node:fs";
import * as repl from "node:repl";
import * as yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { enableVerboseLogging, parseWorkflow, runWorkflow } from "./index";


/**
 * Runs a workflow.
 *
 * @param {string|number} path - The path to the workflow file.
 * @param {string} [prompt] - An optional prompt for user input during the workflow.
 *
 * @returns {Promise<void>} - A promise that resolves when the workflow is complete.
 */
async function run(path: string | number, prompt?: string): Promise<void> {
    console.log(`Hello, ${process.env.USER}!`);
    console.log(`You're running Autonomais in ${process.cwd()}.`);
    console.log("You can exit the interactive session by typing '.exit'.");
    console.log("────────────────────────────────────────────────────────────────────────");
    console.log();

    if (!path) {
        console.error("No workflow path given");
        return;
    }

    const contents = fs.readFileSync(path.toString(), "utf-8");
    const nodes = parseWorkflow(contents);

    console.log(`Running workflow ${path}.`);
    console.log(prompt ? `Using prompt: ${prompt}.` : "No prompt provided.");
    console.log();

    let messages: BaseMessage[] = [];

    function initializeContext() {
        messages = [];
        if (prompt) messages.push(new HumanMessage(prompt));
    }

    initializeContext();

    const completion = await runWorkflow(nodes, messages);
    messages.push(new AIMessage(completion));
    console.log(colorize(`AI: ${completion}`));

    const replServer = repl.start({
        prompt: "→ ",
        useColors: true,
        eval: async (cmd, _, __, callback) => {
            try {
                messages.push(new HumanMessage(cmd));
                const completion = await runWorkflow(nodes, messages);
                messages.push(new AIMessage(completion));
                callback(null, `AI: ${completion}`);
            } catch (error) {
                callback(error, "Error running workflow.");
            }
        },
    });

    replServer.on("reset", initializeContext);

    replServer.on("exit", () => {
        console.log("Interactive session ended.");
        process.exit();
    });
}

function colorize(text: string) {
    return `\x1b[32m ${text} \x1b[0m`;
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
    await yargs(
        hideBin(process.argv)
    ).usage(
        "Usage: $0 <workflow> [prompt]"
    ).command({
        command: ["source", "$0"],
        describe: "autonomais.ts <source> [prompt]",
        handler: async args => {
            if (args.verbose) enableVerboseLogging();
            await run(args._[0], args.prompt);
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
}

main().catch((error) => {
    console.error(`An error occurred: ${error.message}`);
});
