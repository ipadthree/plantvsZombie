# Backyard Brigade

![Backyard Brigade game preview](public/og.png)

Backyard Brigade is a browser-based lane-defense game set in a cartoon version of our family front yard. Build a defense across a 5 × 9 lawn, collect falling sun, and survive three waves of shamblers with a growing roster of custom plants.

## Play the game

**Live game:** [backyard-brigade.three2333.chatgpt.site](https://backyard-brigade.three2333.chatgpt.site/)

The game runs entirely in the browser. Music may begin after the first click or key press because browsers block autoplay until the player interacts with the page.

## Gameplay

- Spend sun to place plants on the 5 × 9 lawn.
- Projectile plants automatically attack zombies in their lane after the zombies enter the playable lawn.
- Collect falling sun tokens to fund more plants.
- Any zombie reaching the house-side edge immediately ends the game with “zombie ate your brain”.
- Clear all three waves to secure the yard.

### Difficulty modes

Use the mode bar at the top of the game to choose a difficulty. Each option has a plant expression icon: relaxed for Easy, tense for Hard, and sweating for Crazy. Switching modes starts a fresh game; restarting after a win or loss keeps the selected mode.

| Mode | Wave 1 (regular / log) | Wave 2 (regular / log) | Wave 3 (regular / log) | Total |
| --- | --- | --- | --- | ---: |
| Easy · 1× | 12 / 0 | 12 / 5 | 12 / 7 | 48 |
| Hard · 2× | 24 / 0 | 24 / 10 | 24 / 14 | 96 |
| Crazy · 4× | 48 / 0 | 48 / 20 | 48 / 28 | 192 |

Difficulty changes zombie quantity. Hard and Crazy expand each Easy encounter into groups of two or four across different lanes, preserving the existing encounter timing and health progression. Plant stats, zombie stats, and sun rules stay the same.

### Plants

| Plant | Cost | Health | Role |
| --- | ---: | ---: | --- |
| Sprout Scout | 100 | 100 | Fires one fast pea for 25 damage. |
| Stone Shooter | 125 | 150 | Fires two rocks per volley, each dealing 22 damage. |
| Stone Plant | 150 | 125 | Swallows the nearest zombie in range, then digests for 5 seconds. |
| Watermelon Plant | 200 | 250 | Fires two watermelon slices, each dealing 37.5 damage (1.5× pea damage). |
| Mooshoom | 0 | 25 | Fires purple peas for 6.25 damage (¼ pea damage) at zombies less than 5 tiles ahead. Hits slow movement by 50% for 3 seconds; repeat hits refresh the effect. |
| Fireshroom | 200 | 100 | Burns every zombie less than two tiles ahead for 3 seconds (75 total damage per target, matching a watermelon volley), then rests for 5 seconds with a tired face and question mark. |

### Zombies and waves

| Enemy | Base health | Speed | Behavior |
| --- | ---: | ---: | --- |
| Pothead Shambler | 250 | 100% | Walks down a lane and bites plants on contact. |
| Log Zombie | 500 | 80% | Appears from wave 2 and swings its log at plants. |

In Easy mode, each wave contains 12 Pothead Shamblers. Wave 2 adds 5 Log Zombies, and wave 3 adds 7, for 48 enemies across the full game. Later encounters receive a small health increase; the same curve applies in every mode. Both base health and encounter health bonuses have been doubled, so every spawned zombie has twice its previous total health in all three modes.

## Controls

| Input | Action |
| --- | --- |
| `1`–`6` | Select a plant card (Mooshoom is `5`, Fireshroom is `6`) |
| Click a plant card | Select or deselect that plant |
| Click a lawn tile | Place the selected plant |
| Click a sun token | Collect sun |
| `Esc` | Clear the current plant selection |
| `Space` | Pause or resume |
| `R` | Restart after winning or losing |
| Music button | Mute or resume the background music |
| Easy / Hard / Crazy | Start a fresh game in that difficulty |

## Tech architecture

The project is a client-side React and TypeScript game organized with the Next.js App Router conventions and run through Vinext/Vite. It is packaged for an OpenAI Sites/Cloudflare-compatible deployment.

```text
app/
├── game/
│   ├── Game.tsx       # Game clock, simulation, input, waves, combat, and rendering
│   ├── catalog.ts     # Data-driven plant and zombie definitions
│   ├── combat.ts      # Target ranges, projectile limits, and temporary slows
│   ├── difficulty.ts  # Difficulty multipliers, wave quotas, and spawn groups
│   └── types.ts       # Definition and entity contracts
├── globals.css        # Board layout, responsive UI, and character animations
├── layout.tsx         # Page metadata and document shell
└── page.tsx           # Game entry point
public/
└── assets/             # Yard, character, animation-frame, and music assets
```

The simulation uses a 50 ms game tick. Runtime entities are stored as React state, while character balance and asset paths live in registries so new plants and zombies can be added without duplicating UI code. Plant behaviors use a discriminated `attackMode` (`projectile` or `devour`), and projectiles carry their own damage, speed, and visual kind.

For a deeper design overview and extension notes, see [GAME_ARCHITECTURE.md](GAME_ARCHITECTURE.md).

## Run locally

### Requirements

- Node.js 22.13.0 or newer
- npm

### Development

```bash
git clone https://github.com/ipadthree/plantvsZombie.git
cd plantvsZombie
npm install
npm run dev
```

Open the local URL printed in the terminal. The development server supports hot reloading.

### Production build

```bash
npm run build
npm run start
```

Run the project checks with:

```bash
npm test
npx tsc --noEmit
npm run lint
```

The tests verify exact wave quotas, spawn timing and health parity, cumulative victory totals, Mooshoom's strict range limit, and slow refresh/expiry behavior.

## Add custom characters

1. Add the transparent character artwork to `public/assets/`.
2. Add its ID and data contract to `app/game/types.ts`.
3. Register its stats, behavior, and asset paths in `app/game/catalog.ts`.
4. Add the plant to the seed bar or the zombie to the wave configuration in `app/game/Game.tsx`.
5. Add CSS only when the character needs a new size, anchor, projectile, or animation treatment.

The artwork and audio included here are project assets for this family game; this repository does not grant a separate license for their reuse.
