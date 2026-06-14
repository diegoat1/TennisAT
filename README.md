# TennisAT 🎾

Web app per chi gioca a tennis in Italia (circuito **FITP**): costruisce il tuo
**profilo**, organizza lo **storico partite** e — soprattutto — ti dice **quali
tornei conviene giocare per salire di categoria più in fretta**.

Pensata per un giocatore della **squadra di Cividale del Friuli** residente a
**Udine**, con il calendario tornei del **Friuli-Venezia Giulia** (Udine,
Pordenone, Gorizia, Trieste).

> Sito statico, deployabile su **GitHub Pages**. I dati del profilo restano sul
> tuo dispositivo (localStorage): nessun server.

## Cosa fa

- **Profilo**: classifica attuale (4.NC → 1ª categoria), punti stagione e barra
  di avanzamento verso la prossima promozione.
- **Storico partite**: diario delle partite con rendimento per classifica
  avversario, forma recente, miglior vittoria e stima dei punti FITP.
- **Ottimizzatore tornei** 🎯: valuta ogni torneo della regione e calcola un
  **calendario ottimale** (senza sovrapposizioni di date) che massimizza i punti
  attesi verso la promozione, tenendo conto della distanza da casa.
- **Import/Export**: porta dentro il tuo storico via CSV o JSON; esporta un
  backup.

## Come funziona l'ottimizzatore

Per ogni torneo proietta il percorso nel tabellone turno per turno:

1. **Probabilità di vittoria** per turno con un modello logistico sulla
   differenza di gradini di classifica (a pari classifica = 50%).
2. **Punti FITP attesi** usando il coefficiente ufficiale del valore incontro:
   vittoria su pari = **60**, +1 gruppo = **90**, +2 = **120**, −1 = 30,
   −2 = 20, −3 = 15, −4+ = 0.
3. **Costo di trasferta** (distanza haversine dalla tua città) sottratto come
   penalità configurabile.
4. **Calendario ottimale**: selezione greedy dei tornei più convenienti che non
   si sovrappongono nelle date, fino a raggiungere la soglia di promozione.

Le soglie di promozione sono indicative (es. ~505 punti per la 4.1) e
modificabili in `src/data/classifications.ts`.

## Collegare il proprio account FITP 🔐

La scheda **Collega FITP** permette di assorbire automaticamente profilo e
storico. Poiché FITP non ha un'API pubblica, i risultati dei singoli incontri
sono visibili solo dopo il login e il browser non può autenticarsi su `fitp.it`
(CORS), il collegamento avviene tramite un **connector** che usa le tue
credenziali in modo sicuro:

- **Le credenziali restano sul tuo dispositivo** (sessione del browser) e
  vengono inviate solo al connector che configuri tu, mai a terzi né salvate
  nel repo.
- **Connector a build-time (consigliato)** — esegui con le credenziali come
  variabili d'ambiente; produce `public/data/my-data.json` che l'app carica
  all'avvio (file ignorato da git):

  ```bash
  FITP_USERNAME=... FITP_PASSWORD=... \
  FITP_LOGIN_URL=...  FITP_PROFILE_URL=...  FITP_MATCHES_URL=... \
  npm run fetch:me
  ```

  In GitHub Actions imposta `FITP_USERNAME`/`FITP_PASSWORD` come **Secrets** e
  gli URL come **Variables**: il deploy li userà automaticamente.
- **Connector come servizio** — esponi lo stesso script come endpoint HTTP
  (`{ username, password }` → `{ profile, matches }`) e incolla il suo URL nella
  scheda Collega FITP.

> Il flusso di login e gli endpoint dell'area riservata FITP non sono pubblici:
> `scripts/fitp/fetch-my-data.mjs` è una base da adattare allo schema reale.
> Le credenziali non finiscono mai nel browser pubblico né nel repository.

## Dati dei tornei

Il calendario vive in [`public/data/tournaments.json`](public/data/tournaments.json)
(dati di esempio reali del FVG). GitHub Pages è statico e il browser non può
leggere `fitp.it` direttamente (CORS), perciò i tornei si aggiornano a
**build-time**:

```bash
# senza endpoint: mantiene il calendario seed
npm run scrape

# con endpoint reale del Portale Unico Competizioni (PUC)
FITP_SEARCH_URL="https://.../endpoint-ricerca-tornei" npm run scrape
```

Vedi [`scripts/fitp/scrape-tournaments.mjs`](scripts/fitp/scrape-tournaments.mjs)
per adattare il mapping allo schema dell'endpoint. La GitHub Action lo esegue ad
ogni deploy se imposti la variabile `FITP_SEARCH_URL` nelle repo Variables.

## Sviluppo

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # output in dist/
npm run preview    # anteprima della build
```

## Deploy su GitHub Pages

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Push su `main`: il workflow
   [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builda e
   pubblica `dist/`.

Il `base` di Vite è `./` (percorsi relativi), quindi funziona sia in locale sia
su `https://<utente>.github.io/<repo>/`.

## Note

- Il modello di punti e le probabilità sono una **stima**: la classifica FITP
  ufficiale usa le migliori vittorie e formule supplementari. Servono a
  confrontare i tornei tra loro, non a sostituire il calcolo federale.
- Lo storico importato non lascia il browser.
