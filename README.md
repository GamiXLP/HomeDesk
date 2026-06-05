# HomeDesk

Privates Smart-Home-Ticketsystem im Home-Assistant-Stil für zwei Rollen: Admin/Bearbeiter und Benutzerin/Antragstellerin.

## MVP-Funktionen

- Supabase Auth Login per E-Mail/Passwort
- Rollen über `profiles.role`
- Dashboard mit Statuskarten und Bereichskacheln
- Ticket erstellen
- Ticketliste mit Suche und Offen-Filter
- Ticketdetailseite
- Kommentare öffentlich/intern
- Admin kann Status und Priorität ändern
- PostgreSQL RLS schützt Daten serverseitig
- Netlify SPA-Deployment vorbereitet

## Architektur

Frontend:
- React + TypeScript + Vite
- Tailwind CSS
- React Router
- Lucide Icons
- Recharts für Statistik

Backend:
- Supabase Auth
- Supabase PostgreSQL
- Supabase RLS
- Supabase Storage vorbereitet für `ticket-attachments`

## Lokale Installation

```bash
npm install
cp .env.example .env
npm run dev
```

Dann `.env` befüllen:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## Supabase einrichten

1. Neues Supabase-Projekt erstellen.
2. SQL Editor öffnen.
3. Inhalt von `supabase/migrations/001_init_homedesk.sql` ausführen.
4. In Storage einen privaten Bucket erstellen: `ticket-attachments`.
5. Danach `supabase/migrations/002_storage.sql` ausführen.
6. Optional `supabase/seed.sql` ausführen.
7. In Supabase Auth zwei Nutzer anlegen.
8. In `profiles` deinen Nutzer auf `admin` setzen:

```sql
update public.profiles
set role = 'admin', display_name = 'Gerhard'
where id = 'DEINE_AUTH_USER_UUID';

update public.profiles
set role = 'user', display_name = 'Samantha'
where id = 'SAMANTHA_AUTH_USER_UUID';
```

## Wichtiger Hinweis zu Registrierung

Im MVP ist keine öffentliche Registrierung verlinkt. Lege Nutzer zuerst manuell in Supabase Auth an. Das passt zu deinem Wunsch: öffentlich erreichbar, aber nur nach Login nutzbar.

## Netlify Deployment

1. Projekt nach GitHub pushen.
2. Netlify mit dem Repository verbinden.
3. Build Command: `npm run build`
4. Publish Directory: `dist`
5. Environment Variables in Netlify setzen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. `netlify.toml` enthält bereits den SPA-Fallback.

## Projektstruktur

```text
src/
  components/
    dashboard/
    layout/
    tickets/
    ui/
  constants/
  hooks/
  lib/
  pages/
  routes/
  styles/
  types/
supabase/
  migrations/
  seed.sql
```

## Nächste Ausbaustufen

- Datei-Upload UI mit Supabase Storage
- Ticket-Historie sichtbar rendern
- Realtime Subscriptions für neue Tickets und Kommentare
- Home-Assistant Webhook über Supabase Edge Function oder Netlify Function
- E-Mail-Benachrichtigungen
- Einstellungen aus DB statt statischer Konstanten
- Benutzerverwaltung im Admin-Bereich
