const ticketRepository = require("../repositories/ticket.repository");

const getAllTickets = (status, priority) => {
  let result = ticketRepository.findAll();

  if (status) {
    result = result.filter(ticket => ticket.status === status);
  }

  if (priority) {
    result = result.filter(ticket => ticket.priority === priority);
  }

  return result;
};

const createTicket = ({ title, priority }) => {
  return ticketRepository.create({
    title,
    status: "open",
    priority
  });
};

const getTicketById = (id) => {
  return ticketRepository.findById(id);
};

const closeTicket = (id) => {
  const ticket = ticketRepository.findById(id);

  if (!ticket) {
    return { statusCode: 404, error: "Ticket not found" };
  }

  if (ticket.status === "closed") {
    return { statusCode: 400, error: "Ticket already closed" };
  }

  ticket.status = "closed";

  return {
    data: { message: "Ticket closed successfully", ticket }
  };
};

const reopenTicket = (id) => {
  const ticket = ticketRepository.findById(id);

  if (!ticket) {
    return { statusCode: 404, error: "Ticket not found" };
  }

  if (ticket.status === "open") {
    return { statusCode: 400, error: "Ticket already open" };
  }

  ticket.status = "open";

  return {
    data: { message: "Ticket reopened successfully", ticket }
  };
};

module.exports = {
  getAllTickets,
  createTicket,
  getTicketById,
  closeTicket,
  reopenTicket
};