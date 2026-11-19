# SuiteASD Platform Admin

Back-office della piattaforma **SuiteASD**: dashboard operativa su tutte le società iscritte, esenzione pagamenti, matrice di visibilità dei dati (cosa l’operatore può vedere / non vedere / modificare), note, metriche e audit.

Non è il gestionale della singola società (quello è SuiteASD). Questo servizio è il pannello **operatore piattaforma**.

## Funzioni

- Login operatori piattaforma
- Dashboard aggregata (società, stati, esenzioni, tesserati/squadre, ricavi potenziali)
- CRUD società iscritte
- Flag **non far pagare** (`billingExempt`) con motivo
- Policy di visibilità dati globali e per società (contatti, fiscale, metriche, PII, medici, minori, pagamenti, documenti)
- Note operative, snapshot metriche, registro audit

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · Prisma · SQLite · JWT in cookie httpOnly

## Avvio locale

```bash
npm install
cp .env.example .env   # oppure usa il .env già presente in locale
npx prisma migrate dev
npm run db:seed
npm run dev
```

Apri [http://127.0.0.1:3847](http://127.0.0.1:3847).

### Credenziali seed

- Email: `admin@suiteasd.platform`
- Password: `AdminSuiteASD2026!`

## Script

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Dev server su porta **3847** |
| `npm run build` / `npm start` | Build e avvio produzione |
| `npm run db:seed` | Seed admin + società + policy |
| `npx prisma studio` | UI sul database |

## Note

- Il database SQLite locale (`prisma/dev.db`) non va committato.
- Cambia `AUTH_SECRET` prima di un deploy reale.
- Revoca eventuali token GitHub incollati in chat e usa secret manager / env.
