// The whole game state and its one step: the chef moves and works, the stove cooks, tickets arrive
// and wait, and the shift clock runs. Everything that happens is pushed to `events` for the
// renderer's effects and the sound to answer.
import { SHIFT } from './config.js';
import { createChef, moveChef, resetChef, stationInReach } from './chef.js';
import { chopAt, interact, updateCookers } from './kitchen.js';
import { addTicket, createOrders, fillTicket, openTickets, ticketFor, updateTickets } from './orders.js';
import { matchRecipe } from './recipes.js';
import { chooseRecipe, createShift, loseHeart, patienceScale, payForServe, phaseIndex, ticketInterval } from './shift.js';
import { BOARD, createStations } from './stations.js';

export function createWorld(random) {
  const world = {
    random,
    stations: createStations(),
    chef: createChef(),
    orders: createOrders(),
    shift: createShift(),
    events: [],
    lastRecipe: null,
    /** The station the chef is chopping at by holding the button, and the stroke clock. */
    holdChop: null,
    holdClock: 0,
  };

  world.reset = () => {
    world.stations = createStations();
    resetChef(world.chef);
    world.orders = createOrders();
    world.shift = createShift();
    world.events = [];
    world.lastRecipe = null;
    world.holdChop = null;
  };

  world.station = (id) => world.stations.find((s) => s.id === id);

  /** Serve a dish at the pass; false when no ticket wants it. */
  world.serve = (contents, s) => {
    const ticket = ticketFor(world.orders, contents);
    if (ticket === null) {
      const recipe = matchRecipe(contents);
      world.events.push({ type: 'refuse', x: s.cx, y: s.cy, text: recipe ? `No ticket for ${recipe.name}` : 'Not on the menu' });
      return false;
    }
    fillTicket(ticket);
    const pay = payForServe(world.shift, ticket);
    world.events.push({ type: 'serve', x: s.cx, y: s.cy, ticket: ticket.id, recipe: ticket.recipe.id, contents: [...contents], ...pay, combo: world.shift.combo });
    return true;
  };

  /** Work the station in reach (Space / E); true when there was one. */
  world.useStation = () => {
    const s = stationInReach(world.chef, world.stations);
    if (s === null) return false;
    world.chef.target = null;
    interact(world, s);
    return true;
  };

  /** Walk to station `s` and work it on arrival (a click). Already there: work it now. */
  world.walkTo = (s) => {
    const chef = world.chef;
    if (Math.hypot(s.ax - chef.x, s.ay - chef.y) < 8) {
      chef.target = null;
      interact(world, s);
    } else chef.target = s.id;
  };

  /**
   * One fixed step. `control` is { dx, dy, chopHeld }: the keyboard direction and whether the
   * chop button (Space or the mouse on a board) is held down.
   */
  world.step = (dt, control) => {
    const shift = world.shift;
    if (shift.over) return;
    shift.time += dt;

    const arrived = moveChef(world.chef, world.stations, control.dx, control.dy, dt);
    if (arrived !== null) interact(world, arrived);

    // Holding the chop button keeps the knife going on the board in reach.
    const board = control.chopHeld ? stationInReach(world.chef, world.stations) : null;
    if (board !== null && board.type === BOARD && world.chef.held === null && board.item !== null) {
      if (world.holdChop !== board.id) {
        world.holdChop = board.id;
        world.holdClock = 0;
      }
      world.holdClock += dt;
      const period = 1 / control.chopRate;
      while (world.holdClock >= period) {
        world.holdClock -= period;
        chopAt(world, board);
      }
    } else world.holdChop = null;

    updateCookers(world, world.stations, dt);

    // New tickets, faster as the night goes on.
    shift.nextTicket -= dt;
    if (shift.nextTicket <= 0) {
      if (openTickets(world.orders).length < SHIFT.maxTickets) {
        const recipe = chooseRecipe(shift, world.random, world.lastRecipe);
        world.lastRecipe = recipe.id;
        const ticket = addTicket(world.orders, recipe, patienceScale(shift));
        world.events.push({ type: 'ticket', ticket: ticket.id, recipe: recipe.id, x: 0, y: 0 });
      }
      shift.nextTicket = ticketInterval(shift) * (0.85 + world.random() * 0.3);
    }

    for (const ticket of updateTickets(world.orders, dt)) {
      world.events.push({ type: 'expire', ticket: ticket.id, recipe: ticket.recipe.id, x: 0, y: 0 });
      if (loseHeart(shift)) {
        shift.over = true;
        shift.closedEarly = true;
        world.events.push({ type: 'over', x: 0, y: 0 });
      }
    }

    const phase = phaseIndex(shift);
    if (phase !== shift.lastPhase) {
      shift.lastPhase = phase;
      world.events.push({ type: 'phase', phase, x: 0, y: 0 });
    }

    if (!shift.over && shift.time >= SHIFT.seconds) {
      shift.time = SHIFT.seconds;
      shift.over = true;
      world.events.push({ type: 'over', x: 0, y: 0 });
    }
  };

  return world;
}
