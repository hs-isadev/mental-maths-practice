import Dexie, { type EntityTable } from "dexie";
import { summarizePracticeAttempts, type PracticeSessionResult } from "./practice-engine";

class PracticeDatabase extends Dexie {
  sessions!: EntityTable<PracticeSessionResult, "id">;

  constructor() {
    super("mental-maths-practice");
    this.version(1).stores({ sessions: "id, completedAt, mode, level" });
  }
}

const database = new PracticeDatabase();

export async function loadPracticeHistory(): Promise<PracticeSessionResult[]> {
  const sessions = await database.sessions.orderBy("completedAt").reverse().limit(120).toArray();
  return sessions.map((session) => typeof session.summary.meanMs === "number"
    ? session
    : { ...session, summary: summarizePracticeAttempts(session.attempts) });
}

export async function savePracticeSession(session: PracticeSessionResult): Promise<void> {
  await database.sessions.put(session);
}

export async function clearPracticeHistory(): Promise<void> {
  await database.sessions.clear();
}
