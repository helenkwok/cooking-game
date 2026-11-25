// The order board: tickets clipped to the rail, each a dish with a patience clock. A served dish
// goes to the matching ticket with the least patience left; a ticket that runs out walks away and
// costs a heart.
import { matchRecipe } from './recipes.js';

export function createOrders() {
  return { tickets: [], nextId: 1 };
}

/** Clip a new ticket for `recipe` to the rail; `patienceScale` shortens waits as the night goes on. */
export function addTicket(orders, recipe, patienceScale) {
  const patience = recipe.patience * patienceScale;
  const ticket = { id: orders.nextId, recipe, patience, left: patience, age: 0, leaving: 0, served: false };
  orders.nextId += 1;
  orders.tickets.push(ticket);
  return ticket;
}

/** Tick every ticket's clock; returns the tickets that ran out this step. */
export function updateTickets(orders, dt) {
  const expired = [];
  for (const ticket of orders.tickets) {
    ticket.age += dt;
    if (ticket.leaving > 0) {
      ticket.leaving += dt;
      continue;
    }
    ticket.left -= dt;
    if (ticket.left <= 0) {
      ticket.left = 0;
      ticket.leaving = 0.0001;
      expired.push(ticket);
    }
  }
  // Tickets that finished their leave animation come off the rail.
  orders.tickets = orders.tickets.filter((ticket) => ticket.leaving < 0.6);
  return expired;
}

/** Waiting tickets, oldest first. */
export function openTickets(orders) {
  return orders.tickets.filter((ticket) => ticket.leaving === 0);
}

/** The open ticket a dish of `contents` would fill (the most urgent of its recipe), or null. */
export function ticketFor(orders, contents) {
  const recipe = matchRecipe(contents);
  if (recipe === null) return null;
  let best = null;
  for (const ticket of openTickets(orders)) {
    if (ticket.recipe.id === recipe.id && (best === null || ticket.left < best.left)) best = ticket;
  }
  return best;
}

/** Take `ticket` off the rail as served. */
export function fillTicket(ticket) {
  ticket.served = true;
  ticket.leaving = 0.0001;
}
