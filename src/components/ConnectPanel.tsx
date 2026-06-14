import { useState } from "react";
import type { PlayerProfile } from "../types";
import {
  fetchFromConnector,
  forgetSession,
  loadConnectorUrl,
  loadSession,
  rememberSession,
  saveConnectorUrl,
  type FitpData,
} from "../lib/fitpConnect";

interface Props {
  onData: (data: FitpData, mode: "replace" | "merge") => void;
  hasProfile: PlayerProfile;
  matchesCount: number;
}

export function ConnectPanel({ onData }: Props) {
  const existing = loadSession();
  const [username, setUsername] = useState(existing?.username ?? "");
  const [password, setPassword] = useState(existing?.password ?? "");
  const [consent, setConsent] = useState(existing?.consent ?? false);
  const [connector, setConnector] = useState(loadConnectorUrl());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);

  const connect = async () => {
    if (!consent) {
      setMsg({ kind: "err", text: "Devi dare il consenso all'uso delle tue credenziali su questo dispositivo." });
      return;
    }
    if (!username || !password) {
      setMsg({ kind: "err", text: "Inserisci utenza e password FITP." });
      return;
    }
    saveConnectorUrl(connector.trim());
    rememberSession({ username, password, consent });
    setBusy(true);
    setMsg({ kind: "info", text: "Connessione al connector in corso…" });
    try {
      const data = await fetchFromConnector(connector, { username, password, consent });
      const nMatches = data.matches?.length ?? 0;
      onData(data, "replace");
      setMsg({
        kind: "ok",
        text: `Dati FITP importati: profilo ${data.profile ? "aggiornato" : "invariato"}, ${nMatches} partite.`,
      });
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const forget = () => {
    forgetSession();
    setUsername("");
    setPassword("");
    setConsent(false);
    setMsg({ kind: "info", text: "Credenziali dimenticate da questo dispositivo." });
  };

  return (
    <div className="grid cols-2">
      <div className="card">
        <h2>🔐 Collega il tuo account FITP</h2>
        <p className="muted small">
          Inserisci le tue credenziali FITP per assorbire automaticamente profilo e storico. Le
          credenziali restano <strong>solo su questo dispositivo</strong> (sessione del browser) e
          vengono inviate <strong>esclusivamente</strong> al connector che configuri tu — mai a
          terzi e mai salvate nel sito.
        </p>

        <div className="form-row">
          <div>
            <label className="field">Utenza FITP (tessera / codice fiscale)</label>
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="es. tessera o codice fiscale"
            />
          </div>
          <div>
            <label className="field">Password FITP</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="field">URL del connector (il tuo backend che fa il login)</label>
          <input
            value={connector}
            onChange={(e) => setConnector(e.target.value)}
            placeholder="https://il-mio-connector.example/fitp"
          />
        </div>

        <label
          style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "12px 0", fontSize: 13 }}
        >
          <input
            type="checkbox"
            style={{ width: "auto", marginTop: 3 }}
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            Acconsento a usare le mie credenziali FITP su questo dispositivo per scaricare i miei
            dati tramite il connector indicato.
          </span>
        </label>

        <div className="btn-row">
          <button onClick={connect} disabled={busy}>
            {busy ? "Connessione…" : "Connetti e importa i miei dati"}
          </button>
          <button className="ghost" onClick={forget} disabled={busy}>
            Dimentica credenziali
          </button>
        </div>

        {msg && (
          <div
            className="small"
            style={{
              marginTop: 12,
              color:
                msg.kind === "ok" ? "var(--good)" : msg.kind === "err" ? "var(--bad)" : "var(--muted)",
            }}
          >
            {msg.text}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Come ottenere il connector</h2>
        <p className="muted small">
          Il portale FITP non espone un'API pubblica e i risultati dei singoli incontri sono visibili
          solo dopo il login. Il browser, da solo, non puo autenticarsi su fitp.it (CORS). Hai due
          strade sicure:
        </p>

        <h3>A · Connector a build-time (consigliato)</h3>
        <div className="hint">
          Esegui in locale o in GitHub Actions, con le credenziali come variabili d'ambiente
          (mai nel repo):
          <br />
          <br />
          <code>
            FITP_USERNAME=... FITP_PASSWORD=... \<br />
            FITP_LOGIN_URL=... npm run fetch:me
          </code>
          <br />
          <br />
          Scrive <code>public/data/my-data.json</code>, che l'app carica all'avvio per
          aggiornare profilo e storico. Vedi{" "}
          <code>scripts/fitp/fetch-my-data.mjs</code>.
        </div>

        <div className="spacer" />
        <h3>B · Connector come servizio</h3>
        <div className="hint">
          Esponi lo stesso script come endpoint HTTP (un tuo piccolo server) che accetta{" "}
          <code>{`{ username, password }`}</code> e risponde{" "}
          <code>{`{ profile, matches }`}</code>. Incolla qui sopra il suo URL: le credenziali
          verranno inviate solo a lui.
        </div>

        <div className="spacer" />
        <div className="banner warn" style={{ margin: 0 }}>
          ⚠ Sicurezza: non incollare mai le credenziali in connector di terzi di cui non ti fidi.
          Questo progetto non le trasmette ad altri server al di fuori di quello che indichi tu.
        </div>
      </div>
    </div>
  );
}
