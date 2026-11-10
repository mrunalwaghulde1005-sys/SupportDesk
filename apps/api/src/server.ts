import { env } from "./config/env.ts";
import { app } from "./app.ts";
import { disconnectDatabase } from "./repositories/ticket.repository.ts";

const server = app.listen(env.PORT, () => {
  console.info(`SupportDesk API listening on port ${env.PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close((error) => {
      void disconnectDatabase()
        .then(() => {
          if (error) {
            console.error("API server failed to close cleanly.");
            process.exitCode = 1;
          }
        })
        .catch(() => {
          console.error("Database connection did not close cleanly.");
          process.exitCode = 1;
        });
    });
  });
}
