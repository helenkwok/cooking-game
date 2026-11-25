// Every tuning number, layout rectangle and colour of Steam Lantern in one place. The kitchen is a
// fixed 1280x720 logical stage; the renderer scales it to the window, so no rule depends on the
// screen size.

export const STAGE = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The open floor the chef walks on (the counters wrap around it). */
export const FLOOR = { left: 206, right: 1074, top: 268, bottom: 566 };

/** The island in the middle of the floor: broth, a third board and the chili crock. The chef walks round it. */
export const ISLAND = { x: 452, y: 362, w: 376, h: 92 };

export const CHEF = {
  radius: 24,
  speed: 400,
  /** How close (px) the chef's feet must be to a station's access point to work it. */
  reach: 78,
};

export const SHIFT = {
  /** Length of one service, in seconds. */
  seconds: 240,
  hearts: 5,
  /** Phase boundaries in seconds from the opening bell. */
  phases: [
    { name: 'Evening', from: 0 },
    { name: 'Night Rush', from: 75 },
    { name: 'Last Call', from: 180 },
  ],
  /** Seconds between new tickets at the start and at the end of the shift. */
  spawnStart: 27,
  spawnEnd: 12.5,
  maxTickets: 5,
  firstTicketAt: 1.2,
  /** Every ticket's patience is the recipe's own times this. */
  patience: 1.15,
  /** Coins needed for one, two and three stars on the results card. */
  stars: [110, 240, 400],
};

export const COOK = {
  chopStrokes: 6,
  /** Strokes a second while Space or the mouse button is held on a board. */
  holdChopRate: 8,
  /** Seconds past done before food in a pot or on the griddle is ruined. */
  boilGrace: 12,
  searGrace: 8,
  /** The last seconds of grace flash a warning. */
  warnAt: 3.5,
};

export const SCORE = {
  /** Tip share of a dish's price, paid in full for a ticket served the moment it arrives. */
  tipShare: 0.6,
  /** Extra coins per combo level (serves in a row with half the patience or more left). */
  comboBonus: 4,
  comboCap: 6,
};

export const PALETTE = {
  night: '#1a1530',
  wall: '#3b2a3f',
  wallTrim: '#5a3d4f',
  floorA: '#2f4f57',
  floorB: '#28434a',
  floorGrout: '#203a40',
  counterTop: '#c98f5a',
  counterTopLight: '#dba574',
  counterEdge: '#8a5a37',
  counterFace: '#6b4129',
  steel: '#9aa7b0',
  steelDark: '#5d6870',
  board: '#e0b77e',
  boardDark: '#b98b52',
  lantern: '#ff8a3d',
  lanternGlow: 'rgba(255,150,70,0.22)',
  paper: '#f6ecd8',
  paperShade: '#e4d5b8',
  ink: '#2b2230',
  inkSoft: '#6d5d6e',
  good: '#5cc87a',
  warn: '#f2b134',
  bad: '#e5534b',
  coin: '#ffd25a',
  text: '#fff6e8',
  shadow: 'rgba(10,6,20,0.35)',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best takings are kept between visits (this browser only). */
export const BEST_KEY = 'steam-lantern.best';
