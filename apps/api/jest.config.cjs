module.exports = {
  clearMocks: true,
  rootDir: ".",
  setupFiles: ["<rootDir>/tests/setup.cjs"],
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.cjs"],
  transform: {
    "^.+\\.tsx?$": "<rootDir>/tests/ts-transformer.cjs",
  },
};
