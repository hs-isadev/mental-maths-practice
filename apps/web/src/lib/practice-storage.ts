import Dexie, { type EntityTable } from "dexie";
import type { PracticeSessionResult } from "./practice-engine";

class PracticeDatabase extends Dexie {
  sessions!: EntityTable<PracticeSessionResult, "id">;

  constructor() {
    super("mental-maths-practice");
    this.version(1).stores({ sessions: "id, completedAt, mode, level" });
  }
}

const database = new PracticeDatabase();

export async function loadPracticeHistory(): Promise<PracticeSessionResult[]> {
  return database.sessions.orderBy("completedAt").reverse().limit(120).toArray();
}

export async function savePracticeSession(session: PracticeSessionResult): Promise<void> {
  await database.sessions.put(session);
}

export async function clearPracticeHistory(): Promise<void> {
  await database.sessions.clear();
}
