import { backupSnapshot } from "../core/backup-snapshot.js";
import { normalizeBackup } from "../core/backup-validation.js";
import { fresh } from "../core/default-state.js";
import { isDateKey } from "../shared/format.js";
import { prayerNames } from "../domain/prayer-timer.js";
import { FEATURES } from "../config/features.js";
export function createBackup({ store, access, focus, prayer, now = Date.now }) {
  return Object.freeze({
    export() {
      access.require(FEATURES.BACKUP);
      focus.settle();
      prayer.settle();
      const time = now();
      return {
        format: "ikra-v1",
        exportedAt: new Date(time).toISOString(),
        data: backupSnapshot(store.state, time),
      };
    },
    validate(payload) {
      return normalizeBackup(payload, { fresh, isDateKey, names: prayerNames });
    },
    restore(payload) {
      access.require(FEATURES.BACKUP);
      const next = normalizeBackup(payload, {
        fresh,
        isDateKey,
        names: prayerNames,
      });
      store.replace(next, { backup: true });
      return store.state;
    },
  });
}
