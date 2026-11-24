// Solmar Heat — world simulation: city generation, traffic, pedestrians,
// police and the wanted system, combat, pickups, and the five story missions.
import {
  WORLD_W, WORLD_H, BLOCK, ROAD_W, PLAYER, CAR_SIZE, PALETTE,
  BUILDING_NAMES, PAINT_JOBS, MISSIONS, SAFEHOUSE, SPAWN, STARTER_CAR,
} from './config.js';
import { makeRng, pickFrom, between } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';
export const EVENT_OVER = 1;

const TAU = Math.PI * 2;
let carId = 1;

const roadLine = (n) => n * BLOCK;
export function isOnRoad(x, y) {
  for (let i = 0; i <= WORLD_W / BLOCK; i++) {
    if (Math.abs(x - roadLine(i)) < ROAD_W / 2 + 6) return true;
  }
  for (let j = 0; j <= WORLD_H / BLOCK; j++) {
    if (Math.abs(y - roadLine(j)) < ROAD_W / 2 + 6) return true;
  }
  return false;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

function buildBlock(rng, bx, by) {
  // Buildings must stay inside the block interior: the free strip is
  // BLOCK - ROAD_W - 16 wide, so nothing ever spills onto a road.
  const w = between(rng, 90, 220);
  const h = between(rng, 90, 220);
  const free = BLOCK - ROAD_W - 16;
  return {
    x: bx + between(rng, 8, Math.max(9, free - w)),
    y: by + between(rng, 8, Math.max(9, free - h)),
    w,
    h,
    color: pickFrom(rng, PALETTE.buildingColors),
    name: pickFrom(rng, BUILDING_NAMES),
  };
}

function newCar(rng, kind, x, y) {
  return {
    id: carId++,
    kind, // 'traffic' | 'police' | 'player'
    x, y,
    angle: pickFrom(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]),
    speed: 0,
    maxSpeed: kind === 'police' ? 330 : between(rng, 90, 150),
    color: kind === 'police' ? '#1a1a2e' : pickFrom(rng, PAINT_JOBS),
    hp: 100,
    parked: false,
    ramCd: 0,
  };
}

function newPed(rng) {
  return {
    id: carId++,
    x: between(rng, 100, WORLD_W - 100),
    y: between(rng, 100, WORLD_H - 100),
    angle: between(rng, 0, TAU),
    speed: between(rng, 25, 55),
    skin: pickFrom(rng, ['#e8b88a', '#8a5a3b', '#d2a679', '#f0c8a0']),
    shirt: pickFrom(rng, ['#d23b3b', '#3b7ad2', '#2fae5f', '#e8c832', '#c96fd2']),
    flee: 0,
    hp: 30,
  };
}

// Push a circle out of any building it overlaps; null when clear.
function pushOutOfBuildings(state, x, y, r) {
  for (const b of state.buildings) {
    const cx = clamp(x, b.x, b.x + b.w);
    const cy = clamp(y, b.y, b.y + b.h);
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 === 0) return { x: b.x - r, y };
    const d = Math.sqrt(d2);
    return { x: cx + (dx / d) * r, y: cy + (dy / d) * r };
  }
  return null;
}

export class World {
  constructor(seed = 1) {
    this.seed = seed;
    this.reset();
  }

