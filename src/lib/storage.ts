import type { Match, OptimizerSettings, PlayerProfile } from "../types";

// Persistenza locale (localStorage). I dati del profilo e dello storico
// restano sul dispositivo dell'utente: nessun server, perfetto per GitHub Pages.

const KEYS = {
  profile: "tennisat.profile",
  matches: "tennisat.matches",
  settings: "tennisat.settings",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota o ambiente senza storage: ignora */
  }
}

export const storage = {
  loadProfile: (fallback: PlayerProfile) => read(KEYS.profile, fallback),
  saveProfile: (p: PlayerProfile) => write(KEYS.profile, p),
  loadMatches: (fallback: Match[]) => read(KEYS.matches, fallback),
  saveMatches: (m: Match[]) => write(KEYS.matches, m),
  loadSettings: (fallback: OptimizerSettings) => read(KEYS.settings, fallback),
  saveSettings: (s: OptimizerSettings) => write(KEYS.settings, s),
  /** Esporta tutto in un unico oggetto serializzabile. */
  exportAll: (profile: PlayerProfile, matches: Match[]) => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    matches,
  }),
};
