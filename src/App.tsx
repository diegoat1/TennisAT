import { useEffect, useMemo, useState } from "react";
import type { Match, OptimizerSettings, PlayerProfile, Tournament } from "./types";
import { DEFAULT_SETTINGS, SEED_MATCHES, SEED_PROFILE } from "./data/seed";
import { storage } from "./lib/storage";
import { ProfilePanel } from "./components/ProfilePanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { OptimizerPanel } from "./components/OptimizerPanel";
import { DataPanel } from "./components/DataPanel";
import { ConnectPanel } from "./components/ConnectPanel";
import { normalizeFitpData, type FitpData } from "./lib/fitpConnect";

type Tab = "profilo" | "storico" | "ottimizza" | "collega" | "dati";

const TABS: { id: Tab; label: string }[] = [
  { id: "profilo", label: "👤 Profilo" },
  { id: "storico", label: "📋 Storico" },
  { id: "ottimizza", label: "🎯 Ottimizza tornei" },
  { id: "collega", label: "🔐 Collega FITP" },
  { id: "dati", label: "🔄 Dati" },
];

const PROFILE_KEY = "tennisat.profile";

export function App() {
  const [tab, setTab] = useState<Tab>("ottimizza");
  const [profile, setProfile] = useState<PlayerProfile>(() => storage.loadProfile(SEED_PROFILE));
  const [matches, setMatches] = useState<Match[]>(() => storage.loadMatches(SEED_MATCHES));
  const [settings, setSettings] = useState<OptimizerSettings>(() =>
    storage.loadSettings(DEFAULT_SETTINGS),
  );
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Applica i dati FITP (dal connector o dal file my-data.json) allo stato.
  const applyFitpData = (data: FitpData, mode: "replace" | "merge" = "merge") => {
    if (data.profile) setProfile((cur) => ({ ...cur, ...data.profile }));
    if (data.matches && data.matches.length) {
      setMatches((cur) => (mode === "replace" ? data.matches! : [...data.matches!, ...cur]));
    }
  };

  // All'avvio, se esiste public/data/my-data.json (prodotto dal connector a
  // build-time) e l'utente non ha ancora dati propri, assorbe profilo e storico.
  useEffect(() => {
    const firstRun = (() => {
      try {
        return localStorage.getItem(PROFILE_KEY) === null;
      } catch {
        return true;
      }
    })();
    if (!firstRun) return;
    fetch(`${import.meta.env.BASE_URL}data/my-data.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) applyFitpData(normalizeFitpData(data), "replace");
      })
      .catch(() => {
        /* file opzionale: assente in assenza di connector */
      });
  }, []);

  // Carica il calendario tornei (aggiornabile via scraper a build-time).
  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}data/tournaments.json`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        const list: Tournament[] = Array.isArray(data) ? data : (data.tournaments ?? []);
        setTournaments(list);
        if (list.length === 0) setLoadError("Calendario tornei vuoto.");
      })
      .catch((e) => setLoadError(`Impossibile caricare i tornei: ${e.message}`));
  }, []);

  useEffect(() => storage.saveProfile(profile), [profile]);
  useEffect(() => storage.saveMatches(matches), [matches]);
  useEffect(() => storage.saveSettings(settings), [settings]);

  const provinces = useMemo(
    () => Array.from(new Set(tournaments.map((t) => t.province))).sort(),
    [tournaments],
  );

  const importMatches = (incoming: Match[], mode: "replace" | "append") => {
    setMatches((cur) => (mode === "replace" ? incoming : [...incoming, ...cur]));
  };

  const reset = () => {
    if (!confirm("Ripristinare profilo e storico ai dati di esempio?")) return;
    setProfile(SEED_PROFILE);
    setMatches(SEED_MATCHES);
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">🎾</div>
        <div>
          <h1>TennisAT</h1>
          <div className="sub">
            Profilo, storico e ottimizzatore di tornei FITP · {tournaments.length} tornei in{" "}
            {provinces.length ? provinces.join(", ") : "Friuli-Venezia Giulia"}
          </div>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {loadError && tab === "ottimizza" && (
        <div className="banner warn">⚠ {loadError}</div>
      )}

      {tab === "profilo" && (
        <ProfilePanel profile={profile} matches={matches} onChange={setProfile} />
      )}
      {tab === "storico" && (
        <HistoryPanel profile={profile} matches={matches} onChange={setMatches} />
      )}
      {tab === "ottimizza" && (
        <OptimizerPanel
          profile={profile}
          tournaments={tournaments}
          settings={settings}
          onSettings={setSettings}
        />
      )}
      {tab === "collega" && (
        <ConnectPanel
          hasProfile={profile}
          matchesCount={matches.length}
          onData={(data, mode) => applyFitpData(data, mode)}
        />
      )}
      {tab === "dati" && (
        <DataPanel
          profile={profile}
          matches={matches}
          onImportMatches={importMatches}
          onReset={reset}
        />
      )}

      <footer className="app-footer">
        TennisAT · stima i punti FITP con il coefficiente ufficiale (vittoria su pari = 60 pt, +1
        gruppo = 90, +2 = 120). Le soglie di promozione sono indicative e modificabili.
        <br />
        I dati del profilo restano sul tuo dispositivo. Calendario tornei: dati di esempio FVG,
        aggiornabili dal portale FITP.
      </footer>
    </div>
  );
}
