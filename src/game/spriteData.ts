/**
 * Hand-drawn 16×16 pixel art, drawn at 2× (one tile = 32 px).
 * Each sprite has a palette (one character per colour, "." is transparent) and named frames.
 * These are original placeholder-quality sprites; the owner's art replaces them later
 * (see docs/ART-SPEC.md). No Phaser import here so tests can check the data.
 */

export interface SpriteDef {
  palette: Record<string, string>;
  frames: Record<string, string[]>;
}

export const SPRITE_SIZE = 16;

const EMPTY = '................';

// ---------------------------------------------------------------- explorer

const EXPLORER_PALETTE = {
  k: '#24160c', // outline
  h: '#9a6a34', // hat
  w: '#fff2d0', // highlight
  B: '#3a2416', // hat band
  H: '#7a4e24', // hat brim
  s: '#f2c493', // skin
  S: '#c8905e', // skin shade
  e: '#1a120c', // eye
  n: '#4a2c16', // hair
  r: '#e8603a', // scarf
  R: '#a83a20', // scarf shade
  t: '#2f9a8a', // shirt
  T: '#1e6a60', // shirt shade
  b: '#5a3418', // belt
  y: '#f0c850', // buckle
  p: '#7a6648', // trousers
  P: '#54442e', // trousers shade
  o: '#3e2a1a', // boots
};

const DOWN_HEAD = [
  EMPTY,
  '.....kkkkkk.....',
  '....khhhhhwk....',
  '...khhhhhhhhk...',
  '...kBBBBBBBBk...',
  '.kkHHHHHHHHHHkk.',
  '...ksssssssSk...',
  '...ksesssesSk...',
  '...kssssssSSk...',
  '....krrrrrRk....',
  '...kttrrRtttk...',
  '..kstttRttttTsk.',
  '...kTbbybbbTk...',
];

const UP_HEAD = [
  EMPTY,
  '.....kkkkkk.....',
  '....khhhhhwk....',
  '...khhhhhhhhk...',
  '...kBBBBBBBBk...',
  '.kkHHHHHHHHHHkk.',
  '...knnnnnnnnk...',
  '...knnnnnnnnk...',
  '...kSnnnnnnSk...',
  '....krrrrrRk....',
  '...kttRRRtttk...',
  '..ksttttttttTsk.',
  '...kTbbbbbbTk...',
];

const FRONT_LEGS = {
  idle: ['...kppppPPPPk...', '...kppk..kPPk...', '...kook..kook...'],
  stepA: ['...kppppPPPPk...', '..kppk...kPPk...', '..kook....kok...'],
  stepB: ['...kppppPPPPk...', '...kppk...kPPk..', '...kok....kook..'],
};

const SIDE_HEAD = [
  EMPTY,
  '......kkkkk.....',
  '.....khhhhwk....',
  '....khhhhhhhk...',
  '....kBBBBBBBk...',
  '...kHHHHHHHHHHk.',
  '.....knsssssk...',
  '.....knssssek...',
  '.....knsssSSk...',
  '......krrrRk....',
];

const SIDE_BODY = ['.....kRttttTk...', '.....ktttsSTk...', '.....kbbybbk....'];
const PUSH_BODY = ['.....kRtttttssk.', '.....kttttTk....', '.....kbbybbk....'];

const SIDE_LEGS = {
  idle: ['.....kppPPk.....', '.....kpkkPk.....', '.....kokkok.....'],
  stepA: ['.....kppPPk.....', '....kppk.kPk....', '....kok...kok...'],
  stepB: ['.....kppPPk.....', '.....kpPPk......', '.....kookk......'],
};

export const EXPLORER: SpriteDef = {
  palette: EXPLORER_PALETTE,
  frames: {
    'down-0': [...DOWN_HEAD, ...FRONT_LEGS.idle],
    'down-1': [...DOWN_HEAD, ...FRONT_LEGS.stepA],
    'down-2': [...DOWN_HEAD, ...FRONT_LEGS.stepB],
    'up-0': [...UP_HEAD, ...FRONT_LEGS.idle],
    'up-1': [...UP_HEAD, ...FRONT_LEGS.stepA],
    'up-2': [...UP_HEAD, ...FRONT_LEGS.stepB],
    'right-0': [...SIDE_HEAD, ...SIDE_BODY, ...SIDE_LEGS.idle],
    'right-1': [...SIDE_HEAD, ...SIDE_BODY, ...SIDE_LEGS.stepA],
    'right-2': [...SIDE_HEAD, ...SIDE_BODY, ...SIDE_LEGS.stepB],
    'right-push': [...SIDE_HEAD, ...PUSH_BODY, ...SIDE_LEGS.stepA],
  },
};

