import Dexie, { type EntityTable } from "dexie";
import type { HexSessionResult } from "./hex-engine";

class HexDatabase extends Dexie {
  sessions!: EntityTable<HexSessionResult, "id">;

  constructor() {
    super("hex-conversion-drill");
    this.version(1).stores({ sessions: "id, completedAt, level" });
  }
}

const database = new HexDatabase();

export async function loadHexHistory(): Promise<HexSessionResult[]> {
  return database.sessions.orderBy("completedAt").reverse().limit(60).toArray();
}

export async function saveHexSession(session: HexSessionResult): Promise<void> {
  await database.sessions.put(session);
}

export async function clearHexHistory(): Promise<void> {
  await database.sessions.clear();
}
