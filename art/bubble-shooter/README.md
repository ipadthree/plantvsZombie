# Bubble Shooter artwork

The user reviewed and approved the normal and extended anti-air concepts made with the built-in `image_gen` tool from their hand drawing. Review prompts are preserved in `review-prompts.json`; production sprite-cleanup prompts are in `integration-prompts.json`.

- `normal.png`: approved plant with fired bubbles removed; the rear bubble-pod appendage stays attached.
- `anti-air.png`: matching plant with its upper segmented stalk extended and no baked-in fired bubbles.

Runtime WebPs and a cropped card icon with transparent padding live in `public/assets/bubble-shooter/`. Projectiles are separate iridescent CSS bubbles driven by game time. Sprites fit the plant's height and anchor their roots at the same baseline; the extended image displays 1.5× the normal image height, keeping the main body stable while raising the upper shooter.

Bubble Shooter costs 100 sun, has 100 HP, and deals 25 damage per bubble. Its 1250/3 ms fire period preserves fractional timing on the 50 ms simulation clock. The future-facing `airborne` enemy flag selects its extended pose and air-only bubble trajectory; all current enemy definitions remain ground based.