  reset() {
    const rng = makeRng(this.seed);
    this.rng = rng;
    this.time = 0;
    this.buildings = [];
    for (let i = 0; i < WORLD_W / BLOCK - 1; i++) {
      for (let j = 0; j < WORLD_H / BLOCK - 1; j++) {
        if (rng() < 0.12) continue; // empty lot / park
        const ox = i * BLOCK + ROAD_W / 2 + 8;
        const oy = j * BLOCK + ROAD_W / 2 + 8;
        this.buildings.push(buildBlock(rng, ox, oy));
        if (rng() < 0.4) this.buildings.push(buildBlock(rng, ox, oy));
      }
    }
    this.player = {
      x: SPAWN.x, y: SPAWN.y, angle: 0,
      hp: PLAYER.maxHp, money: PLAYER.startMoney, ammo: PLAYER.startAmmo,
      wanted: 0, inCar: null, speed: 0, bustedTimer: 0, crimeTimer: 0,
    };
    this.cars = [];
    for (let i = 0; i < 14; i++) {
      const cx = roadLine(1 + Math.floor(rng() * 6)) + between(rng, -14, 14);
      const cy = roadLine(1 + Math.floor(rng() * 5)) + between(rng, -14, 14);
      this.cars.push(newCar(rng, 'traffic', cx, cy));
    }
    // The starter car: parked beside the spawn, and it STAYS parked until
    // the player steals it (an earlier build had it drive off on its own).
    const starter = newCar(rng, 'traffic', STARTER_CAR.x, STARTER_CAR.y);
    starter.speed = 0;
    starter.parked = true;
    starter.angle = 0;
    this.cars.push(starter);
    this.peds = [];
    for (let i = 0; i < 22; i++) this.peds.push(newPed(rng));
    this.enemies = [];
    this.bullets = [];
    this.pickups = [];
    this.missionIndex = 0;
    this.missionStage = 'go';
    this.vaultProgress = 0;
    this.message = 'Welcome to Solmar Bay. WASD move, E steal a car, click to shoot.';
    this.messageTimer = 6;
    this.screen = SCREEN_TITLE;
    this.started = false;
    this.stats = { kills: 0, carsStolen: 0, missionsDone: 0, cashEarned: 0 };
    this.sirenTimer = 0;
  }

  mission() { return MISSIONS[this.missionIndex] || null; }
  marker() {
    const m = this.mission();
    return m ? m.target : null;
  }

  say(text, secs = 4) {
    this.message = text;
    this.messageTimer = secs;
  }

  raiseWanted(n, why) {
    const p = this.player;
    p.wanted = clamp(p.wanted + n, 0, 5);
    p.crimeTimer = 0;
    if (n > 0) this.say(why || 'The cops noticed that.');
  }

  spawnPolice() {
    const p = this.player;
    if (this.cars.filter((c) => c.kind === 'police').length >= p.wanted + 1) return;
    const a = Math.random() * TAU;
    const car = newCar(this.rng, 'police', p.x + Math.cos(a) * 500, p.y + Math.sin(a) * 500);
    car.x = clamp(car.x, 60, WORLD_W - 60);
    car.y = clamp(car.y, 60, WORLD_H - 60);
    this.cars.push(car);
  }

  spawnEnemies(n, x, y, boss = false) {
    for (let i = 0; i < n; i++) {
      this.enemies.push({
        id: carId++,
        x: x + between(this.rng, -60, 60),
        y: y + between(this.rng, -60, 60),
        angle: 0,
        hp: boss ? 220 : 60,
        boss,
        speed: 70,
        shootCd: between(this.rng, 0.5, 1.5),
      });
    }
  }

  beginFightStage() {
    const m = this.mission();
    if (!m) return;
    if (m.id === 2) this.spawnEnemies(3, m.target.x, m.target.y);
    if (m.id === 5) {
      this.spawnEnemies(4, m.target.x, m.target.y);
      this.spawnEnemies(1, m.target.x, m.target.y, true);
    }
  }

