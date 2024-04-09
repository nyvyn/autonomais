#!/usr/bin/env node
const yargs = require("yargs/yargs");
const {hideBin} = require("yargs/helpers");

yargs(hideBin(process.argv))
    .command("$0", "The default command", () => {
    }, (argv) => {
        parseWorkflow(argv.$0);
    })
    .option("verbose", {
        alias: "v",
        type: "boolean",
        description: "Run with verbose logging"
    })
    .parse();