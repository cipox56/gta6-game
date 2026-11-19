[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/cipox56/gta6-game/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/cipox56/gta6-game/reward.svg)](https://make.fun/bounty/gta6-01)

# Neon Bay Heist

An original open-world crime game in the browser, built for the [Make GTA 6](https://make.fun/bounty/gta6-01) bounty on make.fun. A fan-made original — not affiliated with Rockstar Games.

You are Dash Cole, a wheelman new to Neon Bay, a sun-soaked coastal city. Drive and walk its streets, steal cars, run eight story missions for your fixer Rosa, outrun Detective Hale and the Neon Bay police, and pull off the big bank score.

## Play

Serve `game/` with any static server and open `game/index.html`, or run:

```sh
node serve.ts
```

then open http://localhost:8080.

## Controls

- **WASD / Arrows** — move on foot, drive in a car
- **E** — enter / steal a car, exit a car; on foot near Rosa's Garage, open the upgrade shop
- **Space** — punch on foot, handbrake while driving
- **Shift** — run
- **Q** — change radio station (NEON FM / BAY BEATS / TALK 101)
- **P** — pause, **M** — mute, **R** — restart, **Enter** — start / confirm

## Features

- Open city to explore on foot and by car: roads, buildings, parks, beach and marina
- Traffic cars and pedestrians, cars to steal and drive — three vehicle classes: Sedan, Sports (fast, fragile) and Van (slow, tough)
- Wanted level (0–5 stars) with police pursuit cars, sirens and ramming
- Police helicopter air support at 4-5 stars: a searchlight tracks you and your wanted level stops cooling down while it is overhead
- Police roadblocks at 3+ stars: two police cars park across the road ahead of you
- Eight story missions: deliveries, getaways, fares, a checkpoint street race, smashing police cars, a chase and a bank heist
- Rosa's Garage shop (press E on foot near the garage): engine and armor upgrades, grip tires, and a clean-record bribe — all bought with mission cash
- Respect (0–5): finishing missions earns respect; at Respect 2 a sports car waits at the marina, at Respect 3 the top engine tune unlocks
- Day/night cycle: the clock advances as you play; at night the city goes neon — lit windows, streetlight glow and headlight cones
- Three radio stations (Q to cycle): NEON FM synthwave, BAY BEATS funk, TALK 101
- HUD with cash, health, wanted stars, respect, radio station, clock, mission timer and a live minimap
- Combat (punch), particles, skid marks, synthesized WebAudio sound and music
- Save / continue via local storage, pause, mute, restart, win and game-over states

## Tech

Vanilla JavaScript + Canvas + WebAudio, zero libraries, zero network requests. The game is plain static files under `game/`; `main.ts` copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json`.

## License

MIT — see [LICENSE](LICENSE).
