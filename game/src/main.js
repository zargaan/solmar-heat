// Solmar Heat — entry point: the game loop, HUD, pause, save/load keys,
// and the deterministic screenshot mode (?shot=... renders one frame).
import { WORLD_W, WORLD_H, VIEW_W, VIEW_H, TICK } from './config.js';
import { World, SCREEN_TITLE, SCREEN_OVER, SCREEN_WIN, SCREEN_PLAY } from './world.js';
import { render, renderMinimap } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const mini = document.getElementById('minimap');
const miniCtx = mini ? mini.getContext('2d') : null;
const $ = (id) => document.getElementById(id);
const world = new World(1);
const input = createInput(canvas);
const audio = createAudio();
const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
let paused = false;
let last = performance.now();
let acc = 0;

function stars(n) {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
}

function updateHUD() {
  const p = world.player;
  const m = world.mission();
  if ($('money')) $('money').textContent = `$${p.money}`;
  if ($('health')) $('health').style.width = `${Math.max(0, p.hp)}%`;
  if ($('ammo')) $('ammo').textContent = `Ammo ${p.ammo}`;
  if ($('wanted')) $('wanted').textContent = stars(p.wanted);
  if ($('speed')) {
    $('speed').textContent = p.inCar
      ? `${Math.round(Math.abs(p.inCar.speed) * 0.36 * 10) / 10} km/h — in car (E to exit)`
      : 'On foot — E near a car to steal it';
  }
  if ($('objective')) $('objective').textContent = m ? `Mission ${m.id}/5: ${m.name} — ${m.text}` : 'All missions complete!';
  if ($('message')) $('message').textContent = world.message;
  if ($('status')) $('status').textContent = `Solmar Heat — ${m ? m.name : 'Free roam'} — Wanted ${p.wanted} — $${p.money}`;
  if (miniCtx) renderMinimap(miniCtx, world);
}

function camera() {
  const p = world.player;
  return {
    x: Math.max(0, Math.min(WORLD_W - VIEW_W, p.x - VIEW_W / 2)),
    y: Math.max(0, Math.min(WORLD_H - VIEW_H, p.y - VIEW_H / 2)),
  };
}

function frame(now) {
  requestAnimationFrame(frame);
  if (paused) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  acc += dt;
  // Aim from the player to the mouse position in world space.
  const cam = camera();
  input.aimAngle = Math.atan2(
    (input.mouseY + cam.y) - world.player.y,
    (input.mouseX + cam.x) - world.player.x,
  );
  while (acc >= TICK) {
    world.step(TICK, input, {
      shoot: () => audio.shoot(),
      hurt: () => audio.hurt(),
      pickup: () => audio.pickup(),
      siren: () => audio.siren(),
    });
    acc -= TICK;
  }
  audio.engine(world.player.inCar ? Math.min(1, Math.abs(world.player.inCar.speed) / 300) : 0);
  render(ctx, world, camera());
  updateHUD();
}

window.addEventListener('keydown', (e) => {
  audio.unlock();
  const k = e.key.toLowerCase();
  if (k === 'enter' && world.screen === SCREEN_TITLE) {
    world.started = true;
    world.screen = SCREEN_PLAY;
    world.say('Mission 1: First Wheels — steal a car!');
  }
  if (k === 'r' && (world.screen === SCREEN_OVER || world.screen === SCREEN_WIN)) {
    world.reset();
    world.started = true;
    world.screen = SCREEN_PLAY;
  }
  if (k === 'p') {
    paused = !paused;
    world.say(paused ? 'Paused. Press P to resume.' : 'Resumed.');
  }
  if (k === 'm') {
    const muted = audio.toggleMute();
    world.say(muted ? 'Sound off.' : 'Sound on.');
  }
  if (k === 's' && world.save()) world.say('Game saved.');
});
canvas.addEventListener('mousedown', () => audio.unlock());

if (shotName) {
  // Deterministic screenshot: stage the scene, render one frame, no live loop.
  stageShot(shotName, world);
  render(ctx, world, camera());
  updateHUD();
  document.title = `Solmar Heat — shot ${shotName}`;
} else {
  const loaded = world.load();
  if (loaded) world.say(`Save loaded: ${world.stats.missionsDone} mission(s) done, $${world.player.money}. Press ENTER to start.`);
  render(ctx, world, camera());
  updateHUD();
  requestAnimationFrame(frame);
}

// Exposed for live play-testing (drive it from the console / Playwright).
window.__solmar = world;
export { world };
