export class MissionSystem {
  constructor(missions) {
    this.missions = missions;
  }

  evaluate(runResult) {
    const completed = [];
    let starsEarned = 0;

    for (const mission of this.missions) {
      let ok = false;
      if (mission.conditionType === "score") {
        ok = runResult.totalScore >= mission.targetValue;
      }
      if (mission.conditionType === "destroyedCount") {
        ok = runResult.destroyedCount >= mission.targetValue;
      }
      if (mission.conditionType === "bestCombo") {
        ok = runResult.bestCombo >= mission.targetValue;
      }
      if (ok) {
        starsEarned += mission.starReward;
        completed.push(mission.id);
      }
    }

    return { starsEarned, completed };
  }
}
