# Prompt Journal — SupportDesk

## Entry 1: AI-Assisted Coding — Ticket ID Generation

**Date:** 26 October 2026

**Task/Context:**  
Create a TypeScript CLI command to generate SupportDesk ticket IDs.

**Prompt Used (Improved Using the 6-Box Technique):**

**1. Context:**  
I am building a beginner-level TypeScript CLI project for SupportDesk. One of its tasks is to generate ticket IDs.

**2. Goal / Task:**  
Help me implement a TypeScript function that generates a ticket ID using a timestamp and a random string.

**3. Constraints:**
- Use TypeScript.
- Keep the code simple and beginner-friendly.
- Use built-in JavaScript features where possible.
- Explain how the function works.
- Do not introduce unnecessary dependencies.
- Treat the proposed ID format as a practice choice, not a confirmed project requirement.

**4. Examples:**  
Use this format as an illustrative example: `SD-<timestamp>-<random-part>`. The generated values should vary between calls, but do not claim that this guarantees uniqueness.

**5. Output Format:**  
Provide the function, a short explanation, an example output, and instructions for using it in the CLI.

**6. Checks / Verification:**  
Explain how to run the CLI command and check that it prints a ticket ID. Suggest a test that checks the ID format.

**Summary of AI Response:**  
AI suggested combining a timestamp and a random string to generate a ticket ID.

**Changes/Corrections Made:**  
Reviewed the suggested function and used the proposed `SD-<timestamp>-<random-part>` format for this practice task.

**Verification:**  
Ran the CLI command and confirmed that it printed a ticket ID.

**What I Learned:**  
I learned how to use TypeScript functions, `Date.now()`, and `Math.random()` to generate ticket IDs. I also learned that a random-looking ID does not automatically guarantee uniqueness.

---

## Entry 2: AI-Assisted Coding — CSV to JSON Conversion

**Date:** 26 October 2026

**Task/Context:**  
Convert CSV data into JSON using TypeScript.

**Prompt Used (Improved Using the 6-Box Technique):**

**1. Context:**  
I am building a TypeScript CLI for SupportDesk. It includes a CSV-to-JSON conversion feature in `src/csvToJson.ts`.

**2. Goal / Task:**  
Help me implement a function that converts CSV text into an array of JSON objects.

**3. Constraints:**
- Use TypeScript and beginner-friendly code.
- Handle empty input.
- Use the first row as the column headers.
- Explain how the implementation works.
- Do not claim full CSV compatibility if quoted values and embedded commas are not supported.
- Avoid adding dependencies unless necessary.

**4. Examples:**  
For this sample input:

```csv
name,age
Asha,22
Rahul,24
```

The expected output is:

```json
[
  { "name": "Asha", "age": "22" },
  { "name": "Rahul", "age": "24" }
]
```

**5. Output Format:**  
Provide the TypeScript function, a short explanation, example input/output, and suggested Jest tests.

**6. Checks / Verification:**  
Explain how to test empty input, valid CSV data, and the CLI command that writes the JSON output. Identify unsupported CSV cases that need additional handling.

**Summary of AI Response:**  
AI suggested splitting CSV text into rows and columns, using the first row as headers, and creating an object for each data row.

**Changes/Corrections Made:**  
Used the suggested function in `src/csvToJson.ts`. The current implementation handles basic comma-separated data but does not support commas inside quoted CSV values.

**Verification:**  
Ran the CLI with `sample.csv` and confirmed that `output.json` was generated.

**What I Learned:**  
I learned how CSV headers map to object keys and how to convert CSV data into JSON objects. I also learned why quoted fields require more careful parsing.

---

## Entry 3: AI-Assisted Debugging — TypeScript and Jest Setup

**Date:** 26 October 2026

**Task/Context:**  
Configure the TypeScript CLI project and resolve setup issues.

**Prompt Used (Improved Using the 6-Box Technique):**

**1. Context:**  
I am setting up a TypeScript CLI project that uses Jest for testing. I encountered configuration and package-version issues.

**2. Goal / Task:**  
Help me identify the cause of the setup errors and recommend the smallest safe fix.

**3. Constraints:**
- Use the existing project configuration as the source of truth.
- Keep the explanation beginner-friendly.
- Avoid unnecessary package changes.
- Do not guess the cause without examining the relevant error messages and configuration.
- Explain any package-version changes before recommending them.

**4. Examples:**  
Use the actual terminal error messages and relevant configuration from `package.json`, `tsconfig.json`, and the Jest setup to diagnose the issue. Do not invent error messages.

**5. Output Format:**  
Explain the confirmed cause, the minimal fix, the commands to run, and the expected verification results. Clearly distinguish confirmed causes from possible causes.

**6. Checks / Verification:**  
Explain how to run the TypeScript compiler check and Jest test suite. Confirm success only when the commands actually pass.

**Summary of AI Response:**  
AI helped investigate configuration and package-version compatibility issues and suggested checking `package.json`, `tsconfig.json`, and the Jest setup.

**Changes/Corrections Made:**  
Corrected the `package.json` scripts syntax and used TypeScript version `5.9.3` after the attempted TypeScript `6.0.0` installation failed.

**Verification:**  
Ran the TypeScript compiler check and Jest test suite.

**Test Result:**  
2 test suites passed; 8 tests passed.

**What I Learned:**  
I learned how package versions, configuration files, and test scripts affect a TypeScript project. I also learned to verify fixes by running the relevant commands.

---

## Reflection

AI assistance helped me write code, understand setup issues, and verify CLI functionality. I reviewed the suggested code and tested the commands instead of relying only on the AI response.

Using the 6-Box Prompting Technique helped me structure prompts by specifying the context, goal, constraints, examples, expected output, and verification steps. This makes the task clearer and helps reduce unsupported assumptions.

**Important Notes:**
- The ticket ID format is a practice choice and must be confirmed against the project requirements before being treated as final.
- The CSV parser currently handles basic comma-separated data but does not support commas inside quoted fields.
- The reported Jest result is 8 passing tests across 2 suites. Other checks should be described as completed only when their actual results have been verified.
