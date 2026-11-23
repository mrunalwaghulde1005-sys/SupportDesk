import "dotenv/config";
import { ZodError } from "zod";
import { HttpError } from "../src/http/errors.ts";
import * as adminProvisioningService from "../src/services/admin-provisioning.service.ts";
import { disconnectUserDatabase } from "../src/repositories/user.repository.ts";

async function main(): Promise<void> {
  const name = process.env["ADMIN_NAME"];
  const email = process.env["ADMIN_EMAIL"];
  const password = process.env["ADMIN_PASSWORD"];
  delete process.env["ADMIN_NAME"];
  delete process.env["ADMIN_EMAIL"];
  delete process.env["ADMIN_PASSWORD"];

  try {
    await adminProvisioningService.provisionFirstAdmin({ name, email, password });
    console.info("First Admin account provisioned successfully. No password or token was displayed.");
  } finally {
    await disconnectUserDatabase();
  }
}

main().catch((error: unknown) => {
  if (error instanceof ZodError) {
    console.error("Invalid provisioning input. Set ADMIN_NAME, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 12 characters.");
  } else if (error instanceof HttpError) {
    console.error(error.message);
  } else {
    console.error("Admin provisioning failed. Check the database connection and try again.");
  }
  process.exitCode = 1;
});
