import type { Match, OptimizerSettings, PlayerProfile } from "../types";

// Dati di esempio precaricati al primo avvio (modificabili e sostituibili
// con i tuoi dati reali FITP). Pensati per un giocatore della squadra di
// Cividale del Friuli residente a Udine.
export const SEED_PROFILE: PlayerProfile = {
  name: "Il tuo nome",
  tessera: "",
  club: "Tennis Club Cividale del Friuli",
  gender: "M",
  classification: "4.3",
  points: 160,
  homeCity: "Udine",
  birthYear: 1995,
};

export const SEED_MATCHES: Match[] = [
  {
    id: "seed1",
    date: "2026-05-03",
    tournament: "Open Citta di Udine",
    round: "32",
    opponent: "M. Rossi",
    opponentClass: "4.3",
    result: "V",
    score: "6-4 6-2",
    surface: "terra",
  },
  {
    id: "seed2",
    date: "2026-05-04",
    tournament: "Open Citta di Udine",
    round: "16",
    opponent: "L. Bianchi",
    opponentClass: "4.2",
    result: "V",
    score: "7-5 6-4",
    surface: "terra",
  },
  {
    id: "seed3",
    date: "2026-05-05",
    tournament: "Open Citta di Udine",
    round: "QF",
    opponent: "G. Ferrari",
    opponentClass: "4.1",
    result: "S",
    score: "4-6 3-6",
    surface: "terra",
  },
  {
    id: "seed4",
    date: "2026-05-17",
    tournament: "Rodeo TC Manzano",
    round: "SF",
    opponent: "A. Conti",
    opponentClass: "4.4",
    result: "V",
    score: "6-1 6-2",
    surface: "terra",
  },
  {
    id: "seed5",
    date: "2026-05-24",
    tournament: "Rodeo TC Manzano",
    round: "F",
    opponent: "S. Russo",
    opponentClass: "4.2",
    result: "V",
    score: "7-6 6-3",
    surface: "terra",
  },
  {
    id: "seed6",
    date: "2026-05-31",
    tournament: "Open Pordenone",
    round: "16",
    opponent: "D. Greco",
    opponentClass: "4.5",
    result: "V",
    score: "6-0 6-1",
    surface: "sintetico",
  },
];

export const DEFAULT_SETTINGS: OptimizerSettings = {
  travelWeight: 0.25, // 0.25 punti equivalenti per km
  maxDistanceKm: 90,
  horizonDate: "2026-11-30",
  matchGender: true,
};
