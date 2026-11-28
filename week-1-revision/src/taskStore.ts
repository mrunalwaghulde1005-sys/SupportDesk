import { readFileSync, writeFileSync } from "node:fs";
import type { Task } from "./tasks";

function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("id" in value) || !("title" in value) || !("completed" in value)) {
    return false;
  }

  return (
    typeof value.id === "number" &&
    Number.isInteger(value.id) &&
    value.id > 0 &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.completed === "boolean"
  );
}

export function loadTasks(filePath: string): Task[] {
  let contents: string;

  try {
    contents = readFileSync(filePath, "utf8");
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }

  const parsed: unknown = JSON.parse(contents);

  if (!Array.isArray(parsed) || !parsed.every(isTask)) {
    throw new Error(`Task data file is invalid: ${filePath}`);
  }

  return parsed;
}

export function saveTasks(filePath: string, tasks: Task[]): void {
  writeFileSync(filePath, `${JSON.stringify(tasks, null, 2)}\n`, "utf8");
}
