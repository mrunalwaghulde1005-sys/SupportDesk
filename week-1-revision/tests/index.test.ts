import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../src/index";

describe("CLI commands", () => {
  let directory: string;
  let filePath: string;
  let output: string[];

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "week-1-cli-"));
    filePath = join(directory, "tasks.json");
    output = [];
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  const captureOutput = (message: string): void => {
    output.push(message);
  };

  test("adds and lists a task using the persisted data file", () => {
    runCli(["add", "Learn TypeScript"], filePath, captureOutput);
    runCli(["list"], filePath, captureOutput);

    expect(output).toEqual([
      "Added task #1: Learn TypeScript",
      "1. [ ] Learn TypeScript"
    ]);
  });

  test("completes and deletes tasks through separate CLI commands", () => {
    runCli(["add", "Finish homework"], filePath, captureOutput);
    runCli(["complete", "1"], filePath, captureOutput);
    runCli(["list"], filePath, captureOutput);
    runCli(["delete", "1"], filePath, captureOutput);

    expect(output).toEqual([
      "Added task #1: Finish homework",
      "Completed task #1.",
      "1. [x] Finish homework",
      "Deleted task #1."
    ]);
    expect(JSON.parse(readFileSync(filePath, "utf8"))).toEqual([]);
  });

  test("rejects a non-numeric task ID without changing saved tasks", () => {
    runCli(["add", "Existing task"], filePath, captureOutput);

    expect(() => runCli(["complete", "abc"], filePath, captureOutput)).toThrow(
      "Please provide a positive whole-number task ID."
    );
    expect(JSON.parse(readFileSync(filePath, "utf8"))).toHaveLength(1);
  });

  test("rejects unknown commands with usage information", () => {
    expect(() => runCli(["update"], filePath, captureOutput)).toThrow(
      'Unknown command "update".'
    );
  });
});
