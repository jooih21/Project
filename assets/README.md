# External Art Drop Folder

Place high-quality game assets here to replace procedural fallback visuals.

## Required Structure

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
    ...
```

## Notes

- File names must match runtime keys exactly.
- Object texture keys are listed in `src/game/config/assetsConfig.js`.
- Cat spritesheet frame size defaults to `72x52` and is configurable in `src/game/config/assetsConfig.js`.
- Enable external loading by setting `externalEnabled: true` in `src/game/config/assetsConfig.js`.