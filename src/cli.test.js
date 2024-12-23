describe("cli", () => {
    let originalArgv;
    let processExitSpy;

    beforeEach(() => {
        jest.resetModules();
        originalArgv = process.argv;
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        });
        // Remove all cached modules.
        // Clear the cache before running each command,
        // otherwise you will see the same results from the command
        // run in your first test in later tests.
        jest.resetModules();

        // Each test overwrites process arguments so store the original arguments
        originalArgv = process.argv;
        processExitSpy = jest.spyOn(process, "exit").mockImplementation((code) => {
        });
    });

    afterEach(() => {
        jest.resetAllMocks();

        // Set process arguments back to the original value
        process.argv = originalArgv;
        processExitSpy.mockRestore();
    });

    it("should run help command", async () => {
        const consoleSpy = jest.spyOn(console, "log");

        await runCommand("--help");

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Help"));
    });
});

/**
 * Programmatically set arguments and execute the CLI script
 *
 * @param {...string} args - positional and option arguments for the command to run
 */
async function runCommand(...args) {
    process.argv = [
        "node", // Not used, but a value is required at this index in the array
        "cli.js", // Not used, but a value is required at this index in the array
        ...args,
    ];

    // Require the yargs CLI script
    return require("./cli");
}
