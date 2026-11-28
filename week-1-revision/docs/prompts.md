# Useful AI prompts for this project

## 1. Code generation

> Add a `renameTask` function to `src/tasks.ts`. It should accept a task list,
> task ID, and new title; return a new list; trim and validate the title; and
> throw a clear error if the task does not exist. Keep strict TypeScript types,
> avoid `any`, and follow the existing function style. Explain the change.

## 2. Debugging

> When I run `npm run cli -- complete 1`, I get this error: [paste the exact
> error and command output]. Trace the likely cause through the CLI, task
> operations, and JSON storage. Suggest the smallest fix and a regression test.
> Do not change unrelated SupportDesk files.

## 3. Code explanation

> Explain `src/taskStore.ts` to a beginner, line by line. Define unfamiliar
> TypeScript terms such as `unknown`, a type guard, and `catch`. Explain why
> invalid JSON is reported instead of silently replaced.

## 4. Unit test generation

> Write focused Jest tests for [describe one new task behavior]. Follow the
> patterns in `tests/tasks.test.ts`, use descriptive test names, cover a normal
> case and relevant edge cases, and do not add dependencies.

## 5. Code review

> Review my changes to this task CLI for correctness, TypeScript strict-mode
> safety, clear errors, and missing edge cases. Report only actionable issues,
> with file and line references. Do not edit files or review unrelated
> SupportDesk application code.
