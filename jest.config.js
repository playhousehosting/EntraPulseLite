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
    "node_modules/(?!(electron-store)/)"
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(jpg|jpeg|png|gif|ico|svg)$": "<rootDir>/src/tests/mocks/fileMock.js"
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
  verbose: true
};
