import { MockInstance } from "vitest";

describe("autonomais cli", () => {
  let originalArgv: string[];
  let processExitSpy: MockInstance<NodeJS.Process["exit"]>;

  beforeEach(() => {
    vi.resetModules();
    originalArgv = process.argv;
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(undefined);
    // Remove all cached modules.
    // Clear the cache before running each command,
    // otherwise you will see the same results from the command
    // run in your first test in later tests.
    vi.resetModules();

    // Each test overwrites process arguments so store the original arguments
    originalArgv = process.argv;
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(undefined);
  });

  afterEach(() => {
    // Set process arguments back to the original value
    process.argv = originalArgv;
    processExitSpy.mockRestore();
  });

  it("should run help command", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    await runCommand("--help");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("autonomais.ts"),
    );
  });
});

/**
 * Programmatically set arguments and execute the CLI script
 *
 * @param {...string} args - positional and option arguments for the command to run
 */
async function runCommand(...args: string[]) {
  process.argv = [
    "ts-node", // Not used, but a value is required at this index in the array.
    "autonomais.ts", // Not used, but a value is required at this index in the array.
    ...args,
  ];

  // Require the yargs CLI script
  return require("./autonomais");
}
