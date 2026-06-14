import type { Match, OptimizerSettings, PlayerProfile } from "../types";

// Profilo precaricato di Diego Alejandro Toffaletti (squadra di Cividale del
// Friuli, residente a Udine). Classifica e punti sono modificabili dalla scheda
// Profilo: aggiornali col valore reale dalla tua area riservata FITP.
export const SEED_PROFILE: PlayerProfile = {
  name: "Diego Alejandro Toffaletti",
  tessera: "",
  club: "Tennis Club Cividale",
  gender: "M",
  classification: "4.NC",
  points: 0,
  homeCity: "Udine",
};

// I 3 incontri del Campionato a squadre Serie D4 con la squadra di Cividale.
// Precaricati come bozza: avversario, classifica ed esito vanno confermati
// (li trovi nella tua area riservata FITP) dalla scheda "Storico".
export const SEED_MATCHES: Match[] = [
  {
    id: "d4-1",
    date: "2026-04-19",
    tournament: "Campionato a squadre Serie D4",
    round: "Singolare",
    opponent: "Avversario 1 (da confermare)",
    opponentClass: "4.NC",
    result: "V",
    score: "",
    surface: "terra",
  },
  {
    id: "d4-2",
    date: "2026-04-26",
    tournament: "Campionato a squadre Serie D4",
    round: "Singolare",
    opponent: "Avversario 2 (da confermare)",
    opponentClass: "4.NC",
    result: "V",
    score: "",
    surface: "terra",
  },
  {
    id: "d4-3",
    date: "2026-05-03",
    tournament: "Campionato a squadre Serie D4",
    round: "Singolare",
    opponent: "Avversario 3 (da confermare)",
    opponentClass: "4.NC",
    result: "V",
    score: "",
    surface: "terra",
  },
];

export const DEFAULT_SETTINGS: OptimizerSettings = {
  travelWeight: 0.25, // 0.25 punti equivalenti per km
  maxDistanceKm: 90,
  horizonDate: "2026-11-30",
  matchGender: true,
};
