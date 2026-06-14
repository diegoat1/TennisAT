import type {
  OptimizerSettings,
  PlayerProfile,
  Tournament,
  TournamentEvaluation,
} from "../types";
import { optimize } from "../lib/optimizer";
import { fmtRange, pct } from "../lib/format";

interface Props {
  profile: PlayerProfile;
  tournaments: Tournament[];
  settings: OptimizerSettings;
  onSettings: (s: OptimizerSettings) => void;
}

export function OptimizerPanel({ profile, tournaments, settings, onSettings }: Props) {
  const result = optimize(profile, tournaments, settings);
  const planIds = new Set(result.plan.map((e) => e.tournament.id));
  const gained = Math.round(result.projectedPoints - result.startingPoints);

  return (
    <div>
      <SettingsBar settings={settings} onSettings={onSettings} />

      {result.nextCategory && (
        <div className={`banner ${result.reachesPromotion ? "good" : "warn"}`}>
          {result.reachesPromotion ? (
            <>
              🎯 <strong>Promozione raggiungibile a {result.nextCategory}!</strong> Giocando i{" "}
              {result.plan.length} tornei consigliati arrivi a ~{result.projectedPoints} punti
              (+{gained}), oltre la soglia di {result.threshold}.
            </>
          ) : (
            <>
              📈 Con il calendario ottimale arrivi a ~{result.projectedPoints} punti (+{gained}).
              Per la promozione a <strong>{result.nextCategory}</strong> servono {result.threshold}:
              ti mancherebbero ancora {Math.max(0, Math.round(result.threshold! - result.projectedPoints))}.
              Allarga l'orizzonte o il raggio per trovarne altri.
            </>
          )}
        </div>
      )}

      <div className="section-title">
        <h2>📅 Calendario ottimale</h2>
        <span className="muted small">
          tornei senza sovrapposizioni che massimizzano i punti verso la promozione
        </span>
      </div>
      {result.plan.length === 0 ? (
        <div className="hint">
          Nessun torneo idoneo nel periodo selezionato. Prova ad aumentare l'orizzonte temporale o
          la distanza massima nelle impostazioni qui sopra.
        </div>
      ) : (
        result.plan.map((e, i) => (
          <RecCard key={e.tournament.id} ev={e} rank={i + 1} inPlan />
        ))
      )}

      <div className="spacer" />
      <div className="section-title">
        <h2>🏆 Tutti i tornei valutati</h2>
        <span className="muted small">ordinati per convenienza (punti attesi − costo di viaggio)</span>
      </div>
      {result.evaluations.map((e) => (
        <RecCard key={e.tournament.id} ev={e} inPlan={planIds.has(e.tournament.id)} />
      ))}
      {result.evaluations.length === 0 && (
        <div className="hint">Nessun torneo nel periodo/raggio impostati.</div>
      )}
    </div>
  );
}

function SettingsBar({
  settings,
  onSettings,
}: {
  settings: OptimizerSettings;
  onSettings: (s: OptimizerSettings) => void;
}) {
  const set = (k: keyof OptimizerSettings, v: number | string | boolean) =>
    onSettings({ ...settings, [k]: v });
  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <h3>Impostazioni ottimizzatore</h3>
      <div className="form-row" style={{ marginBottom: 0 }}>
        <div>
          <label className="field">Orizzonte (entro il)</label>
          <input
            type="date"
            value={settings.horizonDate}
            onChange={(e) => set("horizonDate", e.target.value)}
          />
        </div>
        <div>
          <label className="field">Distanza max: {settings.maxDistanceKm} km</label>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={settings.maxDistanceKm}
            onChange={(e) => set("maxDistanceKm", Number(e.target.value))}
          />
        </div>
        <div>
          <label className="field">Peso viaggio: {settings.travelWeight.toFixed(2)} pt/km</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.travelWeight}
            onChange={(e) => set("travelWeight", Number(e.target.value))}
          />
        </div>
        <div>
          <label className="field">Solo il mio genere</label>
          <select
            value={settings.matchGender ? "1" : "0"}
            onChange={(e) => set("matchGender", e.target.value === "1")}
          >
            <option value="1">Si</option>
            <option value="0">No</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function RecCard({
  ev,
  rank,
  inPlan,
}: {
  ev: TournamentEvaluation;
  rank?: number;
  inPlan?: boolean;
}) {
  const t = ev.tournament;
  const cls = `rec ${rank === 1 ? "top" : ""} ${!ev.eligible ? "ineligible" : ""}`;
  return (
    <div className={cls}>
      <div className="rec-head">
        <div>
          <div className="rec-title">
            {rank && <span className="rank-num">{rank}</span>}
            {t.name}
          </div>
          <div className="rec-meta">
            {fmtRange(t.startDate, t.endDate)} · {t.city} ({t.province}) · limite {t.limit} ·{" "}
            {t.surface} · {t.grade}
          </div>
        </div>
        <div className="rec-score">
          {ev.eligible ? (
            <>
              <div className="big">+{ev.expectedPoints}</div>
              <div className="lbl">punti attesi</div>
            </>
          ) : (
            <div className="tag bad">non ammesso</div>
          )}
        </div>
      </div>

      {ev.eligible && (
        <div className="tags">
          <span className="tag green">🎾 {ev.expectedWins} vittorie attese</span>
          <span className="tag">🏆 titolo {pct(ev.winProbability)}</span>
          <span className="tag">📍 {ev.distanceKm} km</span>
          {ev.promotionProgress > 0 && (
            <span className="tag warn">⬆ {pct(ev.promotionProgress)} della promozione</span>
          )}
          {inPlan && <span className="tag green">✓ nel calendario ottimale</span>}
        </div>
      )}

      <ul className="reasons">
        {ev.reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>

      {ev.eligible && (
        <details style={{ marginTop: 8 }}>
          <summary className="muted small" style={{ cursor: "pointer" }}>
            Proiezione turno per turno
          </summary>
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Turno</th>
                <th>Avversario tipo</th>
                <th>Prob. di vincerlo</th>
                <th>Punti</th>
              </tr>
            </thead>
            <tbody>
              {ev.rounds.map((r, i) => (
                <tr key={i}>
                  <td>{r.label}</td>
                  <td>{r.opponentClass}</td>
                  <td>{pct(r.winChance)}</td>
                  <td>{r.pointsIfWin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {t.sourceUrl && ev.eligible && (
        <div style={{ marginTop: 10 }}>
          <a href={t.sourceUrl} target="_blank" rel="noreferrer" className="small">
            Apri sul portale FITP ↗
          </a>
        </div>
      )}
    </div>
  );
}
