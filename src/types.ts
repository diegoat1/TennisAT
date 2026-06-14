// Tipi di dominio per TennisAT.
// Modellano il sistema di classifica FITP (Federazione Italiana Tennis e Padel),
// lo storico partite del giocatore e i tornei della regione.

/** Codice di una classifica FITP, es. "4.NC", "4.3", "3.1", "2.6". */
export type Classification = string;

/** Genere del tabellone / del giocatore. */
export type Gender = "M" | "F";

/** Superficie del campo. */
export type Surface = "terra" | "cemento" | "sintetico" | "erba" | "indoor" | "sconosciuta";

/** Esito di una partita dal punto di vista del giocatore. */
export type MatchResult = "V" | "S"; // Vittoria / Sconfitta

/** Una partita giocata, base dello storico (lo "storico" assorbito da FITP). */
export interface Match {
  id: string;
  date: string; // ISO yyyy-mm-dd
  tournament?: string;
  round?: string; // es. "Q1", "32", "16", "QF", "SF", "F"
  opponent: string;
  /** Classifica dell'avversario al momento della partita. */
  opponentClass: Classification;
  result: MatchResult;
  score?: string; // es. "6-3 6-4"
  surface?: Surface;
}

/** Profilo del giocatore (i dati "assorbiti" da FITP). */
export interface PlayerProfile {
  name: string;
  tessera?: string; // numero tessera FITP
  club: string;
  gender: Gender;
  /** Classifica attuale. */
  classification: Classification;
  /** Punti accumulati nella stagione corrente. */
  points: number;
  /** Citta di residenza, base per il calcolo delle distanze. */
  homeCity: string;
  birthYear?: number;
}

/** Un torneo del calendario regionale (PUC FITP). */
export interface Tournament {
  id: string;
  name: string;
  club: string;
  city: string;
  province: string; // UD, PN, GO, TS, ...
  region: string;
  /** Coordinate per il calcolo della distanza. */
  lat?: number;
  lon?: number;
  startDate: string; // ISO
  endDate: string; // ISO
  /** Limite di classifica del tabellone (la categoria piu alta ammessa), es. "4.1". */
  limit: Classification;
  /** Classifica minima ammessa, default 4.NC. */
  minLimit?: Classification;
  gender: Gender;
  surface: Surface;
  /** Montepremi / grado indicativo del torneo. */
  prize?: number;
  grade?: string; // es. "Open", "Rodeo", "Giovanile", "Veterani"
  registrationDeadline?: string; // ISO
  fee?: number; // quota iscrizione indicativa
  sourceUrl?: string;
}

/** Risultato della valutazione di un torneo da parte dell'ottimizzatore. */
export interface TournamentEvaluation {
  tournament: Tournament;
  /** Punti FITP attesi sommando il valore atteso di ogni turno. */
  expectedPoints: number;
  /** Probabilita stimata di vincere il torneo. */
  winProbability: number;
  /** Numero atteso di vittorie. */
  expectedWins: number;
  /** Distanza in km dalla citta di casa. */
  distanceKm: number;
  /** Penalita di viaggio applicata (in punti equivalenti). */
  travelPenalty: number;
  /** Punteggio finale di convenienza (piu alto = meglio giocarlo). */
  score: number;
  /** Quota dei punti mancanti alla prossima promozione coperta da questo torneo. */
  promotionProgress: number;
  /** Spiegazione leggibile del perche conviene o no. */
  reasons: string[];
  /** Dettaglio turno per turno. */
  rounds: RoundProjection[];
  /** True se il giocatore e ammesso (rispetta i limiti di classifica). */
  eligible: boolean;
}

export interface RoundProjection {
  label: string;
  /** Classifica tipica dell'avversario atteso in questo turno. */
  opponentClass: Classification;
  /** Probabilita di raggiungere e vincere questo turno. */
  winChance: number;
  /** Punti che si otterrebbero vincendo questo turno. */
  pointsIfWin: number;
}

/** Voce del calendario ottimale calcolato dall'ottimizzatore. */
export interface PlanItem {
  evaluation: TournamentEvaluation;
}

export interface OptimizerSettings {
  /** Peso della penalita per km di viaggio (punti equivalenti per km). */
  travelWeight: number;
  /** Distanza massima (km) oltre la quale un torneo viene scartato. */
  maxDistanceKm: number;
  /** Data limite entro cui pianificare (ISO). */
  horizonDate: string;
  /** Considera solo tornei del proprio genere. */
  matchGender: boolean;
}
