let tickets = [
  { id: 1, title: "Login problem", status: "open", priority: "high" },
  { id: 2, title: "Payment issue", status: "open", priority: "medium" }
];

let nextId = 3;

const findAll = () => tickets;

const findById = (id) => {
  return tickets.find(ticket => ticket.id === id);
};

const create = (ticketData) => {
  const ticket = {
    id: nextId++,
    ...ticketData
  };

  tickets.push(ticket);
  return ticket;
};

module.exports = {
  findAll,
  findById,
  create
};