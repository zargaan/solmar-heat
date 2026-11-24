// Solmar Heat — canvas rendering: the city, cars, people, mission marker,
// waypoint arrow, title / WASTED / win screens, and the minimap.
import { WORLD_W, WORLD_H, BLOCK, ROAD_W, PALETTE, VIEW_W, VIEW_H } from './config.js';
import { SCREEN_TITLE, SCREEN_OVER, SCREEN_WIN } from './world.js';

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCar(ctx, x, y, angle, color, isPolice) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rounded(ctx, -28, -15, 56, 30, 6);
  ctx.fill();
  ctx.fillStyle = color;
  rounded(ctx, -27, -14, 54, 28, 7);
  ctx.fill();
  ctx.fillStyle = '#bfe3ff';
  rounded(ctx, -6, -11, 16, 22, 3);
  ctx.fill();
  ctx.fillStyle = isPolice ? '#d23b3b' : '#222';
  ctx.fillRect(24, -12, 4, 8);
  ctx.fillRect(24, 4, 4, 8);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(-28, -12, 3, 6);
  ctx.fillRect(-28, 6, 3, 6);
  if (isPolice) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 3);
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, shirt, skin, isBoss) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.arc(0, 2, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(7, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  if (isBoss) {
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function render(ctx, world, cam) {
  const W = VIEW_W;
  const H = VIEW_H;
  const ox = cam.x;
  const oy = cam.y;

  // Ground and beach / water along the south edge.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(-ox, 2080 - oy, WORLD_W, 120);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(-ox, 2200 - oy, WORLD_W, 200);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SOLMAR BEACH', 2100 - ox, 2180 - oy);

  // Palm Park.
  ctx.fillStyle = PALETTE.park;
  ctx.fillRect(440 - ox, 440 - oy, 320, 320);
  ctx.fillStyle = '#2a5c2e';
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.arc(470 + ((i * 53) % 280) - ox, 470 + Math.floor(i / 5) * 90 - oy, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PALM PARK', 500 - ox, 600 - oy);

  // Roads: verticals then horizontals, with centre dashes.
  ctx.fillStyle = PALETTE.road;
  for (let i = 0; i <= WORLD_W / BLOCK; i++) ctx.fillRect(i * BLOCK - ROAD_W / 2 - ox, -oy, ROAD_W, WORLD_H);
  for (let j = 0; j <= WORLD_H / BLOCK; j++) ctx.fillRect(-ox, j * BLOCK - ROAD_W / 2 - oy, WORLD_W, ROAD_W);
  ctx.fillStyle = PALETTE.lane;
  for (let i = 0; i <= WORLD_W / BLOCK; i++) {
    for (let y = 0; y < WORLD_H; y += 60) ctx.fillRect(i * BLOCK - 2 - ox, y - oy, 4, 28);
  }
  for (let j = 0; j <= WORLD_H / BLOCK; j++) {
    for (let x = 0; x < WORLD_W; x += 60) ctx.fillRect(x - ox, j * BLOCK - 2 - oy, 28, 4);
  }

  // District labels.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DOWNTOWN', 1200 - ox, 500 - oy);
  ctx.fillText('HARBOR', 600 - ox, 1700 - oy);
  ctx.fillText('OLD TOWN', 400 - ox, 200 - oy);
  ctx.fillText('INDUSTRIAL', 2600 - ox, 200 - oy);

  // Buildings, skipping anything off-screen.
  for (const b of world.buildings) {
    if (b.x + b.w < ox - 50 || b.x > ox + W + 50 || b.y + b.h < oy - 50 || b.y > oy + H + 50) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(b.x - ox + 6, b.y - oy + 8, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - ox, b.y - oy, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let wx = b.x + 10; wx < b.x + b.w - 14; wx += 26) {
      for (let wy = b.y + 10; wy < b.y + b.h - 14; wy += 26) ctx.fillRect(wx - ox, wy - oy, 14, 14);
    }
  }

  // Pulsing mission marker.
  const mk = world.marker();
  if (mk && world.mission()) {
    const pulse = 1 + 0.15 * Math.sin(world.time * 5);
    ctx.save();
    ctx.translate(mk.x - ox, mk.y - oy);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,215,0,0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(10, 10);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Pickups.
  for (const pk of world.pickups) {
    ctx.fillStyle = pk.kind === 'cash' ? '#2fae5f' : pk.kind === 'health' ? '#e84c4c' : '#e8c832';
    ctx.beginPath();
    ctx.arc(pk.x - ox, pk.y - oy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'cash' ? '$' : pk.kind === 'health' ? '+' : 'A', pk.x - ox, pk.y - oy + 4);
  }

  // People, enemies (with health bars), cars, bullets, player.
  for (const pd of world.peds) drawPerson(ctx, pd.x - ox, pd.y - oy, pd.angle, pd.shirt, pd.skin, false);
  for (const e of world.enemies) {
    drawPerson(ctx, e.x - ox, e.y - oy, e.angle, '#3a0d16', '#d2a679', e.boss);
    ctx.fillStyle = '#e84c4c';
    ctx.fillRect(e.x - ox - 14, e.y - oy - 24, 28 * Math.max(0, e.hp / (e.boss ? 220 : 60)), 4);
  }
  for (const c of world.cars) drawCar(ctx, c.x - ox, c.y - oy, c.angle, c.color, c.kind === 'police');
  ctx.fillStyle = '#ffe9a8';
  for (const b of world.bullets) {
    ctx.beginPath();
    ctx.arc(b.x - ox, b.y - oy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = world.player;
  if (!p.inCar) drawPerson(ctx, p.x - ox, p.y - oy, p.angle, '#1d6fb8', '#e8b88a', false);

  // Waypoint arrow at the screen edge when the marker is far away.
  if (mk) {
    const dx = mk.x - p.x;
    const dy = mk.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 320) {
      const a = Math.atan2(dy, dx);
      const ax = W / 2 + Math.cos(a) * 260;
      const ay = H / 2 + Math.sin(a) * 190;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(a);
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, -10);
      ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(d)}m`, ax, ay + 26);
    }
  }

  // Full-screen overlays.
  if (world.screen === SCREEN_TITLE) {
    ctx.fillStyle = 'rgba(10,10,25,0.72)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SOLMAR HEAT', W / 2, 220);
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.fillText('An open-world crime game in Solmar Bay', W / 2, 265);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#cfe3ff';
    ctx.fillText('Luna and Dex are back in town — and the whole city is up for grabs.', W / 2, 310);
    ctx.fillText('WASD move / drive  •  E steal a car  •  Mouse aim, click to shoot  •  P pause  •  S save', W / 2, 350);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('Press ENTER to start', W / 2, 420);
    ctx.fillStyle = '#9fb3c8';
    ctx.font = '15px sans-serif';
    ctx.fillText('5 story missions  •  Wanted levels  •  Police chases  •  Traffic & pedestrians', W / 2, 460);
    ctx.fillText('A completely original game. No Rockstar content.', W / 2, 490);
  }
  if (world.screen === SCREEN_OVER) {
    ctx.fillStyle = 'rgba(120,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WASTED', W / 2, 320);
    ctx.font = '20px sans-serif';
    ctx.fillText('Press R to restart from the last mission', W / 2, 370);
  }
  if (world.screen === SCREEN_WIN) {
    ctx.fillStyle = 'rgba(10,40,10,0.72)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KING OF SOLMAR', W / 2, 300);
    ctx.fillStyle = '#fff';
    ctx.font = '22px sans-serif';
    ctx.fillText(`All 5 missions done. $${world.player.money} in the bank. The city is yours.`, W / 2, 350);
    ctx.fillText('Press R to play again', W / 2, 395);
  }
}

export function renderMinimap(ctx, world) {
  const mw = 200;
  const mh = 150;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;
  ctx.fillStyle = 'rgba(10,14,20,0.85)';
  ctx.fillRect(0, 0, mw, mh);
  ctx.fillStyle = '#3f7a44';
  ctx.fillRect(0, 0, mw, mh);
  ctx.fillStyle = '#1e6f9e';
  ctx.fillRect(0, mh - 20, mw, 20);
  ctx.fillStyle = '#2b2f36';
  for (let i = 0; i <= WORLD_W / BLOCK; i++) ctx.fillRect(i * BLOCK * sx - 2, 0, 4, mh);
  for (let j = 0; j <= WORLD_H / BLOCK; j++) ctx.fillRect(0, j * BLOCK * sy - 2, mw, 4);
  const mk = world.marker();
  if (mk) {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(mk.x * sx, mk.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const c of world.cars) {
    if (c.kind !== 'police') continue;
    ctx.fillStyle = '#4aa8ff';
    ctx.fillRect(c.x * sx - 2, c.y * sy - 2, 4, 4);
  }
  const p = world.player;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(p.x * sx, p.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, mw - 1, mh - 1);
}
