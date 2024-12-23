import { describe, expect, it } from "@jest/globals";
import { cleanInput, parseJson } from "./parseJson";

describe("cleanInput", () => {
    it("should trim input string", () => {
        const input = "   { \"key\": \"value\" }   ";
        const output = cleanInput(input);
        expect(output).toBe("{ \"key\": \"value\" }");
    });

    it("should remove markdown code block backticks", () => {
        const input = "```json\n{ \"key\": \"value\" }\n```";
        const output = cleanInput(input);
        expect(output).toBe("{ \"key\": \"value\" }");
    });

    it("should escape double quotes inside strings", () => {
        const input = "{ \"key\": \"a \"quoted\" string\" }";
        const output = cleanInput(input);
        expect(output).toBe("{ \"key\": \"a \"quoted\" string\" }");
    });

    it("should correctly handle escaped double quotes inside strings", () => {
        const input = "{ \"key\": \"a \\\"quoted\\\" string\" }";
        const output = cleanInput(input);
        expect(output).toBe("{ \"key\": \"a \\\"quoted\\\" string\" }");
    });

    it("should be able to handle finding the last set of triple backticks", () => {
        const input = "``hello!```\n" +
            "```json\n{ \"key\": \"value\" }\n```";
        const output = cleanInput(input);
        expect(output).toEqual("{ \"key\": \"value\" }");
    });
});

describe("parseJson", () => {
    it("should parse valid JSON5 string", () => {
        const input = "{ key: \"value\" }";
        const output = parseJson(input);
        expect(output).toEqual({key: "value"});
    });

    it("should parse a more complicated JSON5 string", () => {
        const input = `{
            // This is a comment
            unquotedKey: 'unquoted value',
            'singleQuotes': "can have \\"escaped\\" quotes",
            nested: {
                array: [1, 2, 3,],
            },
            trailingComma: 'is fine',
        }`;
        const output = parseJson(input);
        expect(output).toEqual({
            unquotedKey: "unquoted value",
            singleQuotes: "can have \"escaped\" quotes",
            nested: {
                array: [1, 2, 3],
            },
            trailingComma: "is fine",
        });
    });

    it("should throw error on invalid JSON5 string", () => {
        const input = "{ key: \"value\", }";
        const output = parseJson(input);
        expect(output).toEqual({key: "value"});
    });
});
