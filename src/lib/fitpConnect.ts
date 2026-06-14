import type { Match, PlayerProfile } from "../types";
import { normalizeClass } from "../data/classifications";

// ---------------------------------------------------------------------------
// Collegamento a FITP.
//
// IMPORTANTE (sicurezza + come funziona davvero):
// - Un sito statico nel browser NON puo autenticarsi su fitp.it: il dominio
//   federale non invia gli header CORS che permetterebbero a github.io di
//   leggere le risposte. Percio le credenziali NON vengono mai inviate a
//   fitp.it da qui.
// - Le credenziali restano in sessionStorage (si cancellano chiudendo la
//   scheda) e vengono inviate SOLO al "connector" che configuri tu: un piccolo
//   backend/endpoint sotto il tuo controllo che fa il login a FITP e restituisce
//   i tuoi dati gia in JSON. In alternativa usa il connector a build-time
//   (scripts/fitp/fetch-my-data.mjs) con le credenziali come variabili d'ambiente.
// ---------------------------------------------------------------------------

const SESSION_KEY = "tennisat.fitp.session";
const CONNECTOR_KEY = "tennisat.fitp.connector";

export interface FitpCredentials {
  username: string;
  password: string;
  consent: boolean;
}

export interface FitpData {
  profile?: Partial<PlayerProfile>;
  matches?: Match[];
}

/** Salva le credenziali SOLO per la sessione corrente (sessionStorage). */
export function rememberSession(creds: FitpCredentials): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(creds));
  } catch {
    /* ambiente senza storage */
  }
}

export function loadSession(): FitpCredentials | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as FitpCredentials) : null;
  } catch {
    return null;
  }
}

/** Cancella ogni traccia delle credenziali dal dispositivo. */
export function forgetSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function loadConnectorUrl(): string {
  try {
    return localStorage.getItem(CONNECTOR_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveConnectorUrl(url: string): void {
  try {
    localStorage.setItem(CONNECTOR_KEY, url);
  } catch {
    /* ignore */
  }
}

export class FitpConnectError extends Error {}

/**
 * Richiede i dati a FITP tramite il connector configurato dall'utente.
 * Invia le credenziali in POST SOLO all'URL del connector indicato (mai a
 * fitp.it direttamente, che il browser non puo raggiungere per via del CORS).
 */
export async function fetchFromConnector(
  connectorUrl: string,
  creds: FitpCredentials,
): Promise<FitpData> {
  if (!connectorUrl.trim()) {
    throw new FitpConnectError(
      "Nessun connector configurato. Dal browser non e possibile fare il login su fitp.it (CORS): " +
        "imposta l'URL di un tuo connector oppure usa il connector a build-time (vedi scheda).",
    );
  }
  let res: Response;
  try {
    res = await fetch(connectorUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: creds.username, password: creds.password }),
    });
  } catch (e) {
    throw new FitpConnectError(
      `Connector non raggiungibile (${(e as Error).message}). Verifica l'URL e che il servizio sia attivo.`,
    );
  }
  if (!res.ok) {
    throw new FitpConnectError(`Il connector ha risposto ${res.status}. Controlla credenziali e servizio.`);
  }
  const data = await res.json().catch(() => null);
  if (!data) throw new FitpConnectError("Risposta del connector non valida (JSON atteso).");
  return normalizeFitpData(data);
}

/** Normalizza i dati ricevuti (connector o file my-data.json) verso i tipi app. */
export function normalizeFitpData(data: any): FitpData {
  const out: FitpData = {};
  if (data.profile && typeof data.profile === "object") {
    const p = data.profile;
    out.profile = {
      ...(p.name != null ? { name: String(p.name) } : {}),
      ...(p.tessera != null ? { tessera: String(p.tessera) } : {}),
      ...(p.club != null ? { club: String(p.club) } : {}),
      ...(p.homeCity != null ? { homeCity: String(p.homeCity) } : {}),
      ...(p.gender === "F" || p.gender === "M" ? { gender: p.gender } : {}),
      ...(p.classification != null ? { classification: normalizeClass(String(p.classification)) } : {}),
      ...(p.points != null && !isNaN(Number(p.points)) ? { points: Number(p.points) } : {}),
    };
  }
  if (Array.isArray(data.matches)) {
    out.matches = data.matches.map((m: any, i: number) => ({
      id: m.id ?? `fitp-${i}-${Date.now().toString(36)}`,
      date: String(m.date ?? "").slice(0, 10),
      tournament: m.tournament,
      round: m.round,
      opponent: m.opponent ?? "Sconosciuto",
      opponentClass: normalizeClass(m.opponentClass ?? "4.NC"),
      result: m.result === "S" || m.result === "V" ? m.result : "S",
      score: m.score,
      surface: m.surface,
    }));
  }
  return out;
}
