#!/usr/bin/env node
const yargs = require("yargs/yargs")
const {hideBin} = require("yargs/helpers")

yargs(hideBin(process.argv))
    .command("$0", "The default command", () => {
    }, (argv) => {
        console.log("this command will be run by default")
    })
    .option("verbose", {
        alias: "v",
        type: "boolean",
        description: "Run with verbose logging"
    })
    .parse();