# Prompt Journal — SupportDesk

## Entry 1: AI-Assisted Coding — Ticket ID Generation

**Date:** 26 October 2026

**Task/Context:** Create a TypeScript CLI command to generate ticket IDs.

**Prompt Used:**
Help me create a TypeScript function that generates a unique-looking SupportDesk ticket ID. Keep the code beginner-friendly and explain how it works.

**Summary of AI Response:**
AI suggested using a timestamp and a random string to generate a ticket ID.

**Changes/Corrections Made:**
Reviewed the function and used the proposed format `SD-<timestamp>-<random-part>` for this practice task.

**Verification:**
Ran the CLI command and confirmed that it printed a ticket ID.

**What I Learned:**
I learned how to use TypeScript functions, `Date.now()`, and `Math.random()` to generate ticket IDs.

---

## Entry 2: AI-Assisted Coding — CSV to JSON Conversion

**Date:** 26 October 2026

**Task/Context:** Convert CSV data into JSON using TypeScript.

**Prompt Used:**
Help me write a beginner-friendly TypeScript function that converts CSV text into an array of JSON objects. Explain the code and handle empty input.

**Summary of AI Response:**
AI suggested splitting the CSV into rows and columns, using the first row as headers, and creating an object for each data row.

**Changes/Corrections Made:**
Used the suggested function in `src/csvToJson.ts`. The current implementation handles basic comma-separated data but does not support commas inside quoted CSV values.

**Verification:**
Ran the CLI with `sample.csv` and confirmed that `output.json` was generated.

**What I Learned:**
I learned how CSV headers map to object keys and how JSON output can be created from CSV data.

---

## Entry 3: AI-Assisted Debugging — TypeScript and Jest Setup

**Date:** 26 October 2026

**Task/Context:** Configure the TypeScript CLI project and resolve setup issues.

**Prompt Used:**
Help me troubleshoot my TypeScript and Jest setup. Explain the errors in simple language and suggest the smallest safe fix.

**Summary of AI Response:**
AI helped identify configuration and package-version compatibility issues and suggested checking `package.json`, `tsconfig.json`, and the Jest setup.

**Changes/Corrections Made:**
Corrected the `package.json` scripts syntax and used TypeScript version 5.9.3 after the attempted TypeScript 6.0.0 installation failed.

**Verification:**
Ran the TypeScript compiler check and Jest test suite.

**Test Result:** 2 test suites passed; 8 tests passed.

**What I Learned:**
I learned how package versions, configuration files, and test scripts affect a TypeScript project.

---

## Reflection

AI assistance helped me write code, understand errors, and verify the CLI functionality. I reviewed the suggested code and tested the commands instead of relying only on the AI response.

**Important:** The ticket ID format and basic CSV parsing behavior are practice choices and should be confirmed against the project's requirements before being treated as final specifications.