// ---------------------------------------------------------------- items

const BOULDER: SpriteDef = {
  palette: { k: '#2a2420', l: '#bcb2a4', w: '#ece4d8', g: '#8e8478', G: '#5e564c' },
  frames: {
    main: [
      EMPTY,
      '.....kkkkkk.....',
      '...kkllllggkk...',
      '..klllllgggggk..',
      '.kllwllggggggGk.',
      '.klllggggggggGk.',
      'kllgggggGgggGGGk',
      'klgggggGGggggGGk',
      'kgggggggggGgGGGk',
      'kggGgggggggggGGk',
      'kgggGGgggggGGGGk',
      '.kggggggggGGGGk.',
      '.kGgggggGGGGGGk.',
      '..kGGGGGGGGGGk..',
      '...kkGGGGGGkk...',
      '.....kkkkkk.....',
    ],
  },
};

const GEM_ROWS = [
  EMPTY,
  EMPTY,
  '....kkkkkkkk....',
  '...kLLwLdddDk...',
  '..kLwLLddddDDk..',
  '.kkkkkkkkkkkkkk.',
  '.kLLddddddDDDDk.',
  '..kLdddddDDDDk..',
  '...kLddddDDDk...',
  '....kLdddDDk....',
  '.....kLddDk.....',
  '......kdDk......',
  '.......kk.......',
  EMPTY,
  EMPTY,
  EMPTY,
];

const DIAMOND: SpriteDef = {
  palette: { k: '#0c2a44', L: '#b8ecff', w: '#ffffff', d: '#4fc3f7', D: '#1e88c8' },
  frames: { main: GEM_ROWS },
};

const RED_DIAMOND: SpriteDef = {
  palette: { k: '#44081a', L: '#ffc0cc', w: '#ffffff', d: '#ff3b5c', D: '#b81838' },
  frames: { main: GEM_ROWS },
};

const HEART: SpriteDef = {
  palette: { k: '#4a0c18', w: '#ffd0d8', r: '#ff4d6a', R: '#c0203c' },
  frames: {
    main: [
      EMPTY,
      EMPTY,
      '..kkkk...kkkk...',
      '.kwwrrk.krrrRk..',
      'kwwrrrrkrrrrRRk.',
      'kwrrrrrrrrrrRRk.',
      'krrrrrrrrrrrRRk.',
      '.krrrrrrrrrRRk..',
      '..krrrrrrrRRk...',
      '...krrrrrRRk....',
      '....krrrRRk.....',
      '.....krRRk......',
      '......kRk.......',
      '.......k........',
      EMPTY,
      EMPTY,
    ],
  },
};

const KEY_ROWS = [
  EMPTY,
  EMPTY,
  EMPTY,
  '..kkkk..........',
  '.kmwmmk.........',
  'kmk..kmk........',
  'kmk..kmkkkkkkkk.',
  'kmk..kmmmmmmmmMk',
  'kMk..kMkkkMkkMk.',
  '.kMMMMk...k..k..',
  '..kkkk..........',
  EMPTY,
  EMPTY,
  EMPTY,
  EMPTY,
  EMPTY,
];

const KEY_SILVER: SpriteDef = { palette: { k: '#2a2e36', m: '#d0d6e0', M: '#8a94a4', w: '#ffffff' }, frames: { main: KEY_ROWS } };
const KEY_GOLD: SpriteDef = { palette: { k: '#4a3008', m: '#ffd03c', M: '#c08a10', w: '#fff6c0' }, frames: { main: KEY_ROWS } };

const HANDLE = { h: '#8a5a2e', H: '#5a3418' };

const MACHETE: SpriteDef = {
  palette: { k: '#1e1a16', w: '#ffffff', b: '#c8d0d8', B: '#8a949e', ...HANDLE },
  frames: {
    main: [
      '..............kk',
      '.............kwk',
      '............kwbk',
      '...........kwbBk',
      '..........kwbBk.',
      '.........kwbBk..',
      '........kwbBk...',
      '.......kwbBk....',
      '......kwbBk.....',
      '.....kbbBk......',
      '...kkkkkk.......',
      '....khHk........',
      '...khHk.........',
      '..khHk..........',
      '.kHHk...........',
      '.kkk............',
    ],
  },
};

const SHOVEL: SpriteDef = {
  palette: { k: '#1e1a16', w: '#ffffff', m: '#a0a8b4', M: '#6a7280', ...HANDLE },
  frames: {
    main: [
      '............kk..',
      '...........khk..',
      '..........khk...',
      '.........khk....',
      '........khk.....',
      '.......khk......',
      '......khk.......',
      '....kkkk........',
      '...kmmmMk.......',
      '..kmwmmMMk......',
      '.kmwmmMMk.......',
      '.kmmmMMk........',
      '.kMMMMk.........',
      '..kkkk..........',
      EMPTY,
      EMPTY,
    ],
  },
};

