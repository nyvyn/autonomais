#!/usr/bin/env node
const yargs = require("yargs/yargs");
const {hideBin} = require("yargs/helpers");
const { parseWorkflow } = require("./utils/parseWorkflow");

yargs(hideBin(process.argv))
    .command("$0", "The default command", () => {
    }, (argv) => {
        parseWorkflow(argv._[0]);
    })
    .option("verbose", {
        alias: "v",
        type: "boolean",
        description: "Run with verbose logging"
    })
    .parse();
