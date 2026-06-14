#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Connector FITP a build-time: fa il login con le TUE credenziali e scarica
// profilo + storico partite in public/data/my-data.json, che l'app assorbe
// all'avvio.
//
// SICUREZZA:
// - Le credenziali si leggono SOLO da variabili d'ambiente, mai dal codice o
//   dal repository. Non vengono mai stampate ne salvate.
// - Esegui in locale o in una GitHub Action con le credenziali come Secrets.
// - L'output (my-data.json) contiene solo i tuoi dati sportivi, non le
//   credenziali. E comunque ignorato da git per default (vedi .gitignore).
//
// USO:
//   FITP_USERNAME=... FITP_PASSWORD=... \
//   FITP_LOGIN_URL=https://.../login \
//   FITP_PROFILE_URL=https://.../mio-profilo \
//   FITP_MATCHES_URL=https://.../miei-incontri \
//   npm run fetch:me
//
// NOTA: il flusso di login e gli endpoint FITP non sono pubblici e possono
// cambiare. Questo script e una base: adatta login() e i mapper allo schema
// reale dell'area riservata. Senza variabili impostate, esce senza scrivere.
// ---------------------------------------------------------------------------

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../../public/data");
const OUT = resolve(OUT_DIR, "my-data.json");

const {
  FITP_USERNAME,
  FITP_PASSWORD,
  FITP_LOGIN_URL,
  FITP_PROFILE_URL,
  FITP_MATCHES_URL,
} = process.env;

async function main() {
  if (!FITP_USERNAME || !FITP_PASSWORD) {
    console.log(
      "[fetch:me] FITP_USERNAME/FITP_PASSWORD non impostate: salto (nessun file scritto).\n" +
        "          Imposta le credenziali come variabili d'ambiente per scaricare i tuoi dati.",
    );
    return;
  }
  if (!FITP_LOGIN_URL) {
    console.log(
      "[fetch:me] FITP_LOGIN_URL non impostata: salto. Indica l'endpoint di login dell'area riservata.",
    );
    return;
  }

  let cookies = "";
  try {
    cookies = await login(FITP_LOGIN_URL, FITP_USERNAME, FITP_PASSWORD);
  } catch (e) {
    console.warn(`[fetch:me] Login fallito (${e.message}). Nessun file scritto.`);
    return;
  }

  const profile = FITP_PROFILE_URL ? await safeJson(FITP_PROFILE_URL, cookies) : null;
  const matches = FITP_MATCHES_URL ? await safeJson(FITP_MATCHES_URL, cookies) : null;

  const payload = {
    source: "FITP area riservata (connector build-time)",
    fetchedAt: new Date().toISOString(),
    profile: profile ? mapProfile(profile) : undefined,
    matches: matches ? mapMatches(matches) : undefined,
  };

  if (!payload.profile && !payload.matches) {
    console.warn("[fetch:me] Nessun dato profilo/incontri ottenuto. Nessun file scritto.");
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`[fetch:me] Scritto ${OUT} (${payload.matches?.length ?? 0} partite).`);
}

/**
 * Esegue il login e ritorna l'header Cookie da riusare nelle richieste.
 * Adatta body/headers al form reale dell'area riservata FITP.
 */
async function login(url, username, password) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }).toString(),
    redirect: "manual",
  });
  if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("nessun cookie di sessione ricevuto");
  // Mantiene solo coppie nome=valore (scarta attributi come Path, HttpOnly).
  return setCookie
    .split(/,(?=[^;]+?=)/)
    .map((c) => c.split(";")[0].trim())
    .join("; ");
}

async function safeJson(url, cookies) {
  try {
    const res = await fetch(url, { headers: { Cookie: cookies, Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`[fetch:me] Richiesta a ${url} fallita: ${e.message}`);
    return null;
  }
}

// --- Mapper da adattare allo schema reale dell'area riservata ----------------
function mapProfile(p) {
  return {
    name: p.nome ?? p.name,
    tessera: p.tessera ?? p.numeroTessera,
    club: p.circolo ?? p.club,
    gender: String(p.sesso ?? p.gender ?? "M").toUpperCase().startsWith("F") ? "F" : "M",
    classification: p.classifica ?? p.classification ?? "4.NC",
    points: Number(p.punti ?? p.points ?? 0) || 0,
    homeCity: p.citta ?? p.residenza ?? "Udine",
  };
}

function mapMatches(list) {
  const arr = Array.isArray(list) ? list : (list.incontri ?? list.matches ?? []);
  return arr.map((m, i) => ({
    id: String(m.id ?? `fitp-${i}`),
    date: isoDate(m.data ?? m.date),
    tournament: m.torneo ?? m.competizione ?? m.tournament,
    round: m.turno ?? m.round,
    opponent: m.avversario ?? m.opponent ?? "Sconosciuto",
    opponentClass: m.classificaAvversario ?? m.opponentClass ?? "4.NC",
    result: resultOf(m),
    score: m.punteggio ?? m.score,
  }));
}

function resultOf(m) {
  const v = String(m.esito ?? m.result ?? "").toLowerCase();
  if (["v", "w", "vinta", "win", "1"].includes(v)) return "V";
  if (["s", "l", "persa", "loss", "0"].includes(v)) return "S";
  return m.vinta === true ? "V" : "S";
}

function isoDate(v) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v).slice(0, 10) : d.toISOString().slice(0, 10);
}

main();
