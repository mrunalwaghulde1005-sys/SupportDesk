const express = require("express");

const app = express();

app.use(express.json());

const ticketRoutes = require("./src/routes/ticket.routes");

app.get("/", (req, res) => {
  res.send("Welcome to SupportDesk API");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    message: "SupportDesk API is running"
  });
});

app.use("/tickets", ticketRoutes);

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});