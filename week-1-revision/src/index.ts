import { resolve } from "node:path";
import { addTask, completeTask, deleteTask, formatTasks } from "./tasks";
import { loadTasks, saveTasks } from "./taskStore";

const usage = [
  "Usage:",
  '  npm run cli -- add "Task title"',
  "  npm run cli -- list",
  "  npm run cli -- complete <id>",
  "  npm run cli -- delete <id>"
].join("\n");

function parseTaskId(value: string | undefined): number {
  if (value === undefined || !/^[1-9]\d*$/.test(value)) {
    throw new Error("Please provide a positive whole-number task ID.");
  }

  const id = Number(value);
  if (!Number.isSafeInteger(id)) {
    throw new Error("The task ID is too large.");
  }

  return id;
}

export function runCli(
  args: string[],
  filePath = resolve(process.cwd(), "tasks.json"),
  print: (message: string) => void = console.log
): void {
  const [command, ...rest] = args;

  if (command === undefined) {
    throw new Error(usage);
  }

  if (!["add", "list", "complete", "delete"].includes(command)) {
    throw new Error(`Unknown command "${command}".\n${usage}`);
  }

  const tasks = loadTasks(filePath);

  switch (command) {
    case "add": {
      const updatedTasks = addTask(tasks, rest.join(" "));
      const addedTask = updatedTasks[updatedTasks.length - 1];
      if (addedTask === undefined) {
        throw new Error("The task could not be added.");
      }
      saveTasks(filePath, updatedTasks);
      print(`Added task #${addedTask.id}: ${addedTask.title}`);
      return;
    }
    case "list":
      if (rest.length > 0) {
        throw new Error(usage);
      }
      print(formatTasks(tasks));
      return;
    case "complete": {
      if (rest.length !== 1) {
        throw new Error(usage);
      }
      const id = parseTaskId(rest[0]);
      saveTasks(filePath, completeTask(tasks, id));
      print(`Completed task #${id}.`);
      return;
    }
    case "delete": {
      if (rest.length !== 1) {
        throw new Error(usage);
      }
      const id = parseTaskId(rest[0]);
      saveTasks(filePath, deleteTask(tasks, id));
      print(`Deleted task #${id}.`);
      return;
    }
    default:
      throw new Error(`Unknown command "${command}".\n${usage}`);
  }
}

if (require.main === module) {
  try {
    runCli(process.argv.slice(2));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  }
}
