
const ticketService = require("../services/ticket.service.js");

const getAllTickets = (req, res) => {
  const result = ticketService.getAllTickets(
    req.query.status,
    req.query.priority
  );

  res.json(result);
};

const createTicket = (req, res) => {
  const { title, priority } = req.body;

  if (!title || typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({ error: "Title is required" });
  }

  if (!priority) {
    return res.status(400).json({ error: "Priority is required" });
  }

  const ticket = ticketService.createTicket({
    title,
    priority
  });

  res.status(201).json(ticket);
};

const getTicketById = (req, res) => {
  const id = Number(req.params.id);
  const ticket = ticketService.getTicketById(id);

  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  res.json(ticket);
};

const closeTicket = (req, res) => {
  const id = Number(req.params.id);
  const result = ticketService.closeTicket(id);

  if (result.error) {
    return res.status(result.statusCode).json({
      error: result.error
    });
  }

  res.json(result.data);
};

const reopenTicket = (req, res) => {
  const id = Number(req.params.id);
  const result = ticketService.reopenTicket(id);

  if (result.error) {
    return res.status(result.statusCode).json({
      error: result.error
    });
  }

  res.json(result.data);
};

module.exports = {
  getAllTickets,
  createTicket,
  getTicketById,
  closeTicket,
  reopenTicket
};