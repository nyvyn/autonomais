module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1"
    },
    moduleDirectories: ["node_modules"],
    modulePaths: ["<rootDir>"],
    modulePathIgnorePatterns: ["<rootDir>/dist/"]
}