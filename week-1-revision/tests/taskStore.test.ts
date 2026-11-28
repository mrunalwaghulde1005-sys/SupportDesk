import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTasks, saveTasks } from "../src/taskStore";
import type { Task } from "../src/tasks";

describe("task file storage", () => {
  let directory: string;
  let filePath: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "week-1-tasks-"));
    filePath = join(directory, "tasks.json");
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  test("starts with an empty list when the data file does not exist", () => {
    expect(loadTasks(filePath)).toEqual([]);
  });

  test("saves tasks and loads them back", () => {
    const tasks: Task[] = [
      { id: 1, title: "Learn TypeScript", completed: false }
    ];

    saveTasks(filePath, tasks);

    expect(loadTasks(filePath)).toEqual(tasks);
    expect(JSON.parse(readFileSync(filePath, "utf8"))).toEqual(tasks);
  });

  test("rejects JSON containing entries that are not tasks", () => {
    writeFileSync(filePath, JSON.stringify([{ id: "one" }]), "utf8");

    expect(() => loadTasks(filePath)).toThrow(
      `Task data file is invalid: ${filePath}`
    );
  });

  test("reports malformed JSON rather than silently replacing it", () => {
    writeFileSync(filePath, "{not json", "utf8");

    expect(() => loadTasks(filePath)).toThrow(SyntaxError);
  });
});
