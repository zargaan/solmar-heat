// Solmar Heat — tunables for the whole game.
// Original setting: Solmar Bay, a fictional coastal city. Nothing here is
// taken from any real game; the numbers below define the world size, the road
// grid, the player, the cars, the districts and the five story missions.
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const TICK = 1 / 60; // fixed simulation step
export const ROAD_W = 72; // road width in world units
export const BLOCK = 400; // city blocks are BLOCK x BLOCK; roads sit on multiples of BLOCK

export const PLAYER = { radius: 14, walkSpeed: 190, runSpeed: 290, maxHp: 100, startMoney: 250, startAmmo: 60 };
export const CAR_SIZE = { length: 54, width: 28 };

export const PALETTE = {
  grass: '#3f7a44',
  road: '#2b2f36',
  lane: '#e8d44d',
  sidewalk: '#8a8f98',
  water: '#1e6f9e',
  sand: '#e0c98f',
  park: '#2f6b34',
  buildingColors: ['#c96f4a', '#4a7ac9', '#c9a44a', '#7a4ac9', '#4ac9a2', '#b0526b', '#5a6b7a'],
};
export const BUILDING_NAMES = ['Solmar Tower', 'Bay Hotel', 'Palm Plaza', 'Docks Warehouse', 'Cafe Luna', 'Auto Shop', 'Neon Mall', 'Fish Market'];

export const DISTRICTS = [
  { name: 'Downtown', x: 800, y: 400, w: 800, h: 800 },
  { name: 'Harbor', x: 0, y: 1600, w: 1200, h: 800 },
  { name: 'Beachside', x: 2000, y: 1600, w: 1200, h: 800 },
  { name: 'Old Town', x: 0, y: 0, w: 800, h: 800 },
  { name: 'Industrial', x: 2000, y: 0, w: 1200, h: 800 },
];

export const PAINT_JOBS = ['#d23b3b', '#3b7ad2', '#e8c832', '#e8e8e8', '#222831', '#2fae5f', '#c96fd2', '#f08a1d'];

// Every mission target sits on a road intersection, never inside a block —
// that was a real bug in an earlier build (targets inside buildings).
export const MISSIONS = [
  { id: 1, name: 'First Wheels', giver: 'Luna', text: 'Steal a car and drive it to the yellow marker at the Harbor.', reward: 150, target: { x: 800, y: 2000 } },
  { id: 2, name: 'Payback at the Docks', giver: 'Luna', text: 'Go to the docks. Deal with the 3 dock thugs, then grab the cash.', reward: 400, target: { x: 400, y: 2000 } },
  { id: 3, name: 'Getaway Driver', giver: 'Dex', text: 'Pick up Luna at the beach, then lose the cops and reach the safehouse.', reward: 600, target: { x: 2400, y: 2000 } },
  { id: 4, name: 'The Solmar Bank', giver: 'Dex', text: 'Reach the bank downtown, hold E to crack the vault, then escape with wanted level 3.', reward: 1200, target: { x: 1200, y: 800 } },
  { id: 5, name: 'King of Solmar', giver: 'Luna', text: 'Final job: storm the mansion, take down boss Rico Vane and his crew.', reward: 2500, target: { x: 2400, y: 400 } },
];

export const SAFEHOUSE = { x: 800, y: 2000 };
export const SPAWN = { x: 1200, y: 1200 }; // a road intersection, not a building
export const STARTER_CAR = { x: 1260, y: 1200 }; // parked beside the spawn, stays put until stolen
