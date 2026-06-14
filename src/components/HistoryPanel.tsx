import { useState } from "react";
import type { Match, PlayerProfile } from "../types";
import { computeStats } from "../lib/stats";
import { CLASS_OPTIONS, fmtDate } from "../lib/format";
import { normalizeClass } from "../data/classifications";

interface Props {
  profile: PlayerProfile;
  matches: Match[];
  onChange: (m: Match[]) => void;
}

export function HistoryPanel({ profile, matches, onChange }: Props) {
  const stats = computeStats(profile, matches);
  const sorted = [...matches].sort((a, b) => b.date.localeCompare(a.date));

  const remove = (id: string) => onChange(matches.filter((m) => m.id !== id));
  const add = (m: Match) => onChange([m, ...matches]);

  return (
    <div className="grid cols-2">
      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <AddMatchForm onAdd={add} />
      </div>

      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <h2>Storico partite ({matches.length})</h2>
        {sorted.length === 0 ? (
          <div className="hint">
            Nessuna partita. Aggiungile qui sopra o importa il tuo storico dalla scheda “Dati”.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Torneo</th>
                  <th>Turno</th>
                  <th>Avversario</th>
                  <th>Cl.</th>
                  <th>Esito</th>
                  <th>Punteggio</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m) => (
                  <tr key={m.id}>
                    <td>{fmtDate(m.date)}</td>
                    <td>{m.tournament ?? "-"}</td>
                    <td>{m.round ?? "-"}</td>
                    <td>{m.opponent}</td>
                    <td>{m.opponentClass}</td>
                    <td className={`res-${m.result}`}>{m.result === "V" ? "Vinta" : "Persa"}</td>
                    <td className="muted">{m.score ?? "-"}</td>
                    <td>
                      <button className="ghost small" onClick={() => remove(m.id)}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <h2>Rendimento per classifica avversario</h2>
        {stats.byOpponentClass.length === 0 ? (
          <div className="muted small">-</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Classifica avversario</th>
                <th>Vittorie</th>
                <th>Sconfitte</th>
                <th>Win rate</th>
              </tr>
            </thead>
            <tbody>
              {stats.byOpponentClass.map((r) => {
                const tot = r.wins + r.losses;
                return (
                  <tr key={r.cls}>
                    <td>{r.cls}</td>
                    <td className="res-V">{r.wins}</td>
                    <td className="res-S">{r.losses}</td>
                    <td>{tot ? Math.round((r.wins / tot) * 100) : 0}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

let counter = 0;
function AddMatchForm({ onAdd }: { onAdd: (m: Match) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const empty = {
    date: today,
    tournament: "",
    round: "",
    opponent: "",
    opponentClass: "4.3",
    result: "V" as Match["result"],
    score: "",
  };
  const [f, setF] = useState(empty);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    if (!f.opponent.trim()) return;
    counter += 1;
    onAdd({
      id: `u${Date.now().toString(36)}${counter}`,
      date: f.date,
      tournament: f.tournament || undefined,
      round: f.round || undefined,
      opponent: f.opponent.trim(),
      opponentClass: normalizeClass(f.opponentClass),
      result: f.result,
      score: f.score || undefined,
    });
    setF({ ...empty });
  };

  return (
    <>
      <h2>Aggiungi partita</h2>
      <div className="form-row">
        <div>
          <label className="field">Data</label>
          <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div>
          <label className="field">Torneo</label>
          <input value={f.tournament} onChange={(e) => set("tournament", e.target.value)} />
        </div>
        <div>
          <label className="field">Turno</label>
          <input placeholder="QF, SF, F..." value={f.round} onChange={(e) => set("round", e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div>
          <label className="field">Avversario</label>
          <input value={f.opponent} onChange={(e) => set("opponent", e.target.value)} />
        </div>
        <div>
          <label className="field">Classifica avversario</label>
          <select value={f.opponentClass} onChange={(e) => set("opponentClass", e.target.value)}>
            {CLASS_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field">Esito</label>
          <select value={f.result} onChange={(e) => set("result", e.target.value)}>
            <option value="V">Vinta</option>
            <option value="S">Persa</option>
          </select>
        </div>
        <div>
          <label className="field">Punteggio</label>
          <input placeholder="6-4 6-2" value={f.score} onChange={(e) => set("score", e.target.value)} />
        </div>
      </div>
      <div className="btn-row">
        <button onClick={submit}>+ Aggiungi al diario</button>
      </div>
    </>
  );
}
