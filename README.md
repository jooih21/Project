# Chaos Kitty House (Web MVP)

A browser game prototype built with Phaser 3 (CDN) and modular JavaScript.

## Run

Use any static server from the project root.

- Python: `python -m http.server 8080`
- Then open: `http://localhost:8080`

## High-Quality Asset Pipeline (External)

You can replace the procedural fallback visuals with real high-resolution sprites.

1. Enable external assets in `src/game/config/assetsConfig.js`:
- `externalEnabled: true`

2. Put files under this structure:

```text
assets/
  cat/
    orange-sheet.png
    orange-tail.png
    sky-sheet.png
    sky-tail.png
    mint-sheet.png
    mint-tail.png
  objects/
    obj-box.png
    obj-box-tipped.png
    ... (all keys in ASSETS_CONFIG.objectTextureKeys)
```

3. Cat spritesheet requirements:
- Default frame size is `72x52` (change in `ASSETS_CONFIG.cat.frameWidth/Height` if needed)
- Frame indices used by the current animation mapping:
  - idle: `0,1,2,1`
  - run: `4,5,6,7`
  - jump: `8,9`
  - land: `10,11`
  - dash: `12,13,14,15`

4. Fallback behavior:
- If an external texture is missing, the game keeps using generated fallback textures.
- Missing external assets are reported with `console.warn` at boot.

## Controls

- Move: `W/A/S/D`
- Jump/Pounce: `Left Click`
- Super Dash: `Right Click` only when charged
- Title/Menu:
  - `A/D`: costume
  - `W/S` or `Up/Down`: select setting
  - `Left/Right`: adjust setting value
  - `Left Click`: start game
- Result: `R` replay, `M` menu

## Gameplay Upgrades

- Object physics profiles by type/tag
- Cat state animation polish: idle/run/pounce/dash/super-dash
- Special objects (`¡Ú`) with score bonus and richer feedback
- Super Dash system: +1 charge every combo tier (`6,12,...`)
- Dash improvement:
  - Short dash-impact window boosts object tipping power
  - Dash start creates a close-range shockwave to scatter nearby objects
- Room rules: living score boost, kitchen slippery + stronger impact, bedroom softer impact
- Spawn overlap mitigation + doorway auto-clear
- Doorway-friendly layout for smoother room traversal
- Domino chain chaos from high-speed object collisions
- Owner chase event that interrupts combo and pressures movement

## Structure

- `src/game/scenes`: Boot/Menu/Play/Result scenes
- `src/game/entities`: Cat and breakable objects
- `src/game/systems`: score/combo/mission/spawn/save logic
- `src/game/data`: objects/missions/cosmetics
- `src/ui`: HUD
- `src/audio`: procedural SFX/BGM

## Notes

- Local save key: `chaos-kitty-save-v1`
- Implemented as no-build setup because Node/npm is unavailable in this environment.

## Utility: Export X Community Posts to CSV

Use `scripts/x-community-links-and-text.js` in browser DevTools console while logged in to X.

1. Open community page: `https://x.com/i/communities/1994634691270643764`
2. Open DevTools Console (`F12`)
3. Paste and run the script from `scripts/x-community-links-and-text.js`
4. After auto-scroll finishes, a CSV download starts automatically

CSV format:
- `index`
- `author`
- `status_id`
- `created_at`
- `url`
- `text`

If you already have a link-only CSV (`index,url`), run:

`powershell -ExecutionPolicy Bypass -File scripts/x-links-to-text-csv.ps1 -InputCsvPath "C:\path\to\x-community-posts.csv"`

For full post text (not summary), use Playwright:

1. Install Playwright once: `npm i -D playwright`
2. Run: `node scripts/x-fulltext-playwright.mjs --input "C:\path\to\x-community-posts.csv"`
3. Login in the opened browser (first run), then press Enter in terminal

Output columns:
- `index`
- `source_index`
- `author`
- `status_id`
- `created_at`
- `url`
- `text`
- `error`

If npm is unavailable, use Python Playwright:

1. Install package: `python -m pip install playwright`
2. Install browser: `python -m playwright install chromium`
3. Run: `python scripts/x-fulltext-playwright.py --input "C:\path\to\x-community-posts.csv"`

If X blocks automated login, use browser-console extractor on logged-in X page:

`scripts/x-community-links-and-fulltext-console.js`

Tampermonkey full-text option (no iframe, uses current login session):

`scripts/x-community-fulltext-tampermonkey.user.js`


