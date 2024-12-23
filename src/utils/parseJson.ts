import * as JSON5 from "json5";

export function cleanInput(input: string): string {
    let processed = input.trim();

    // Isolate JSON code block from text that may precede or occur after it.
    if (processed.includes("```")) {
        // Find the last set of triple backticks
        const lastTripleBackticks = processed.lastIndexOf("```");
        // Remove any text after the final ```
        processed = processed.substring(0, lastTripleBackticks);

        // Now, find the last set of triple backticks again
        const secondLastTripleBackticks = processed.lastIndexOf("```");
        // Remove any text before the final ```
        processed = processed.substring(secondLastTripleBackticks);
    }

    // Remove Markdown code block
    while (processed.startsWith("`")) {
        processed = processed.substring(1);
    }
    while (processed.endsWith("`")) {
        processed = processed.substring(0, processed.length - 1);
    }
    while (processed.startsWith("\"")) {
        processed = processed.substring(1);
    }
    while (processed.endsWith("\"")) {
        processed = processed.substring(0, processed.length - 1);
    }
    processed = processed.trim();

    // Remove "json" prefix if it exists
    if (processed.startsWith("json")) {
        processed = processed.substring("json".length).trim();
    }

    // Escape double quotes inside double-quoted strings, because json5 can't handle that case.
    const regex = /"([^"]*)"/g;
    processed = processed.replace(regex, (_match, value) => {
        // Correctly escape double quotes inside the value
        const escapedValue = value.replace(/"/g, "\\\"");
        return `"${escapedValue}"`;
    });

    // Convert single quotes within double quotes into escaped double quotes. 
    // Example: "You"1"The Circus" => "You\"1\"The Circus"
    processed = processed.replace(/"([^"]*)'([^"]*)"/g, "\"$1\\\"$2\"");

    return processed;
}

export function parseJson(input: string) {
    const processedInput = cleanInput(input);

    try {
        return JSON5.parse(processedInput);
    } catch (error) {
        console.error("Failed to parse JSON:", error);
        throw error;
    }
}
