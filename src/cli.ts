#!/usr/bin/env node
import * as fs from "node:fs";
import * as yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { parseWorkflow } from "./index";

function runWorkflow(path: string | number) {
    if (!path) console.error("No workflow path given");
    const contents = fs.readFileSync(path, "utf-8");
    parseWorkflow(contents);
}

yargs(hideBin(process.argv))
    .command("$0", "The default command", () => {
}, (argv: { _: (string | number)[]; }) => {
    runWorkflow(argv._[0]);
    })
    .option("verbose", {
        alias: "v",
        type: "boolean",
        description: "Run with verbose logging"
    })
    .parse();
