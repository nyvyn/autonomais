module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    moduleDirectories: ["node_modules"],
    modulePaths: ["<rootDir>"],
    modulePathIgnorePatterns: ["<rootDir>/dist/"]
}