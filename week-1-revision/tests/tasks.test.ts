import {
  addTask,
  completeTask,
  deleteTask,
  formatTasks,
  type Task
} from "../src/tasks";

describe("task operations", () => {
  const startingTasks: Task[] = [
    { id: 1, title: "Read a chapter", completed: false },
    { id: 2, title: "Review notes", completed: false }
  ];

  test("adds a trimmed, incomplete task with the next ID", () => {
    expect(addTask(startingTasks, "  Learn TypeScript  ")).toEqual([
      ...startingTasks,
      { id: 3, title: "Learn TypeScript", completed: false }
    ]);
  });

  test("does not reuse an ID after the highest task is deleted", () => {
    expect(addTask([startingTasks[0]!], "New task")[1]).toEqual({
      id: 2,
      title: "New task",
      completed: false
    });
  });

  test("rejects a title containing only whitespace", () => {
    expect(() => addTask(startingTasks, "   ")).toThrow(
      "A task title cannot be empty."
    );
  });

  test("marks only the selected task as completed", () => {
    expect(completeTask(startingTasks, 2)).toEqual([
      startingTasks[0],
      { id: 2, title: "Review notes", completed: true }
    ]);
  });

  test("reports an error when completing a missing task", () => {
    expect(() => completeTask(startingTasks, 9)).toThrow(
      "Task 9 was not found."
    );
  });

  test("removes the selected task and keeps the remaining order", () => {
    expect(deleteTask(startingTasks, 1)).toEqual([startingTasks[1]]);
  });

  test("reports an error when deleting a missing task", () => {
    expect(() => deleteTask(startingTasks, 9)).toThrow(
      "Task 9 was not found."
    );
  });

  test("shows a clear message when the task list is empty", () => {
    expect(formatTasks([])).toBe("No tasks found.");
  });

  test("formats open and completed tasks for the CLI", () => {
    expect(
      formatTasks([
        { id: 1, title: "Read a chapter", completed: false },
        { id: 2, title: "Review notes", completed: true }
      ])
    ).toBe("1. [ ] Read a chapter\n2. [x] Review notes");
  });

  test("does not change the original list when completing a task", () => {
    completeTask(startingTasks, 1);
    expect(startingTasks[0]?.completed).toBe(false);
  });
});
