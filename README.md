# SuiteASD Platform Admin

Back-office piattaforma collegato a **[Mikirucci/SuiteASD](https://github.com/Mikirucci/SuiteASD)**.

Legge le società (e aggregati tesserati/squadre/documenti/eventi/pagamenti) dal database SuiteASD, poi gestisce overlay operativi: esenzione pagamento, visibilità dati, note, audit.

## Collegamento a SuiteASD

1. **Live DB** — imposta `SUITEASD_DATABASE_URL` (o `SUITEASD_SQLITE_PATH`) sul SQLite di `SuiteASD/apps/api/prisma/dev.db`
2. **Snapshot** — se il DB non è raggiungibile, usa `data/suiteasd-snapshot.json` esportato dal seed ufficiale di Michele
3. Pulsante **Sincronizza da SuiteASD** in dashboard

I campi `billingExempt` / policy GDPR restano sul Platform Admin (non esistono nel tenant SuiteASD).

## Stack

Next.js 15 · TypeScript · Tailwind · Postgres (Cursor) / PGlite in locale · better-sqlite3 verso SuiteASD

## Avvio locale

```bash
cp .env.example .env
# opzionale: copia il DB seedato di SuiteASD
# cp ../SuiteASD/apps/api/prisma/dev.db ./data/suiteasd-source.db

npm install
npm run db:seed
npm run dev
```

Apri `http://127.0.0.1:3847`

### Credenziali

- Email: `admin@suiteasd.platform`
- Password: `AdminSuiteASD2026!`

## Deploy

L’app dichiara Postgres con `cursor-app.json`. In hosting, `DATABASE_URL` viene iniettato automaticamente. Imposta il secret `AUTH_SECRET` e, se hai un DB SuiteASD raggiungibile, `SUITEASD_DATABASE_URL`.