const PICKAXE: SpriteDef = {
  palette: { k: '#1e1a16', w: '#ffffff', m: '#a0a8b4', M: '#6a7280', ...HANDLE },
  frames: {
    main: [
      EMPTY,
      '..kkkkkkkkk.....',
      '.kmwmmmmmmMk....',
      'kmk...khk..kMk..',
      'kk....khk...kk..',
      '......khk.......',
      '......khk.......',
      '......khk.......',
      '......khk.......',
      '......kHk.......',
      '......kHk.......',
      '......kHk.......',
      '......kkk.......',
      EMPTY,
      EMPTY,
      EMPTY,
    ],
  },
};

const SAND: SpriteDef = {
  palette: { k: '#5a4020', w: '#f8e8b8', s: '#e0c080', S: '#b08a50' },
  frames: {
    main: [
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      '......kkkk......',
      '.....kwwssk.....',
      '....kwssssSk....',
      '...kwssssssSk...',
      '..kssssssssSSk..',
      '.kssssSssssSSSk.',
      'kssSsssssSssSSSk',
      'kSSSSSSSSSSSSSSk',
      '.kkkkkkkkkkkkkk.',
      EMPTY,
      EMPTY,
    ],
  },
};

const ICE_BLOCK: SpriteDef = {
  palette: { k: '#2a5a80', w: '#ffffff', i: '#b8e4ff', I: '#78b8e0' },
  frames: {
    main: [
      'kkkkkkkkkkkkkkkk',
      'kwwwwwwwwwwwwwIk',
      'kwiiiiiiiiiiiiIk',
      'kwiwwiiiiiiiiiIk',
      'kwiwiiiiiiiiiiIk',
      'kwiiiiiiiiiiiiIk',
      'kwiiiiiiwiiiiiIk',
      'kwiiiiiwiiiiiiIk',
      'kwiiiiwiiiiiiiIk',
      'kwiiiiiiiiiiiiIk',
      'kwiiiiiiiiiiwiIk',
      'kwiiiiiiiiiwiiIk',
      'kwiiiiiiiiiiiiIk',
      'kwiiiiiiiiiiiiIk',
      'kIIIIIIIIIIIIIIk',
      'kkkkkkkkkkkkkkkk',
    ],
  },
};

const SNOW_PALETTE = { k: '#6a84a0', w: '#ffffff', s: '#e4eef8', S: '#b0c4d8' };

const SNOWBALL: SpriteDef = {
  palette: SNOW_PALETTE,
  frames: {
    main: [
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      '......kkkk......',
      '.....kwwssk.....',
      '....kwwsssSk....',
      '....kwssssSk....',
      '....kssssSSk....',
      '....ksssSSSk....',
      '.....kSSSSk.....',
      '......kkkk......',
      EMPTY,
    ],
  },
};

const BIG_SNOWBALL: SpriteDef = {
  palette: SNOW_PALETTE,
  frames: {
    main: [
      '.....kkkkkk.....',
      '...kkwwwsssskk..',
      '..kwwwwssssssSk.',
      '.kwwwsssssssssSk',
      '.kwwsssssssssSSk',
      'kwwsssssssssssSk',
      'kwsssssssssssSSk',
      'kssssssssssssSSk',
      'ksssssssssssSSSk',
      'ksssssssssssSSSk',
      'kssssssssssSSSSk',
      '.kssssssssSSSSk.',
      '.kSsssssSSSSSSk.',
      '..kSSSSSSSSSSk..',
      '...kkSSSSSSkk...',
      '.....kkkkkk.....',
    ],
  },
};

/** Texture key → sprite. Object kinds use their own name as the key. */
export const SPRITES: Record<string, SpriteDef> = {
  explorer: EXPLORER,
  boulder: BOULDER,
  diamond: DIAMOND,
  redDiamond: RED_DIAMOND,
  heart: HEART,
  keySilver: KEY_SILVER,
  keyGold: KEY_GOLD,
  machete: MACHETE,
  shovel: SHOVEL,
  pickaxe: PICKAXE,
  sand: SAND,
  iceBlock: ICE_BLOCK,
  snowball: SNOWBALL,
  bigSnowball: BIG_SNOWBALL,
};

/** Golden costume reward: same explorer, recoloured. */
export const COSTUME_PALETTE: Record<string, string> = {
  ...EXPLORER_PALETTE,
  h: '#f0c850', H: '#c89a20', B: '#7a4a10', t: '#f5e9d0', T: '#c8b890', r: '#ffd03c', R: '#c08a10',
};
