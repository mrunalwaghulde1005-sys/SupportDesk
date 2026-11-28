# Week 1 Task CLI

A small command-line task manager written in TypeScript. It is intentionally
separate from the SupportDesk application and stores its task list in a local
`tasks.json` file in the directory where you run the commands.

## Setup

Open a terminal in this folder and install the development tools:

```sh
npm install
```

The package uses:

- **TypeScript** for strict type checking.
- **tsx** to run TypeScript source files directly as CLI commands.
- **Jest** and **ts-jest** to run TypeScript unit tests.
- **@types/node** and **@types/jest** for Node.js and Jest type definitions.

These are development-only dependencies. No runtime library is needed.

## Use the CLI

Run these commands from this folder:

```sh
npm run cli -- add "Learn TypeScript"
npm run cli -- list
npm run cli -- complete 1
npm run cli -- delete 1
```

`list` shows `[ ]` for an unfinished task and `[x]` for a completed task.
Task IDs are positive whole numbers. The `tasks.json` file is created the first
time you add a task and keeps your data between commands.

## Check the project

```sh
npm run typecheck
npm test
```

The test suite checks task behavior, saved data, invalid input, and CLI command
flows.

## What each file does

- `src/tasks.ts` defines a task and the small functions that add, complete,
  delete, and display tasks. These functions return new arrays instead of
  changing the input list.
- `src/taskStore.ts` reads and writes `tasks.json`. It validates loaded data
  and only treats a missing file as an empty task list.
- `src/index.ts` reads CLI arguments, calls the task and storage functions, and
  prints messages or actionable errors.
- `tests/tasks.test.ts` checks the task operations and display formatting.
- `tests/taskStore.test.ts` checks persistence and invalid files.
- `tests/index.test.ts` checks commands working together through the CLI layer.
- `tsconfig.json` enables TypeScript strict mode and additional safety checks.
- `jest.config.cjs` configures Jest to run TypeScript tests with ts-jest.
- `docs/prompts.md` contains reusable prompts for AI-assisted development.

## Beginner notes

- A **type** describes what data should look like. `Task` has an ID, a title,
  and a completion flag.
- A **function** groups a reusable operation. For example, `completeTask`
  receives the current list and the ID to complete.
- The task functions are **pure**: they return an updated list and do not
  modify the original list.
- The JSON file provides **persistence**, meaning tasks remain after the CLI
  process exits.