  step(dt, input, events = {}) {
    if (!this.started) return 0;
    this.time += dt;
    const p = this.player;
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (p.crimeTimer < 999) p.crimeTimer += dt;
    if (p.wanted > 0 && p.crimeTimer > 25) {
      p.wanted -= 1;
      p.crimeTimer = 0;
      this.say('You lost the heat. Wanted level down.');
    }
    if (p.wanted > 0) {
      this.sirenTimer -= dt;
      if (this.sirenTimer <= 0) {
        this.sirenTimer = 2.5;
        this.spawnPolice();
        if (events.siren) events.siren();
      }
    }

    const drive = input.axis();
    if (p.inCar) {
      this.stepDriving(dt, input, drive, events);
    } else {
      this.stepWalking(dt, input, drive);
    }

    // --- shooting (on foot only) ---
    const wantsShot = input.takeShoot ? input.takeShoot() : false;
    if (wantsShot && p.ammo > 0 && !p.inCar) {
      p.ammo -= 1;
      const aim = input.aimAngle !== undefined ? input.aimAngle : p.angle;
      this.bullets.push({
        x: p.x + Math.cos(aim) * 20, y: p.y + Math.sin(aim) * 20,
        vx: Math.cos(aim) * 620, vy: Math.sin(aim) * 620,
        life: 0.7, from: 'player',
      });
      if (events.shoot) events.shoot();
    }

    this.stepBullets(dt, events);
    this.stepEnemies(dt, events);
    this.stepTraffic(dt, events);
    this.stepPeds(dt);
    this.stepPickups(events);
    this.stepMissions();

    if (p.hp <= 0) {
      this.screen = SCREEN_OVER;
      return EVENT_OVER;
    }
    return 0;
  }

  stepDriving(dt, input, drive, events) {
    const p = this.player;
    const car = p.inCar;
    const throttle = drive.y !== 0 ? -drive.y : 0; // W = forward
    car.speed += throttle * 260 * dt;
    car.speed *= (1 - 0.6 * dt);
    car.speed = clamp(car.speed, -90, car.maxSpeed + 60);
    if (Math.abs(car.speed) > 5) car.angle += drive.x * 1.9 * dt * Math.sign(car.speed);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.x = clamp(car.x, 30, WORLD_W - 30);
    car.y = clamp(car.y, 30, WORLD_H - 30);
    const hit = pushOutOfBuildings(this, car.x, car.y, 26);
    if (hit) {
      car.x = hit.x;
      car.y = hit.y;
      if (Math.abs(car.speed) > 120) {
        car.hp -= 12;
        if (events.hurt) events.hurt();
      }
      car.speed *= 0.4;
    }
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    p.speed = Math.abs(car.speed);
    if (car.hp <= 0) {
      this.say('Your car is wrecked!');
      this.leaveCar();
    } else if (input.takeAction && input.takeAction()) {
      this.leaveCar();
    }
  }

  stepWalking(dt, input, drive) {
    const p = this.player;
    const running = input.keys && input.keys.has('shift');
    const speed = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const len = Math.hypot(drive.x, drive.y) || 1;
    const moving = drive.x !== 0 || drive.y !== 0;
    let nx = p.x + (drive.x / len) * speed * dt * (moving ? 1 : 0);
    let ny = p.y + (drive.y / len) * speed * dt * (moving ? 1 : 0);
    if (moving) p.angle = Math.atan2(drive.y, drive.x);
    const hit = pushOutOfBuildings(this, nx, ny, PLAYER.radius);
    if (hit) { nx = hit.x; ny = hit.y; }
    p.x = clamp(nx, 20, WORLD_W - 20);
    p.y = clamp(ny, 20, WORLD_H - 20);
    p.speed = moving ? speed : 0;
    if (input.takeAction && input.takeAction()) this.enterCar();
    // Bank vault: hold E near the bank while the vault stage is active.
    const m = this.mission();
    if (m && m.id === 4 && this.missionStage === 'vault' && input.keys && input.keys.has('e')) {
      this.vaultProgress += dt;
      if (this.vaultProgress >= 3) this.finishMission();
    }
  }

