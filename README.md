[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/zargaan/solmar-heat/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/zargaan/solmar-heat/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solmar Heat — Make GTA 6 (make.fun bounty gta6-01)

An original open-world crime game in the fictional city of **Solmar Bay**, playable offline in a desktop browser from static files. No Rockstar content: the city, characters (Luna, Dex, boss Rico Vane), vehicles, story, art and sound are all original.

## How to play

Serve the game and open it in desktop Chrome:

```
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` via any static server. No network requests are made.

- **WASD / arrows** — move on foot, drive when in a car (Shift to run)
- **E** — steal / enter a car, get out, crack the bank vault (hold E)
- **Mouse aim + click / Space / F** — shoot
- **P** pause, **M** mute, **S** save (save persists in localStorage)

## What's in the game

- A 3200×2400 city: Downtown, Harbor, Beachside, Old Town, Industrial, Palm Park, Solmar Beach
- On foot and by car, with traffic cars driving the road grid and pedestrians on the streets
- Cars to steal (stealing raises your wanted level), police cars that chase and ram you
- Wanted level 0–5 with stars, decay when you lay low, BUSTED if police catch you on foot
- 5 story missions with markers, waypoint arrow and rewards ($150–$2,500):
  1. First Wheels, 2. Payback at the Docks, 3. Getaway Driver, 4. The Solmar Bank, 5. King of Solmar
- Combat: pistol, enemies that shoot back, health/ammo/cash pickups, WASTED screen
- HUD: money, health bar, wanted stars, mission objective, speed, messages, live minimap
- Start screen, pause, save/load, synthesized WebAudio sound (engine, sirens, gunshots, jingles) — no audio files
- Deterministic screenshot scenes: `game/index.html?shot=start|play|end&seed=1`

## Layout

- `main.ts` — Node 22 program that hands the entry in (copies `game/` + `screenshots/`, writes `dossier.json` via `vendor/makefun-game.ts`)
- `vendor/makefun-game.ts` — copied from the bounty kit, unchanged
- `game/` — the playable game: `index.html` + ES modules under `game/src/` (config, world, render, input, audio, shots, main)
- `screenshots/` — 3 real renders of the game's own code (start, play, end)
- `serve.ts` — tiny static server for local play-testing

## Verification

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/dossier.json
node serve.ts                                          # play at http://localhost:8080
```

## Recording status

This build was written in a fresh agent session that started after the kit's `record` command was already running (recording 01a20b00-12c3-744a-ae7a-851b26b6d274, started 2026-11-24T00:41:00Z), so the transcripts of this rebuild are witnessed by that recording. The recording must be sealed with `makefun record --stop` before the entry is submitted. Repo/push/submit goes via the local route; see `heartbeat.json`.
