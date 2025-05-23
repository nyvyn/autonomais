#!/usr/bin/env node

import { BingSerpAPI } from "@langchain/community/tools/bingserpapi";
import { Calculator } from "@langchain/community/tools/calculator";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { StructuredTool } from "@langchain/core/tools";
import * as fs from "node:fs";
import * as repl from "node:repl";
import yargs from "yargs";
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
  console.log(
    "────────────────────────────────────────────────────────────────────────",
  );
  console.log();

  if (!path) {
    console.error("No workflow path given");
    return;
  }

  const config = fs.readFileSync(path.toString(), "utf-8");
  const tools = makeTools();
  const nodes = parseWorkflow(config, tools);

  console.log(`Running workflow ${path}.`);
  if (prompt) console.log(`Sending prompt: ${prompt}.`);
  console.log();

  let messages: BaseMessage[] = [];

  const initializeContext = () => {
    messages = [];
    if (prompt) messages.push(new HumanMessage(prompt));
  };

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

/**
 *  Colorize the given text with green color.
 *
 *  @param {string} text - The text to be colorized.
 *
 *  @return {string} The colorized text.
 */
function colorize(text: string): string {
  return `\x1b[32m ${text} \x1b[0m`;
}

/**
 *  Makes the default set of tools for use by workflows executed on the command-line
 *
 *  @returns {StructuredTool[]} An array of tools.
 */
function makeTools(): StructuredTool[] {
  const tools: StructuredTool<any>[] = [];

  tools.push(new Calculator());

  if (Boolean(process.env.BING_API_KEY)) {
    tools.push(new BingSerpAPI(process.env.BING_API_KEY));
  }

  return tools;
}

/**
 * Main function to run the program.
 *
 * This function is asynchronous and handles the command line arguments using the yargs library.
 * It parses the command line arguments, extracts the necessary options, and executes the corresponding logic.
 *
 * @returns {Promise<void>}
 */
export async function main(): Promise<void> {
  await yargs(hideBin(process.argv))
    .exitProcess(false)
    .usage("Usage: $0 <workflow> [prompt]")
    .command({
      command: ["source", "$0"],
      describe: "autonomais.ts <source> [prompt]",
      handler: async (args) => {
        if (args.verbose) enableVerboseLogging();
        await run(args._[0], args.prompt);
      },
    })
    .option("prompt", {
      alias: "p",
      type: "string",
      description: "Optional prompt to send to the workflow",
    })
    .option("verbose", {
      alias: "v",
      type: "boolean",
      description: "Run with verbose logging",
    })
    .parse();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`An error occurred: ${error.message}`);
  });
}
