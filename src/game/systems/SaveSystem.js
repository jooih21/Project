const SAVE_KEY = "chaos-kitty-save-v1";

export class SaveSystem {
  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return SaveSystem.defaultSave();
      const parsed = JSON.parse(raw);
      const defaults = SaveSystem.defaultSave();

      return {
        ...defaults,
        ...parsed,
        unlockedCosmeticIds: Array.isArray(parsed.unlockedCosmeticIds)
          ? parsed.unlockedCosmeticIds
          : ["orange"],
        settings: {
          ...defaults.settings,
          ...(parsed.settings ?? {})
        }
      };
    } catch {
      return SaveSystem.defaultSave();
    }
  }

  static save(data) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  static defaultSave() {
    return {
      bestScore: 0,
      totalStars: 0,
      unlockedCosmeticIds: ["orange"],
      selectedCosmeticId: "orange",
      settings: {
        sfxVolume: 0.7,
        bgmVolume: 0.35,
        actionPower: 1.0
      }
    };
  }
}
