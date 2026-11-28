export interface Task {
  id: number;
  title: string;
  completed: boolean;
}

export function addTask(tasks: Task[], title: string): Task[] {
  const cleanTitle = title.trim();

  if (cleanTitle.length === 0) {
    throw new Error("A task title cannot be empty.");
  }

  const nextId = tasks.reduce(
    (largestId, task) => Math.max(largestId, task.id),
    0
  ) + 1;
  const newTask: Task = { id: nextId, title: cleanTitle, completed: false };

  return [...tasks, newTask];
}

export function completeTask(tasks: Task[], id: number): Task[] {
  const taskExists = tasks.some((task) => task.id === id);

  if (!taskExists) {
    throw new Error(`Task ${id} was not found.`);
  }

  return tasks.map((task) =>
    task.id === id ? { ...task, completed: true } : task
  );
}

export function deleteTask(tasks: Task[], id: number): Task[] {
  const taskExists = tasks.some((task) => task.id === id);

  if (!taskExists) {
    throw new Error(`Task ${id} was not found.`);
  }

  return tasks.filter((task) => task.id !== id);
}

export function formatTasks(tasks: Task[]): string {
  if (tasks.length === 0) {
    return "No tasks found.";
  }

  return tasks
    .map((task) => {
      const status = task.completed ? "x" : " ";
      return `${task.id}. [${status}] ${task.title}`;
    })
    .join("\n");
}
