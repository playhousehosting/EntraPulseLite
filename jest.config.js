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
    "node_modules/(?!(electron-store|@modelcontextprotocol|@azure|@microsoft)/)"
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapping: {
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
    "/out/"
  ],
  testTimeout: 30000,
  maxWorkers: process.env.CI ? 2 : undefined,
  verbose: true
};
