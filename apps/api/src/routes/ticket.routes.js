const express = require("express");
const router = express.Router();

const ticketController = require("../controllers/ticket.controller");

router.get("/", ticketController.getAllTickets);
router.post("/", ticketController.createTicket);
router.get("/:id", ticketController.getTicketById);
router.patch("/:id/close", ticketController.closeTicket);
router.patch("/:id/reopen", ticketController.reopenTicket);

module.exports = router;