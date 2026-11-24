// Deterministic screenshot scenes (?shot=start|play|end&seed=1).
// Each one stages a real simulated moment, on the fixed seed, so the
// screenshots are renders of the game's own code, not mockups.
import { TICK } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './world.js';

function idleInput(drive) {
  return {
    axis: () => drive,
    keys: new Set(),
    takeShoot: () => false,
    takeAction: () => false,
  };
}

export function stageShot(name, world) {
  world.reset();
  world.started = true;
  const p = world.player;

  if (name === 'play') {
    // Driving downtown, wanted 2, two police cars in pursuit, mission 1 live.
    world.screen = SCREEN_PLAY;
    const car = world.cars.find((c) => c.kind === 'traffic');
    p.inCar = car;
    car.kind = 'player';
    car.x = 1200;
    car.y = 800;
    car.angle = Math.PI / 2;
    car.speed = 220;
    p.x = car.x;
    p.y = car.y;
    p.wanted = 2;
    p.money = 540;
    world.spawnPolice();
    world.spawnPolice();
    for (let i = 0; i < 60 * 4; i++) world.step(TICK, idleInput({ x: 0, y: -1 }), {});
    world.screen = SCREEN_PLAY;
    return { screen: SCREEN_PLAY };
  }

  if (name === 'end') {
    // Final mission: shootout at the mansion, boss Rico Vane present.
    world.screen = SCREEN_PLAY;
    world.missionIndex = 4;
    world.missionStage = 'fight';
    p.x = 2400;
    p.y = 400;
    p.ammo = 120;
    p.money = 3200;
    p.wanted = 3;
    world.spawnEnemies(4, 2400, 400);
    world.spawnEnemies(1, 2400, 400, true);
    for (let i = 0; i < 60 * 2; i++) world.step(TICK, idleInput({ x: 0, y: 0 }), {});
    world.screen = SCREEN_PLAY;
    return { screen: SCREEN_PLAY };
  }

  // start: title screen over the city, player on foot beside the parked car.
  world.screen = SCREEN_TITLE;
  world.started = false;
  p.x = 1200;
  p.y = 1200;
  return { screen: SCREEN_TITLE };
}
