import type { Classification } from "../types";

// ---------------------------------------------------------------------------
// Scala delle classifiche FITP (singolare), dal basso verso l'alto.
// Indice 0 = principiante (4.NC), indice piu alto = vertice.
// Fonte: metodo FITP per la compilazione delle classifiche federali.
// ---------------------------------------------------------------------------
export const LADDER: Classification[] = [
  "4.NC",
  "4.6",
  "4.5",
  "4.4",
  "4.3",
  "4.2",
  "4.1",
  "3.5",
  "3.4",
  "3.3",
  "3.2",
  "3.1",
  "2.8",
  "2.7",
  "2.6",
  "2.5",
  "2.4",
  "2.3",
  "2.2",
  "2.1",
  "1.C", // prima categoria (semplificata)
];

/** Indice (gradino) di una classifica nella scala. -1 se sconosciuta. */
export function rung(c: Classification): number {
  return LADDER.indexOf(normalizeClass(c));
}

/** Normalizza varianti comuni: "4nc", "4.Nc", "NC" -> "4.NC". */
export function normalizeClass(c: Classification): Classification {
  if (!c) return "4.NC";
  const t = c.trim().toUpperCase().replace(",", ".");
  if (t === "NC" || t === "4NC" || t === "4.NC") return "4.NC";
  // accetta forme tipo "4 3" o "4-3"
  const m = t.match(/^([1-4])[.\-\s]?(NC|\d)$/);
  if (m) return `${m[1]}.${m[2]}`;
  return t;
}

/** Categoria principale (1..4) di una classifica. */
export function category(c: Classification): number {
  return Number(normalizeClass(c).charAt(0));
}

/** Etichetta leggibile, es. "Quarta categoria - 4.3". */
export function classLabel(c: Classification): string {
  const cat = category(c);
  const names: Record<number, string> = {
    1: "Prima categoria",
    2: "Seconda categoria",
    3: "Terza categoria",
    4: "Quarta categoria",
  };
  return `${names[cat] ?? "Categoria"} - ${normalizeClass(c)}`;
}

// ---------------------------------------------------------------------------
// Tabella del valore di un incontro vinto (coefficiente FITP).
// La chiave e la differenza di gradini = gradino(avversario) - gradino(giocatore).
// Valori da: vittoria su avversario di 2+ gruppi superiore = 120 punti, ecc.
// ---------------------------------------------------------------------------
export function pointsForWin(opponent: Classification, player: Classification): number {
  const diff = rung(opponent) - rung(player); // >0 = avversario piu forte
  if (diff >= 2) return 120;
  if (diff === 1) return 90;
  if (diff === 0) return 60;
  if (diff === -1) return 30;
  if (diff === -2) return 20;
  if (diff === -3) return 15;
  return 0; // 4+ gruppi inferiore
}

// ---------------------------------------------------------------------------
// Soglie di promozione (punti necessari per salire al gradino indicato).
// Sono valori indicativi, monotoni e coerenti con gli esempi pubblicati
// (es. ~505 punti per la 4.1). Modificabili dall'utente nell'app.
// La chiave e la classifica di DESTINAZIONE.
// ---------------------------------------------------------------------------
export const PROMOTION_THRESHOLDS: Record<Classification, number> = {
  "4.6": 60,
  "4.5": 120,
  "4.4": 220,
  "4.3": 340,
  "4.2": 430,
  "4.1": 505,
  "3.5": 620,
  "3.4": 760,
  "3.3": 920,
  "3.2": 1100,
  "3.1": 1300,
  "2.8": 1550,
  "2.7": 1850,
  "2.6": 2200,
  "2.5": 2600,
  "2.4": 3050,
  "2.3": 3550,
  "2.2": 4100,
  "2.1": 4700,
  "1.C": 5400,
};

/** Classifica immediatamente superiore (prossima promozione). null se al vertice. */
export function nextClass(c: Classification): Classification | null {
  const i = rung(c);
  if (i < 0 || i >= LADDER.length - 1) return null;
  return LADDER[i + 1];
}

/** Punti necessari per la prossima promozione a partire dalla classifica attuale. */
export function nextThreshold(c: Classification): number | null {
  const nxt = nextClass(c);
  if (!nxt) return null;
  return PROMOTION_THRESHOLDS[nxt] ?? null;
}

/** Bonus per stagione senza sconfitte contro pari/inferiori (min. 5 incontri). */
export function noLossBonus(c: Classification): number {
  return category(c) <= 3 ? 100 : 50;
}
