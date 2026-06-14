#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Aggiornamento del calendario tornei FITP per il Friuli-Venezia Giulia.
//
// GitHub Pages serve solo file statici e il browser non puo interrogare
// fitp.it (CORS). Percio i dati dei tornei vengono raccolti QUI, a build-time
// (in locale con `npm run scrape` o via GitHub Action), e scritti in
// public/data/tournaments.json, che l'app poi carica.
//
// Il Portale Unico Competizioni (PUC) carica i tornei via JavaScript da un
// endpoint interno. L'endpoint non e documentato pubblicamente e puo cambiare:
// per questo lo script e "best-effort". Se non riesce a ottenere dati validi,
// NON tocca il file esistente (mantiene il calendario seed curato) ed esce 0.
//
// Per puntare a un endpoint reale, imposta la variabile d'ambiente:
//   FITP_SEARCH_URL="https://.../api/ricerca-tornei?regione=Friuli..."
// e adatta mapApiTournament() allo schema restituito.
// ---------------------------------------------------------------------------

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../../public/data/tournaments.json");
const REGION = "Friuli-Venezia Giulia";

const PROVINCE_COORDS = {
  Udine: { lat: 46.0711, lon: 13.2346, prov: "UD" },
  Pordenone: { lat: 45.9564, lon: 12.6605, prov: "PN" },
  Gorizia: { lat: 45.9417, lon: 13.6217, prov: "GO" },
  Trieste: { lat: 45.6495, lon: 13.7768, prov: "TS" },
};

async function main() {
  const url = process.env.FITP_SEARCH_URL;
  if (!url) {
    console.log(
      "[scrape] Nessun FITP_SEARCH_URL impostato: mantengo il calendario seed esistente.\n" +
        "        Imposta FITP_SEARCH_URL per agganciare l'endpoint reale del PUC.",
    );
    return;
  }

  let raw;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "TennisAT/0.1 (+github pages)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.json();
  } catch (err) {
    console.warn(`[scrape] Fetch fallito (${err.message}). Mantengo il file esistente.`);
    return;
  }

  const list = Array.isArray(raw) ? raw : (raw.tornei ?? raw.items ?? raw.data ?? []);
  const tournaments = list
    .map(mapApiTournament)
    .filter((t) => t && t.region === REGION && t.startDate);

  if (tournaments.length === 0) {
    console.warn("[scrape] Nessun torneo FVG valido dall'endpoint. Mantengo il file esistente.");
    return;
  }

  const payload = {
    source: `FITP PUC via ${url}`,
    region: REGION,
    updatedAt: new Date().toISOString().slice(0, 10),
    tournaments,
  };
  await writeFile(OUT, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`[scrape] Scritti ${tournaments.length} tornei in ${OUT}`);
}

/**
 * Mappa un record dell'API PUC verso lo schema Tournament dell'app.
 * Da adattare allo schema reale dell'endpoint configurato.
 */
function mapApiTournament(r) {
  if (!r) return null;
  const city = pick(r, ["citta", "comune", "city", "localita"]) ?? "";
  const geo = PROVINCE_COORDS[city] ?? {};
  return {
    id: String(pick(r, ["id", "competitionId", "id_fonte"]) ?? cryptoId(r)),
    name: pick(r, ["nome", "descrizione", "name", "titolo"]) ?? "Torneo FITP",
    club: pick(r, ["circolo", "club", "tennisClub"]) ?? "",
    city,
    province: pick(r, ["provincia", "prov"]) ?? geo.prov ?? "",
    region: pick(r, ["regione", "region"]) ?? REGION,
    lat: numOr(pick(r, ["lat", "latitudine"]), geo.lat),
    lon: numOr(pick(r, ["lon", "lng", "longitudine"]), geo.lon),
    startDate: isoDate(pick(r, ["dataInizio", "dateFrom", "startDate", "dal"])),
    endDate: isoDate(pick(r, ["dataFine", "dateTo", "endDate", "al"])),
    limit: pick(r, ["limite", "classificaLimite", "ranking"]) ?? "4.NC",
    gender: normGender(pick(r, ["genere", "sesso", "gender"])),
    surface: normSurface(pick(r, ["superficie", "campo", "surface"])),
    prize: numOr(pick(r, ["montepremi", "prize", "totalPrizePool"]), undefined),
    grade: pick(r, ["tipo", "grado", "grade"]) ?? "Open",
    registrationDeadline: isoDate(pick(r, ["scadenzaIscrizioni", "registrationDeadline"])),
    sourceUrl: pick(r, ["url", "link", "sourceUrl"]) ?? "https://www.fitp.it/Tornei/Ricerca-tornei",
  };
}

const pick = (o, keys) => {
  for (const k of keys) if (o[k] != null && o[k] !== "") return o[k];
  return undefined;
};
const numOr = (v, d) => (v == null || isNaN(Number(v)) ? d : Number(v));
const normGender = (g) => (String(g ?? "M").toUpperCase().startsWith("F") ? "F" : "M");
const normSurface = (s) => {
  const t = String(s ?? "").toLowerCase();
  if (t.includes("terra")) return "terra";
  if (t.includes("cement")) return "cemento";
  if (t.includes("sintet")) return "sintetico";
  if (t.includes("erba")) return "erba";
  if (t.includes("indoor") || t.includes("copert")) return "indoor";
  return "sconosciuta";
};
function isoDate(v) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v).slice(0, 10) : d.toISOString().slice(0, 10);
}
function cryptoId(r) {
  return "t" + Math.abs(hashCode(JSON.stringify(r))).toString(36);
}
function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

// Verifica che il file esistente sia leggibile (diagnostica), poi esegui.
readFile(OUT, "utf8").catch(() => {}).finally(main);
