import { useState } from "react";
import type { Match, PlayerProfile } from "../types";
import {
  category,
  classLabel,
  nextClass,
  nextThreshold,
} from "../data/classifications";
import { computeStats, type HistoryStats } from "../lib/stats";
import { CLASS_OPTIONS } from "../lib/format";

interface Props {
  profile: PlayerProfile;
  matches: Match[];
  onChange: (p: PlayerProfile) => void;
}

export function ProfilePanel({ profile, matches, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const stats = computeStats(profile, matches);
  const cat = category(profile.classification);
  const nxt = nextClass(profile.classification);
  const threshold = nextThreshold(profile.classification);
  const progress = threshold ? Math.min(1, profile.points / threshold) : 1;
  const remaining = threshold ? Math.max(0, threshold - profile.points) : 0;

  return (
    <div className="grid cols-2">
      <div className="card">
        <div className="profile-top">
          <div className={`badge-class cat-${cat}`}>{profile.classification}</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{profile.name}</div>
            <div className="muted small">{classLabel(profile.classification)}</div>
            <div className="muted small">
              {profile.club} · {profile.homeCity}
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <button className="ghost small" onClick={() => setEditing((v) => !v)}>
              {editing ? "Chiudi" : "Modifica"}
            </button>
          </div>
        </div>

        <div className="spacer" />

        {nxt ? (
          <>
            <div className="progress-label">
              <span>
                Verso la promozione a <strong style={{ color: "var(--lime)" }}>{nxt}</strong>
              </span>
              <span>
                {profile.points} / {threshold} pt
              </span>
            </div>
            <div className="progress">
              <span style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="muted small" style={{ marginTop: 6 }}>
              Ti mancano <strong>{remaining} punti</strong> per salire di categoria.
            </div>
          </>
        ) : (
          <div className="muted">Sei al vertice della scala modellata.</div>
        )}

        {editing && <ProfileForm profile={profile} onSave={(p) => { onChange(p); setEditing(false); }} />}
      </div>

      <StatsCard stats={stats} />
    </div>
  );
}

function StatsCard({ stats }: { stats: HistoryStats }) {
  return (
    <div className="card">
      <h3>Lo storico in numeri</h3>
      <div className="stat-row">
        <div className="stat">
          <div className="num">{stats.total}</div>
          <div className="lbl">Partite</div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: "var(--good)" }}>{stats.wins}</div>
          <div className="lbl">Vittorie</div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: "var(--bad)" }}>{stats.losses}</div>
          <div className="lbl">Sconfitte</div>
        </div>
        <div className="stat">
          <div className="num">{Math.round(stats.winRate * 100)}%</div>
          <div className="lbl">Win rate</div>
        </div>
      </div>

      <div className="spacer" />
      <div className="kv">
        <dt>Forma recente</dt>
        <dd>
          <div className="form-pills">
            {stats.form.length === 0 && <span className="muted">-</span>}
            {stats.form.map((r, i) => (
              <span key={i} className={`pill ${r}`}>{r}</span>
            ))}
          </div>
        </dd>
        <dt>Miglior vittoria</dt>
        <dd>
          {stats.bestWin
            ? `${stats.bestWin.opponent} (${stats.bestWin.opponentClass})`
            : "-"}
        </dd>
        <dt>Punti stimati dallo storico</dt>
        <dd>~{stats.estimatedPoints} pt</dd>
        <dt>Sconfitte con pari/inferiori</dt>
        <dd style={{ color: stats.lossesVsLowerOrEqual > 0 ? "var(--warn)" : "var(--good)" }}>
          {stats.lossesVsLowerOrEqual}
        </dd>
      </div>
      <div className="hint" style={{ marginTop: 12 }}>
        I punti stimati sommano il coefficiente FITP di ogni vittoria. Sono una stima:
        la classifica ufficiale usa le migliori vittorie e formule supplementari.
      </div>
    </div>
  );
}

function ProfileForm({
  profile,
  onSave,
}: {
  profile: PlayerProfile;
  onSave: (p: PlayerProfile) => void;
}) {
  const [draft, setDraft] = useState<PlayerProfile>(profile);
  const set = (k: keyof PlayerProfile, v: string | number) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
      <div className="form-row">
        <div>
          <label className="field">Nome</label>
          <input value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className="field">Tessera FITP</label>
          <input value={draft.tessera ?? ""} onChange={(e) => set("tessera", e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div>
          <label className="field">Circolo</label>
          <input value={draft.club} onChange={(e) => set("club", e.target.value)} />
        </div>
        <div>
          <label className="field">Citta (per le distanze)</label>
          <input value={draft.homeCity} onChange={(e) => set("homeCity", e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div>
          <label className="field">Classifica</label>
          <select value={draft.classification} onChange={(e) => set("classification", e.target.value)}>
            {CLASS_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field">Punti stagione</label>
          <input
            type="number"
            value={draft.points}
            onChange={(e) => set("points", Number(e.target.value))}
          />
        </div>
        <div>
          <label className="field">Genere</label>
          <select value={draft.gender} onChange={(e) => set("gender", e.target.value)}>
            <option value="M">Maschile</option>
            <option value="F">Femminile</option>
          </select>
        </div>
      </div>
      <div className="btn-row">
        <button onClick={() => onSave(draft)}>Salva profilo</button>
      </div>
    </div>
  );
}
