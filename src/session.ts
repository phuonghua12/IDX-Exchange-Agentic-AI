import type { ListingRow, PropertyFilters } from "./types.js";

/** Per-user conversation state (Week 4). In-memory: lost on restart; long-term memory comes in Week 6. */
export interface UserSession extends PropertyFilters {
  // fields from the handbook interface: city, maxPrice, beds, baths, type, pool, lastResults, conversationStep
  lastResults?: ListingRow[];
  /** 0 = new, 1 = asked city, 2 = asked budget, 3 = asked type, 4 = results delivered */
  conversationStep: number;
  // extras
  awaiting?: "city" | "budget" | "type";
  skipped: Array<"budget" | "type">;
  page: number;
  total?: number;
  lastActive: number;
}

export const SESSION_TTL_MS = 30 * 60 * 1000; // forget a user after 30 idle minutes

const sessions = new Map<string, UserSession>();
const fresh = (now: number): UserSession => ({ conversationStep: 0, skipped: [], page: 1, lastActive: now });

export function getSession(userId: string, now = Date.now()): UserSession {
  const s = sessions.get(userId);
  if (!s || now - s.lastActive > SESSION_TTL_MS) {
    const n = fresh(now);
    sessions.set(userId, n);
    return n;
  }
  return s;
}

export function updateSession(userId: string, updates: Partial<UserSession>, now = Date.now()): UserSession {
  const next = { ...getSession(userId, now), ...updates, lastActive: now };
  sessions.set(userId, next);
  return next;
}

export function clearSession(userId: string) {
  sessions.delete(userId);
}

export function clearAllSessions() {
  sessions.clear();
}
