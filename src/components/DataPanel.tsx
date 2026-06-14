import { useRef, useState } from "react";
import type { Match, PlayerProfile } from "../types";
import { parseExportJSON, parseMatchesCSV } from "../lib/importers";
import { storage } from "../lib/storage";

interface Props {
  profile: PlayerProfile;
  matches: Match[];
  onImportMatches: (m: Match[], mode: "replace" | "append") => void;
  onReset: () => void;
}

export function DataPanel({ profile, matches, onImportMatches, onReset }: Props) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleText = (mode: "replace" | "append") => {
    if (!text.trim()) return;
    const trimmed = text.trim();
    const res = trimmed.startsWith("{") || trimmed.startsWith("[")
      ? parseExportJSON(trimmed)
      : parseMatchesCSV(trimmed);
    if (res.matches.length === 0) {
      setMsg({ kind: "err", text: `Nessuna partita importata. ${res.errors.join(" ")}` });
      return;
    }
    onImportMatches(res.matches, mode);
    setMsg({
      kind: "ok",
      text: `Importate ${res.matches.length} partite${res.errors.length ? ` (${res.errors.length} righe ignorate)` : ""}.`,
    });
    setText("");
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
    setMsg(null);
  };

  const exportJSON = () => {
    const data = storage.exportAll(profile, matches);
    download(`tennisat-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
  };

  return (
    <div className="grid cols-2">
      <div className="card">
        <h2>Importa il tuo storico FITP</h2>
        <p className="muted small">
          GitHub Pages e il browser non possono leggere direttamente il tuo profilo su fitp.it
          (lo blocca il CORS). Porta qui i tuoi dati incollando un CSV o un JSON, oppure caricando
          un file. Tutto resta salvato solo sul tuo dispositivo.
        </p>
        <div className="form-row" style={{ marginBottom: 8 }}>
          <div>
            <label className="field">Carica file (.csv / .json)</label>
            <input ref={fileRef} type="file" accept=".csv,.json,.txt" onChange={onFile} />
          </div>
        </div>
        <label className="field">…oppure incolla qui</label>
        <textarea
          rows={8}
          placeholder={"data,torneo,turno,avversario,classifica,risultato,punteggio\n2026-05-03,Open Udine,32,M. Rossi,4.3,V,6-4 6-2"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="btn-row" style={{ marginTop: 10 }}>
          <button onClick={() => handleText("append")}>Aggiungi allo storico</button>
          <button className="ghost" onClick={() => handleText("replace")}>
            Sostituisci tutto
          </button>
        </div>
        {msg && (
          <div
            className="small"
            style={{ marginTop: 10, color: msg.kind === "ok" ? "var(--good)" : "var(--bad)" }}
          >
            {msg.text}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Esporta e gestisci</h2>
        <p className="muted small">
          Salva un backup dei tuoi dati (profilo + {matches.length} partite) o riparti dai dati di
          esempio.
        </p>
        <div className="btn-row">
          <button onClick={exportJSON}>⬇ Esporta JSON</button>
          <button className="danger" onClick={onReset}>
            Ripristina dati di esempio
          </button>
        </div>

        <div className="spacer" />
        <h3>Formato CSV accettato</h3>
        <div className="hint">
          Intestazioni (in qualsiasi ordine, separatore , o ;):<br />
          <code>data, torneo, turno, avversario, classifica, risultato, punteggio</code>
          <br />
          <br />
          La data accetta <code>2026-05-03</code> o <code>03/05/2026</code>; il risultato accetta
          V/S, W/L, vinta/persa.
        </div>

        <div className="spacer" />
        <h3>Aggiornare i tornei</h3>
        <div className="hint">
          Il calendario tornei vive in <code>public/data/tournaments.json</code>. Per rinfrescarlo
          dal portale FITP lancia <code>npm run scrape</code> (vedi{" "}
          <code>scripts/fitp/scrape-tournaments.mjs</code>).
        </div>
      </div>
    </div>
  );
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
