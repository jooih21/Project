import { BreakableObject } from "../entities/BreakableObject.js";

export class SpawnSystem {
  constructor(scene) {
    this.scene = scene;
  }

  createObjects(defs, roomsById, limit = Infinity, blockedZones = []) {
    const objects = [];
    const occupied = [];

    if (!Array.isArray(defs) || defs.length === 0 || limit <= 0) {
      return objects;
    }

    const requestedLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : defs.length;
    const targetCount = Math.min(requestedLimit, Math.max(defs.length, Math.floor(defs.length * 1.7)));

    const spawnPool = [];
    const source = [...defs];
    Phaser.Utils.Array.Shuffle(source);

    for (let i = 0; i < targetCount; i += 1) {
      const template = source[i % source.length];
      if (i < source.length) {
        spawnPool.push(template);
      } else {
        spawnPool.push({ ...template, id: `${template.id}-extra-${i + 1}` });
      }
    }

    for (const def of spawnPool) {
      const room = roomsById[def.room];
      if (!room) continue;

      let placed = false;
      let placedX = room.x + room.w / 2;
      let placedY = room.y + room.h / 2;

      const roomOccupied = occupied.filter((p) => p.room === def.room).length;
      const minDistance = roomOccupied < 10 ? 52 : roomOccupied < 18 ? 44 : 36;

      for (let attempt = 0; attempt < 45; attempt += 1) {
        const tx = Phaser.Math.Between(room.x + 40, room.x + room.w - 40);
        const ty = Phaser.Math.Between(room.y + 50, room.y + room.h - 35);

        const inBlockedZone = blockedZones.some((z) => {
          return tx >= z.x && tx <= z.x + z.w && ty >= z.y && ty <= z.y + z.h;
        });

        if (inBlockedZone) continue;

        const overlapped = occupied.some((p) => {
          if (p.room !== def.room) return false;
          return Phaser.Math.Distance.Between(p.x, p.y, tx, ty) < minDistance;
        });

        if (overlapped) continue;

        placed = true;
        placedX = tx;
        placedY = ty;
        break;
      }

      if (!placed) continue;

      occupied.push({ x: placedX, y: placedY, room: def.room });
      objects.push(new BreakableObject(this.scene, placedX, placedY, def));
    }

    return objects;
  }
}
