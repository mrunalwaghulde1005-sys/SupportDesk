
import { readFileSync, writeFileSync } from "node:fs";
import { generateTicketId } from "./ticketId";
import { csvToJson } from "./csvToJson";

const command = process.argv[2];

try {
  if (command === "ticket-id") {
    console.log(generateTicketId());
  } else if (command === "csv-to-json") {
    const inputPath = process.argv[3];
    const outputPath = process.argv[4];

    if (inputPath === undefined || outputPath === undefined) {
      console.error(
        "Usage: npm run cli -- csv-to-json <input.csv> <output.json>"
      );
      process.exitCode = 1;
    } else {
      const csv = readFileSync(inputPath, "utf8");
      const json = csvToJson(csv);

      writeFileSync(outputPath, JSON.stringify(json, null, 2), "utf8");
      console.log(`JSON file created: ${outputPath}`);
    }
  } else {
    console.log("Available commands:");
    console.log("  ticket-id");
    console.log("  csv-to-json <input.csv> <output.json>");
  }
} catch {
  console.error("Command failed. Check the input file path and permissions.");
  process.exitCode = 1;
}
