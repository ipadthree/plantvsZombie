# Boss Zombie artwork

Made with the built-in `image_gen` tool using the user's `tnt_imp_zombie.gif` and the existing Log Zombie as style references. Exact prompts are in [prompts.json](prompts.json).

Original transparent RGBA PNGs:

- `ready.png`: three backpack Imps and two held TNT bundles.
- `tnt-empty.png`: Imps loaded, hands empty.
- `imps-empty.png`: TNT loaded, backpack rack empty.
- `recharging.png`: hands and rack empty.
- `imp.png`: standalone walking Imp.
- `tnt.png`: isolated lit TNT projectile.

Optimized runtime WebPs are in `public/assets/boss-zombie/`. The game animates walking, throwing, two TNT arcs, three Imp launch arcs, and blast flashes using game time. The boss is 2× normal zombie display size with the highest zombie layer; collision ranges and stats are independent of the artwork size.
