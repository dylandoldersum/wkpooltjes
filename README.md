# WK Pooltjes 2026

Interne WK-pool voor op kantoor. Voorspel scores, vul bonusvragen in, bouw je bracket en zie wie er bovenaan staat.

**Stack:** Next.js 15 (App Router) · Drizzle ORM · Turso (libSQL/SQLite) · Tailwind · bcrypt + JWT auth · TypeScript

## Lokaal draaien

```bash
npm install
cp .env.example .env.local
# Genereer een random AUTH_SECRET en zet 'm in .env.local:
#   openssl rand -base64 32

npm run db:push        # database aanmaken (lokaal: ./local.db)
npm run db:seed        # 48 teams + 72 wedstrijden + bonusvragen seeden
npm run db:create-admin   # eerste admin-gebruiker aanmaken

npm run dev
# open http://localhost:3000
```

## Features

- **Voorspellingen**: per wedstrijd score invullen, auto-save, lockt bij aftrap. 5 pt voor exacte score, 2 pt voor juiste toto.
- **Bonusvragen**: kampioen, finalist, topscorer, etc. Sluiten bij eerste wedstrijd.
- **Knockout bracket**: voorspel welke teams welke ronde halen. R16 = 3 pt, QF = 5 pt, SF = 8 pt, Finale = 12 pt.
- **Live ranglijst**: realtime per gebruiker totaalpunten over alle onderdelen.
- **Admin**: uitslagen invoeren, kickoff-tijden aanpassen, juiste antwoorden zetten — herberekent automatisch.

## Deploy op Vercel + Turso

1. **Turso setup** (gratis tier, ~9 GB en 1 mld reads/maand)
   ```bash
   brew install tursodatabase/tap/turso   # of zie https://docs.turso.tech/quickstart
   turso auth signup
   turso db create wkpooltjes
   turso db show wkpooltjes               # URL noteren
   turso db tokens create wkpooltjes      # auth-token noteren
   ```

2. **Schema pushen naar productie-DB**
   ```bash
   # Zet TURSO_DATABASE_URL=libsql://... en TURSO_AUTH_TOKEN=... in .env.local
   npm run db:push
   npm run db:seed
   npm run db:create-admin
   ```

3. **Deployen op Vercel**
   - Push deze repo naar GitHub
   - Op vercel.com: New Project → import → framework auto-detect (Next.js)
   - Environment variables zetten:
     - `TURSO_DATABASE_URL` = `libsql://wkpooltjes-<naam>.turso.io`
     - `TURSO_AUTH_TOKEN` = (token uit stap 1)
     - `AUTH_SECRET` = `openssl rand -base64 32`
     - `CRON_SECRET` = `openssl rand -hex 32` (zelfde waarde lokaal en in Vercel)
     - `FOOTBALL_DATA_API_KEY` = zie stap 4
   - Deploy

4. **Klaar** — deel de URL op kantoor 🎉

## Auto-sync uitslagen instellen (optioneel)

Zonder sync moet je elke uitslag handmatig invoeren via `/admin/wedstrijden`. Met sync gebeurt het vanzelf.

1. **Football-data.org account aanmaken** (gratis)
   - Ga naar https://www.football-data.org/client/register
   - Bevestig je e-mail → API key staat in je profiel
   - Vrije tier: 10 calls/minuut — meer dan genoeg

2. **API key + cron-secret toevoegen aan Vercel env vars**
   - `FOOTBALL_DATA_API_KEY` = jouw key
   - `CRON_SECRET` = `openssl rand -hex 32`

3. **Twee opties voor het automatisch triggeren:**

   **A. Eenmaal per dag (gratis Vercel Hobby)**
   Vercel-cron staat al ingesteld in `vercel.json` om dagelijks om 06:00 UTC te draaien.
   Na een match-dag is alles uiterlijk de volgende ochtend bijgewerkt.

   **B. Elke 15 min (extern, ook gratis)**
   Voor (bijna-)realtime updates: gebruik [cron-job.org](https://cron-job.org).
   - Maak een gratis account aan
   - Nieuwe cron job:
     - URL: `https://jouwapp.vercel.app/api/cron/sync-results`
     - Schedule: `*/15 * * * *` (elke 15 min)
     - Header: `Authorization: Bearer <CRON_SECRET>` (zelfde waarde als in Vercel)
   - Tijdens het WK staat 'ie aan; na het toernooi pauzeer/verwijder je hem

4. **Handmatige sync** (los van cron)
   Via `/admin` → knop **"Sync nu"**. Handig om direct na een wedstrijd te checken.

### Hoe werkt de matching?

De sync zoekt per afgeronde wedstrijd in de API een match in onze DB met:
- dezelfde teamcodes (TLA) en
- kickoff binnen ±48 uur van de API-tijd

Werkt geen match? Check de admin-pagina: niet-gekoppelde wedstrijden worden getoond met hun TLA's. Voeg eventuele afwijkingen toe aan `TLA_ALIASES` in `lib/football-data.ts`.

## Scoring overzicht

| Onderdeel | Punten |
|---|---|
| Exacte score wedstrijd | 5 |
| Juiste toto (1-X-2) | 2 |
| Bonus: wereldkampioen | 25 |
| Bonus: finalist | 15 |
| Bonus: nr. 3 | 10 |
| Bonus: topscorer | 15 |
| Bonus overig | 10 |
| Bracket — achtste finalist | 3 |
| Bracket — kwartfinalist | 5 |
| Bracket — halvefinalist | 8 |
| Bracket — finalist | 12 |

Wedstrijdpunten worden automatisch herberekend wanneer een admin de eindstand invoert. Bonus- en bracket-punten zodra de admin het juiste antwoord/team koppelt.

## Aanpassen

- **Andere scoring?** Pas `lib/scoring.ts` aan + de `points` per bonusvraag/slot in `scripts/seed.ts`.
- **Extra bonusvraag toevoegen?** Insert in `bonus_questions` (kan via Drizzle Studio: `npm run db:studio`).
- **Kickoff-tijden corrigeren?** Via de admin-pagina `/admin/wedstrijden` — klik op het tijdstip.
- **Iemand admin maken?** Run `npm run db:create-admin` met dat e-mailadres, of update direct in de DB.

## Veiligheidsnotes

- Wachtwoorden worden gehasht met bcrypt (cost 10).
- Sessie via JWT in httpOnly cookie (60 dagen geldig).
- Server actions valideren via Zod.
- Admin-checks via `requireAdmin()` aan de serverkant — niet alleen UI.
- Voorspellingen kunnen niet meer gewijzigd worden na aftrap (server-side check).
