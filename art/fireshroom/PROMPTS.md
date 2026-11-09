# Fireshroom generation prompts

Tool: built-in image_gen. All six calls used transparent_background=true. Character poses use the supplied GIF contact sheet and the ready sprite as references; flame variants use frame 1 as their edit target.

## Ready / idle

Use case: stylized-concept.
Asset type: one standalone transparent READY/IDLE plant sprite for a game, Fireshroom.
Input images: Image 1 is a contact sheet extracted from the user's Fireshroom GIF. It shows the SAME plant through attack and recharge states. Use its TOP-LEFT ready pose as the character design reference. Image 2 is an existing plant from the game; use Image 2 ONLY for the polished cartoon paint treatment and outline/shading language, NOT its mushroom anatomy or purple color.
Subject: faithfully recreate Fireshroom's distinctive red-orange three-lobed flared mushroom cap: a tall backward-swept upper-left lobe and lower flared left/right lobes, big pale warm cream oval spots, deep red cap undersides; a compact creamy tan stem-body with two large expressive eyes, determined black eyebrows, a small circular O-shaped shooter mouth facing RIGHT, and the same short red rounded fleshy base lobes from the GIF.
Style: original game-ready rich 2D painted cartoon, confident dark burgundy outlines, rounded soft cel shading, crisp warm highlights, friendly rather than scary. Keep the distinctive silhouette, cap arrangement, eye placement, mouth position and red base from the reference; do not redesign it as Mooshoom.
Composition: exactly ONE full character, three-quarter side view facing RIGHT, centered on a square canvas, occupies about 85% of the canvas, all cap tips and base visible, feet baseline at about 92% height. Preserve open transparent space in upper-right, beside the tall left cap, for a future floating question mark. This is the canonical pose to match subsequent attack and recharge sprites.
Constraints: genuinely transparent background with alpha. No lawn, no ground patch, no scenery, no UI, no labels, no caption, no watermark, no drop-shadow platform. No fire, smoke, embers, question mark or detached projectile in the idle sprite. No green leaves. Only the plant.

## Fire frame 1

Use case: stylized-concept.
Asset type: standalone transparent Fireshroom FIRE EFFECT, animation frame A; no character.
Input image: the Fireshroom GIF contact sheet is a visual reference for the flame color, cartoon style and right-facing stream in its top-row third/fourth panels.
Primary request: one broad continuous tongue of fire projected horizontally from LEFT to RIGHT, for a mushroom plant breathing fire across TWO adjacent lawn tiles in a side-view cartoon lane-defense game. Narrow rounded emission root at the left-center, opening into a wide lively stream with two or three sweeping flame tongues and a few small integrated sparks toward the right. Bright pale yellow core, golden yellow middle, saturated orange edge and a clean dark red-orange outer outline consistent with the reference. It must read as an area-covering sustained fire breath, not a ball projectile, explosion, smoke cloud or fire icon.
Composition: wide approximately 2:1 transparent canvas, one horizontal stream centered vertically, occupies 88% width and about 65% height, complete flame silhouette inside the canvas, root at 6% from left and at 55% height. Crisp clean game sprite edges at small scale. No drawn tile boundary, no environment, no grass, no character, no text, no label, no background glow rectangle. Genuine transparency around and between flame edges. This frame will be matched by two further animation variants; use a balanced silhouette with a clearly identifiable fixed left emission root.

## Firing pose

Use case: precise-object-edit.
Edit target: Image 1 is the canonical Fireshroom READY sprite. Image 2 is the user's original GIF contact sheet, provided as an expression reference for its top-row firing frames.
Create exactly one FIRING pose of Image 1, retaining the same character identity, THREE red cap lobes, cream oval spots, base lobes, exact framing, canvas dimensions, scale, base/feet anchor and overall silhouette.
Change ONLY the facial expression and firing cues: the round shooter mouth opens a little wider and glows hot golden-orange inside, cheeks slightly puffed, determined focused eyes and brows, subtle warm reflected fire light on the cream face and nearest red cap underside. Keep the mouth's center in exactly the same location as Image 1 so a separate flame effect can attach seamlessly. Do not move the character's body or base. This state must be clearly actively exhaling fire.
Important: DO NOT paint a flame plume, fireball, detached embers or beam outside the mouth; all sustained fire is a separate asset. No question mark. No green leaves.
Genuine transparent background with alpha, no lawn, no scenery, no ground patch, no label, no text, no watermark. Same polished vibrant 2D cartoon style, burgundy outlines and rich cel shading as Image 1.

## Tired recharge pose

Use case: precise-object-edit.
Edit target: Image 1 is the canonical Fireshroom READY sprite. Image 2 is the user's original GIF contact sheet; its bottom-row middle panels show the required tired/question-mark state.
Create exactly one RECHARGING pose of Image 1 for the five-second period after an attack. Lock character identity, THREE red cap lobes, cream oval cap spots, red fleshy base lobes, framing, scale, transparent canvas size and exact base/feet anchor to Image 1.
Change the FACE to visibly tired and unable to attack: both eyelids closed/drooping, eyebrows angled in exhausted resignation, a small slack open mouth with a dark unlit interior, slightly sagging expression, relaxed cheeks. Preserve the body and cap silhouette rather than moving or shrinking the whole character.
Add ONE large highly readable golden-yellow QUESTION MARK with a warm dark orange outline floating in the existing empty upper-RIGHT area above the low right cap lobe, to the right of the tall left cap lobe, matching the GIF. Keep the whole question mark and its dot inside the existing canvas. The question mark should be legible even when the sprite is reduced to a lawn tile.
No flames, no attack glow, no fireball, no sparks, no speech bubble, no green leaves, no new props. Only the SAME tired plant and the single ? symbol. Genuine transparent alpha background, no lawn, no scenery, no text other than ?, no watermark. Same polished 2D cartoon rendering as Image 1.

## Fire frame 2

Use case: precise-object-edit.
Edit target: the supplied transparent Fireshroom horizontal FIRE EFFECT frame A.
Create animation frame B of this SAME flame stream. Preserve its exact wide canvas dimensions, left-to-right direction, scale, fixed LEFT emission-root coordinate, bright pale-yellow core, golden yellow middle, orange edging, dark red-orange outlines and genuine alpha transparency.
Make a controlled flicker variation: gently lift the upper central flame tongue, curl the rightmost upper tip downward, and bend the lower-right tongue slightly upward. Small sparks may shift slightly near the existing tips. Keep total length and occupied height effectively unchanged so this can loop with frame A while covering the same two lawn tiles. The narrow left emission root MUST stay at the same pixel position and size.
No character, no background, no ground or grid, no new objects, no letters, no label, no watermark. Crisp game sprite, not an explosion or ball projectile.

## Fire frame 3

Use case: precise-object-edit.
Edit target: the supplied transparent Fireshroom horizontal FIRE EFFECT frame A.
Create animation frame C of this SAME flame stream. Preserve its exact wide canvas dimensions, left-to-right direction, scale, fixed LEFT emission-root coordinate, pale-yellow core, golden yellow middle, saturated orange edge, dark red-orange outlines and genuine alpha transparency.
Make another controlled flicker phase: let the central flame tongue dip gently, let the top-right tongue flare slightly upward and split into a small fork, and let the lower tip curl outward. Shift only the flame's internal waves and the small existing sparks. Keep overall occupied length and height effectively unchanged for a stable loop covering two lawn tiles. The narrow left emission root MUST stay at the same pixel position and size.
No character, no background, no ground or grid, no new objects, no letters, no labels, no watermark. Crisp cartoon game sprite, not an explosion or fireball.

