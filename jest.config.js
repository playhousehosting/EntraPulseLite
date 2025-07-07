module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],
  testMatch: [
    "<rootDir>/src/tests/**/*.test.{ts,tsx}"
  ],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  transformIgnorePatterns: [
    "node_modules/(?!(electron-store|@modelcontextprotocol|@azure|@microsoft|@merill)/)"
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(jpg|jpeg|png|gif|ico|svg)$": "<rootDir>/src/tests/mocks/fileMock.js",
    "electron-store": "<rootDir>/src/tests/mocks/electron-store.js"
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/tests/**/*",
    "!src/main/main.ts"
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/out/",
    "guest-accounts-query.test.ts",
    "lokka-mcp-e2e.test.ts", 
    "lokka-tenant-connection.test.ts",
    "mcp-sdk.test.ts",
    "lokka-mcp-errors.test.ts"
  ],
  testTimeout: 30000,
  maxWorkers: process.env.CI ? 2 : 1,
  verbose: true
};
