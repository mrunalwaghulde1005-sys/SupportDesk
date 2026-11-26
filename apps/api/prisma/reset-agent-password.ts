import "dotenv/config";
import { ZodError } from "zod";
import * as agentPasswordService from "../src/services/agent-password.service.ts";
import { disconnectUserDatabase } from "../src/repositories/user.repository.ts";

async function main(): Promise<void> {
  const password = process.env["AGENT_PASSWORD"];
  delete process.env["AGENT_PASSWORD"];

  try {
    const updatedCount = await agentPasswordService.updateAgentPassword({
      email: "agent1@demo.local",
      password,
    });

    if (updatedCount !== 1) {
      throw new Error("Expected exactly one Agent account to be updated.");
    }

    console.info("Agent 1 password updated successfully.");
  } finally {
    await disconnectUserDatabase();
  }
}

main().catch((error: unknown) => {
  if (error instanceof ZodError) {
    console.error("Invalid password. Use 12–72 characters.");
  } else {
    console.error("Agent password update failed. Check the database and account.");
  }

  process.exitCode = 1;
});