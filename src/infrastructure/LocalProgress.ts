import type { Session } from '../domain/Session.ts';

const currentKey = 'ai-fitness-progress';
const legacyKeys = ['ai-fitness-progress-v3'] as const;
const schemaVersion = 1;

type StoredProgress = Readonly<{
  schemaVersion: typeof schemaVersion;
  session: Session;
}>;

const isSession = (value: unknown): value is Session => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Session>;
  return ['intro', 'goals', 'questions', 'results'].includes(candidate.screen ?? '')
    && Number.isInteger(candidate.step)
    && !!candidate.answers
    && typeof candidate.answers === 'object';
};

const read = (key: string): unknown => {
  const value = localStorage.getItem(key);
  return value === null ? null : JSON.parse(value);
};

export const loadProgress = (): Session | null => {
  try {
    const current = read(currentKey) as Partial<StoredProgress> | null;
    if (current?.schemaVersion === schemaVersion && isSession(current.session))
      return current.session;

    for (const key of legacyKeys) {
      const legacy = read(key);
      if (!isSession(legacy)) continue;
      saveProgress(legacy);
      localStorage.removeItem(key);
      return legacy;
    }
  } catch {
    return null;
  }
  return null;
};

export const saveProgress = (session: Session): void => {
  const stored: StoredProgress = { schemaVersion, session };
  localStorage.setItem(currentKey, JSON.stringify(stored));
};
