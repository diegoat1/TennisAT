import type { Match, MatchResult } from "../types";
import { normalizeClass } from "../data/classifications";

let idCounter = 0;
function mkId(): string {
  idCounter += 1;
  return `m${Date.now().toString(36)}${idCounter}`;
}

/**
 * Importa partite da CSV. Intestazioni accettate (in qualsiasi ordine):
 * data, torneo, turno, avversario, classifica, risultato, punteggio.
 * Il risultato accetta V/S, W/L, vinta/persa, 1/0.
 */
export function parseMatchesCSV(text: string): { matches: Match[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { matches: [], errors: ["CSV vuoto o senza righe dati."] };

  const delim = lines[0].includes(";") ? ";" : ",";
  const header = splitCsv(lines[0], delim).map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) => header.findIndex((h) => names.includes(h));

  const ci = {
    date: idx(["data", "date", "fecha"]),
    tournament: idx(["torneo", "tournament", "torneo/circolo"]),
    round: idx(["turno", "round", "fase"]),
    opponent: idx(["avversario", "opponent", "rival", "giocatore"]),
    opponentClass: idx(["classifica", "class", "categoria", "clasificacion"]),
    result: idx(["risultato", "result", "esito", "resultado"]),
    score: idx(["punteggio", "score", "marcador"]),
  };

  const matches: Match[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsv(lines[i], delim);
    const get = (k: number) => (k >= 0 && k < cols.length ? cols[k].trim() : "");
    const date = normalizeDate(get(ci.date));
    if (!date) {
      errors.push(`Riga ${i + 1}: data mancante o non valida.`);
      continue;
    }
    const result = parseResult(get(ci.result));
    if (!result) {
      errors.push(`Riga ${i + 1}: risultato non riconosciuto ("${get(ci.result)}").`);
      continue;
    }
    matches.push({
      id: mkId(),
      date,
      tournament: get(ci.tournament) || undefined,
      round: get(ci.round) || undefined,
      opponent: get(ci.opponent) || "Sconosciuto",
      opponentClass: normalizeClass(get(ci.opponentClass) || "4.NC"),
      result,
      score: get(ci.score) || undefined,
    });
  }
  return { matches, errors };
}

/** Importa da un JSON esportato dall'app (o compatibile). */
export function parseExportJSON(text: string): {
  profile?: unknown;
  matches: Match[];
  errors: string[];
} {
  try {
    const data = JSON.parse(text);
    const rawMatches: unknown[] = Array.isArray(data) ? data : (data.matches ?? []);
    const matches: Match[] = rawMatches.map((m: any) => ({
      id: m.id ?? mkId(),
      date: normalizeDate(m.date) ?? m.date,
      tournament: m.tournament,
      round: m.round,
      opponent: m.opponent ?? "Sconosciuto",
      opponentClass: normalizeClass(m.opponentClass ?? "4.NC"),
      result: (m.result === "V" || m.result === "S" ? m.result : parseResult(m.result)) ?? "S",
      score: m.score,
      surface: m.surface,
    }));
    return { profile: data.profile, matches, errors: [] };
  } catch (e) {
    return { matches: [], errors: [`JSON non valido: ${(e as Error).message}`] };
  }
}

function parseResult(s: string): MatchResult | null {
  const t = (s ?? "").trim().toLowerCase();
  if (["v", "w", "vinta", "win", "vittoria", "1", "ganada", "g"].includes(t)) return "V";
  if (["s", "l", "persa", "loss", "sconfitta", "0", "perdida", "p"].includes(t)) return "S";
  return null;
}

function normalizeDate(s: string): string | null {
  if (!s) return null;
  const t = s.trim();
  // ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  // dd/mm/yyyy o dd-mm-yyyy
  const m = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${mo}-${d}`;
  }
  const parsed = new Date(t);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function splitCsv(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === delim && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}
