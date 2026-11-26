import fs from "node:fs";
import path from "node:path";
import { geminiProvider } from "../src/ai/gemini-client.ts";
import { categorizeTicketPromptV1 } from "../src/ai/prompts/categorize-ticket.v1.ts";
import { suggestedTicketJsonSchema, suggestedTicketSchema } from "../src/ai/schemas.ts";
import { buildGuardedContext, maskPii, moderationCheck } from "../src/ai/guardrails.ts";

type LabelledTicket = {
  title: string;
  description: string;
  expectedCategory: "Technical" | "Account" | "Billing";
};

const datasetArg = process.argv[2] ?? "tests-data/labelled-evaluation-tickets.json";
const datasetPath = path.resolve(process.cwd(), datasetArg);

if (!fs.existsSync(datasetPath)) {
  console.log(`Evaluation dataset missing: ${datasetArg}`);
  console.log("Actual 20-ticket measured accuracy: pending.");
  console.log("No lead-labelled dataset was fabricated or evaluated.");
  process.exit(0);
}

const parsed: unknown = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
if (!Array.isArray(parsed) || parsed.length !== 20) {
  throw new Error("Evaluation dataset must be a JSON array containing exactly 20 tickets.");
}

const dataset = parsed as LabelledTicket[];
async function main(): Promise<void> {
  let correct = 0;
  const failures: Array<{ index: number; title: string; expected: string; predicted: string }> = [];

  for (let index = 0; index < dataset.length; index += 1) {
  const ticket = dataset[index];
  if (!ticket || !ticket.title || !ticket.description || !ticket.expectedCategory) {
    throw new Error(`Invalid labelled ticket at index ${index}.`);
  }
  const content = buildGuardedContext(
    { title: maskPii(ticket.title), description: maskPii(ticket.description) },
    [],
  );
  if (!moderationCheck(content).safe) {
    failures.push({ index: index + 1, title: ticket.title, expected: ticket.expectedCategory, predicted: "BLOCKED" });
    continue;
  }
  const result = await geminiProvider.complete({
    instructions: categorizeTicketPromptV1.instructions,
    content,
    jsonSchema: suggestedTicketJsonSchema,
  });
  let parsedResult: unknown;
  try {
    parsedResult = JSON.parse(result.text);
  } catch {
    failures.push({ index: index + 1, title: ticket.title, expected: ticket.expectedCategory, predicted: "MALFORMED" });
    continue;
  }
  const validation = suggestedTicketSchema.safeParse(parsedResult);
  if (!validation.success) {
    failures.push({ index: index + 1, title: ticket.title, expected: ticket.expectedCategory, predicted: "INVALID" });
    continue;
  }
  if (validation.data.category === ticket.expectedCategory) {
    correct += 1;
  } else {
    failures.push({
      index: index + 1,
      title: ticket.title,
      expected: ticket.expectedCategory,
      predicted: validation.data.category,
    });
  }
  }

  const accuracy = (correct / dataset.length) * 100;
  console.log(`Correct: ${correct}`);
  console.log(`Incorrect: ${dataset.length - correct}`);
  console.log(`Accuracy: ${accuracy.toFixed(2)}%`);
  for (const failure of failures) {
    console.log(`Ticket ${failure.index}: ${failure.title} | expected=${failure.expected} | predicted=${failure.predicted}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Evaluation failed.";
  console.error(message);
  process.exitCode = 1;
});