  stepBullets(dt, events) {
    const p = this.player;
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
    this.bullets = this.bullets.filter((b) => b.life > 0 && b.x > 0 && b.y > 0 && b.x < WORLD_W && b.y < WORLD_H);
    for (const b of [...this.bullets]) {
      if (b.from !== 'player') continue;
      let spent = false;
      for (const e of this.enemies) {
        if (dist(e.x, e.y, b.x, b.y) < 18) {
          e.hp -= 25;
          b.life = 0;
          spent = true;
          if (e.hp <= 0) {
            this.stats.kills++;
            this.pickups.push({ x: e.x, y: e.y, kind: 'cash', amount: 80 });
          }
          break;
        }
      }
      if (spent) continue;
      for (const pd of this.peds) {
        if (dist(pd.x, pd.y, b.x, b.y) < 14) {
          pd.hp -= 25;
          pd.flee = 5;
          b.life = 0;
          spent = true;
          if (pd.hp <= 0) this.raiseWanted(1, 'You shot a civilian! Wanted up.');
          break;
        }
      }
      if (spent) continue;
      for (const c of this.cars) {
        if (c !== p.inCar && dist(c.x, c.y, b.x, b.y) < 28) {
          c.hp -= 20;
          b.life = 0;
          if (c.hp <= 0 && c.kind === 'police') this.raiseWanted(1, 'You wrecked a police car!');
          break;
        }
      }
    }
    this.enemies = this.enemies.filter((e) => e.hp > 0);
    // Enemy bullets hitting the player.
    for (const b of [...this.bullets]) {
      if (b.from === 'enemy' && dist(p.x, p.y, b.x, b.y) < (p.inCar ? 26 : 15)) {
        b.life = 0;
        p.hp -= 8;
        if (events.hurt) events.hurt();
      }
    }
  }

  stepEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      const d = dist(p.x, p.y, e.x, e.y);
      e.shootCd -= dt;
      if (d > 60) {
        e.angle = Math.atan2(p.y - e.y, p.x - e.x);
        e.x += Math.cos(e.angle) * e.speed * dt;
        e.y += Math.sin(e.angle) * e.speed * dt;
      }
      if (d < 420 && e.shootCd <= 0) {
        e.shootCd = e.boss ? 0.9 : 1.6;
        this.bullets.push({
          x: e.x, y: e.y,
          vx: Math.cos(e.angle) * 420, vy: Math.sin(e.angle) * 420,
          life: 1.1, from: 'enemy',
        });
      }
    }
  }

  stepTraffic(dt, events) {
    const p = this.player;
    for (const c of this.cars) {
      if (c.kind === 'police') {
        const d = dist(p.x, p.y, c.x, c.y);
        const want = Math.atan2(p.y - c.y, p.x - c.x);
        let da = want - c.angle;
        while (da > Math.PI) da -= TAU;
        while (da < -Math.PI) da += TAU;
        c.angle += clamp(da, -2.4 * dt, 2.4 * dt);
        c.speed = Math.min(c.maxSpeed, c.speed + 200 * dt);
        c.x += Math.cos(c.angle) * c.speed * dt;
        c.y += Math.sin(c.angle) * c.speed * dt;
        if (d < (p.inCar ? 34 : 24)) {
          if (p.inCar) {
            // Ram damage is throttled: 0.6 s per police car. An earlier build
            // applied it every frame and wrecked the player's car in seconds.
            c.ramCd = (c.ramCd || 0) - dt;
            if (c.ramCd <= 0) {
              c.ramCd = 0.6;
              c.hp -= 5;
              p.inCar.hp -= 8;
              if (p.inCar.hp <= 0) {
                this.say('Your car is wrecked!');
                this.leaveCar();
              }
            }
          } else {
            p.bustedTimer += dt;
            if (p.bustedTimer > 1.2) return this.busted();
          }
        } else {
          p.bustedTimer = Math.max(0, p.bustedTimer - dt);
        }
        if (p.wanted === 0 && d > 900) c.hp = 0;
      } else if (c !== p.inCar && !c.parked) {
        // Cruise the road grid; sometimes turn at an intersection.
        c.speed = Math.min(c.maxSpeed, c.speed + 60 * dt);
        const nx = c.x + Math.cos(c.angle) * c.speed * dt;
        const ny = c.y + Math.sin(c.angle) * c.speed * dt;
        const nearX = Math.abs(nx % BLOCK) < 40 || Math.abs(nx % BLOCK) > BLOCK - 40;
        const nearY = Math.abs(ny % BLOCK) < 40 || Math.abs(ny % BLOCK) > BLOCK - 40;
        if (nearX && nearY && this.rng() < 0.02) c.angle += (this.rng() < 0.5 ? 1 : -1) * Math.PI / 2;
        c.x = clamp(nx, 30, WORLD_W - 30);
        c.y = clamp(ny, 30, WORLD_H - 30);
        if (c.x <= 31 || c.x >= WORLD_W - 31 || c.y <= 31 || c.y >= WORLD_H - 31) c.angle += Math.PI / 2;
      }
    }
    this.cars = this.cars.filter((c) => c.hp > 0 || c === p.inCar);
    if (this.cars.filter((c) => c.kind === 'traffic').length < 10) {
      this.cars.push(newCar(this.rng, 'traffic', roadLine(1 + Math.floor(this.rng() * 6)), roadLine(1 + Math.floor(this.rng() * 5))));
    }
    return 0;
  }

  stepPeds(dt) {
    const p = this.player;
    for (const pd of this.peds) {
      if (pd.flee > 0) {
        pd.flee -= dt;
        const a = Math.atan2(pd.y - p.y, pd.x - p.x);
        pd.x += Math.cos(a) * 120 * dt;
        pd.y += Math.sin(a) * 120 * dt;
      } else {
        pd.x += Math.cos(pd.angle) * pd.speed * dt;
        pd.y += Math.sin(pd.angle) * pd.speed * dt;
        if (this.rng() < 0.005) pd.angle += (this.rng() - 0.5) * 2;
      }
      pd.x = clamp(pd.x, 20, WORLD_W - 20);
      pd.y = clamp(pd.y, 20, WORLD_H - 20);
    }
    this.peds = this.peds.filter((pd) => pd.hp > 0);
    while (this.peds.length < 18) this.peds.push(newPed(this.rng));
  }

  stepPickups(events) {
    const p = this.player;
    for (const pk of this.pickups) {
      if (dist(p.x, p.y, pk.x, pk.y) >= 30) continue;
      pk.taken = true;
      if (pk.kind === 'cash') {
        p.money += pk.amount;
        this.stats.cashEarned += pk.amount;
        this.say(`+$${pk.amount} cash.`);
        if (events.pickup) events.pickup();
      } else if (pk.kind === 'health') {
        p.hp = Math.min(100, p.hp + 40);
        this.say('Health restored.');
      } else if (pk.kind === 'ammo') {
        p.ammo += 30;
        this.say('+30 ammo.');
      }
    }
    this.pickups = this.pickups.filter((pk) => !pk.taken);
  }

  stepMissions() {
    const p = this.player;
    const m = this.mission();
    if (!m) return;
    const d = dist(p.x, p.y, m.target.x, m.target.y);
    if (m.id === 1 && this.missionStage === 'go' && p.inCar && d < 90) {
      this.finishMission();
    } else if (m.id === 2 && this.missionStage === 'go' && d < 110) {
      this.missionStage = 'fight';
      this.beginFightStage();
      this.say('Take out the dock thugs!');
    } else if (m.id === 2 && this.missionStage === 'fight' && this.enemies.length === 0) {
      this.pickups.push({ x: m.target.x + 40, y: m.target.y, kind: 'cash', amount: 250 });
      this.finishMission();
    } else if (m.id === 3 && this.missionStage === 'go' && d < 100) {
      this.missionStage = 'escape';
      this.raiseWanted(2, 'The cops are onto the pickup! Lose them!');
      this.say('Luna is in! Lose the cops, then reach the safehouse at the Harbor.');
    } else if (m.id === 3 && this.missionStage === 'escape' && p.wanted === 0 && dist(p.x, p.y, SAFEHOUSE.x, SAFEHOUSE.y) < 100) {
      this.finishMission();
    } else if (m.id === 4 && this.missionStage === 'go' && d < 90) {
      this.missionStage = 'vault';
      this.say('Hold E to crack the vault...');
    } else if (m.id === 4 && this.missionStage === 'escape' && d > 500) {
      this.finishMission();
    } else if (m.id === 5 && this.missionStage === 'go' && d < 120) {
      this.missionStage = 'fight';
      this.beginFightStage();
      this.say('Rico Vane is here. Take down his crew, then him!');
    } else if (m.id === 5 && this.missionStage === 'fight' && this.enemies.length === 0) {
      this.finishMission();
    }
  }

  finishMission() {
    const m = this.mission();
    if (!m) return;
    if (m.id === 4 && this.missionStage === 'vault') {
      // Vault cracked: the alarm trips, cash drops, now escape.
      this.raiseWanted(3, 'Alarm tripped! Wanted level 3!');
      this.pickups.push({ x: m.target.x, y: m.target.y, kind: 'cash', amount: 600 });
      this.missionStage = 'escape';
      this.say('Vault cracked! Grab the cash and escape!');
      return;
    }
    this.player.money += m.reward;
    this.stats.cashEarned += m.reward;
    this.stats.missionsDone += 1;
    this.say(`Mission complete: ${m.name} +$${m.reward}`, 5);
    this.missionIndex += 1;
    this.missionStage = 'go';
    this.vaultProgress = 0;
    if (this.missionIndex >= MISSIONS.length) {
      this.screen = SCREEN_WIN;
    } else {
      const next = this.mission();
      this.say(`New mission: ${next.name} — ${next.text}`, 6);
    }
  }

  enterCar() {
    const p = this.player;
    let best = null;
    let bestD = 70;
    for (const c of this.cars) {
      const d = dist(c.x, c.y, p.x, p.y);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (!best) return;
    p.inCar = best;
    best.speed = 0;
    best.parked = false;
    if (best.kind === 'traffic') {
      best.kind = 'player';
      this.stats.carsStolen += 1;
      this.raiseWanted(1, 'You stole a car! Wanted level 1.');
      this.say('Car stolen. Drive with WASD. E to get out.');
    } else {
      this.say('In the car. Drive with WASD.');
    }
  }

  leaveCar() {
    const p = this.player;
    if (!p.inCar) return;
    const car = p.inCar;
    p.inCar = null;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
  }

  busted() {
    const p = this.player;
    const fine = Math.min(p.money, 200);
    p.money -= fine;
    p.wanted = 0;
    p.hp = 100;
    p.bustedTimer = 0;
    this.cars = this.cars.filter((c) => c.kind !== 'police');
    if (p.inCar) p.inCar = null;
    // Dropped at the precinct — a road intersection, never inside a block.
    p.x = SPAWN.x;
    p.y = SPAWN.y;
    this.say(`BUSTED! You paid $${fine} and were dropped at the precinct.`, 5);
    return 0;
  }

  save() {
    try {
      localStorage.setItem('solmar-heat-save', JSON.stringify({
        money: this.player.money,
        missionsDone: this.missionIndex,
        hp: this.player.hp,
        ammo: this.player.ammo,
        stats: this.stats,
      }));
      return true;
    } catch {
      return false;
    }
  }

  load() {
    try {
      const s = JSON.parse(localStorage.getItem('solmar-heat-save') || 'null');
      if (!s) return false;
      this.player.money = s.money;
      this.player.hp = s.hp;
      this.player.ammo = s.ammo;
      this.missionIndex = s.missionsDone || 0;
      this.stats = s.stats || this.stats;
      return true;
    } catch {
      return false;
    }
  }
}
