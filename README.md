# HomeDesk

HomeDesk ist ein privates Ticket- und Betriebsportal für Haushalt, Geräte und Home Assistant. Die Anwendung verbindet klassische Tickets mit Automationen, Live-Zuständen, Wartungsplanung, Wissensdokumentation und mobilen Benachrichtigungen.

Produktionsanwendung: [homedesk-smaragd.netlify.app](https://homedesk-smaragd.netlify.app)

## Funktionsumfang

### Tickets und Zusammenarbeit

- Rollenbasierter Zugriff für Administratoren und Benutzer
- Ticketnummern im Format `HD-10000000`
- Status, Prioritäten, Zuweisungen, Fälligkeiten und SLA-Fristen
- Kommentare, interne Notizen und Bildanhänge
- Unteraufgaben, Beobachter und wiederkehrende Tickets
- Ticketbeziehungen: Verknüpfung, Blockierung, Duplikat und Ursache
- Lösungszusammenfassung, Fehlerursache und dokumentierte Lösungsschritte
- Freigabedatenmodell für das Vier-Augen-Prinzip
- automatische Eskalation überfälliger Tickets
- E-Mail-Benachrichtigungen pro Benutzer deaktivierbar

### Intelligence und Arbeitsoberflächen

- priorisierte Arbeitsqueue mit Attention Score
- Vorschläge für ähnliche Tickets und Duplikaterkennung
- Volltext-nahe Suche mit Suchoperatoren und gespeicherten Suchen
- Flow Board, Fälligkeitskalender und persönlicher Fokus
- persistentes Benachrichtigungscenter und Activity Hub
- Lösungsbibliothek für wiederverwendbares Wissen
- Automation Studio

### Home Operations

- Geräte- und Assetakten mit Hersteller, Modell, Seriennummer und Garantie
- Verknüpfung von Assets mit Home-Assistant-Entitäten
- Live-Zustände aus Home Assistant über verschlüsselte OAuth-Tokens
- Raumansicht, Home Health Score und Wallboard
- QR-Gerätepass
- Wartungspläne mit automatischer Ticketerstellung
- abgesicherter HA-Webhook für automatische Erstellung und Auflösung von Tickets

### Mobile und Benachrichtigungen

- Android-App auf Basis von Capacitor
- Firebase Cloud Messaging für Android Push
- Push an Besitzer, Bearbeiter und Beobachter
- automatischer APK-Build über GitHub Actions
- E-Mail-Versand über SMTP

## Architektur

| Bereich | Technik |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router |
| Diagramme und UI | Recharts, Lucide Icons |
| Backend | Supabase Auth, PostgreSQL, Row Level Security und Storage |
| Serverfunktionen | Netlify Functions |
| Smart Home | Home-Assistant-OAuth, REST API und Webhook |
| Android | Capacitor, Firebase Cloud Messaging, Gradle |
| Deployment | Netlify und GitHub Actions |

## Lokale Entwicklung

Voraussetzungen: Node.js 22 oder neuer und npm.

```bash
npm ci
cp .env.example .env
npm run dev
```

Mindestens diese Werte müssen in `.env` gesetzt sein:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_HOME_ASSISTANT_URL=https://YOUR_HOME_ASSISTANT_URL
```

Wichtige Befehle:

```bash
npm run build
npm run android:sync
npx netlify build
```

## Supabase einrichten

Das Projekt verwendet die Supabase CLI und versionierte Migrationen. Bei einem neuen, verknüpften Projekt werden alle Migrationen so angewendet:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Aktuell gehören die Migrationen `001` bis `009` zum vollständigen Schema. Sie enthalten Profile, Tickets, Kommentare, RLS, Storage, Ticketnummern, Home-Assistant-Identitäten, Ticket Intelligence, Automationen, E-Mail-Präferenzen, Assets, Wartungspläne, SLA, Freigaben und das Benachrichtigungscenter.

Nach dem Anlegen des ersten Auth-Benutzers kann dessen Rolle im SQL Editor gesetzt werden:

```sql
update public.profiles
set role = 'admin', display_name = 'Gerhard'
where id = 'AUTH_USER_UUID';
```

Es gibt bewusst keine öffentliche Registrierung. Benutzer werden über Supabase Auth angelegt.

## Netlify-Konfiguration

- Build Command: `npm run build`
- Publish Directory: `dist`

Öffentliche Build-Variablen:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_HOME_ASSISTANT_URL
VITE_API_BASE_URL
VITE_PUBLIC_APP_URL
```

Serverseitige Variablen und Secrets:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
HOME_ASSISTANT_URL
HOME_ASSISTANT_TOKEN_ENCRYPTION_KEY
HOME_ASSISTANT_TICKET_WEBHOOK_SECRET
HOME_ASSISTANT_TICKET_OWNER_ID
FIREBASE_SERVICE_ACCOUNT_JSON
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
MAIL_FROM
ADMIN_EMAIL
```

Secrets müssen mindestens für den Netlify-Kontext `production` gesetzt werden. Änderungen an Variablen werden erst nach einem neuen Deployment aktiv.

## Home Assistant

Die Benutzerverknüpfung erfolgt in HomeDesk über Einstellungen → Home Assistant. Refresh-Tokens werden serverseitig mit AES-256-GCM verschlüsselt gespeichert. Der Browser erhält keine Home-Assistant-Zugangsdaten.

Automatische Tickets werden per `POST /.netlify/functions/home-assistant-ticket` mit `Authorization: Bearer HOME_ASSISTANT_TICKET_WEBHOOK_SECRET` erstellt:

```json
{
  "title": "Heizung nicht erreichbar",
  "description": "Die Entität ist seit zehn Minuten unavailable.",
  "entity_id": "climate.heizung",
  "area": "Wohnzimmer",
  "source_reference": "heizung-offline"
}
```

Dasselbe Ticket kann bei Entwarnung automatisch geschlossen werden:

```json
{
  "event": "resolved",
  "source_reference": "heizung-offline",
  "resolution": "Home Assistant meldet die Heizung wieder als erreichbar."
}
```

## Android-App

Die Android-Paket-ID lautet `de.gamixlp.homedesk`. Die Firebase-Datei liegt unter `android/app/google-services.json`.

Lokaler Build:

```bash
npm run android:sync
cd android
./gradlew assembleDebug
```

Bei jedem Push auf `main` erstellt GitHub Actions eine `HomeDesk.apk` und speichert sie für 30 Tage als Workflow-Artefakt.

## Produktionsbetrieb

- `ticket-automation` läuft über Netlify alle 15 Minuten.
- Der Worker verarbeitet wiederkehrende Tickets, Eskalationen und fällige Wartungen.
- Datenbankänderungen werden ausschließlich als neue Supabase-Migration eingecheckt.
- Secrets gehören in Netlify beziehungsweise GitHub Secrets und niemals in Client-Code.
- Vor einem Release sollten mindestens `npm ci`, `npm run build`, `npx netlify build` und der Android-Workflow erfolgreich sein.
- Die produktiven HA-Endpunkte müssen ohne gültige Authentifizierung mit `401` antworten.

## Projektstruktur

```text
android/                 Capacitor-Android-Projekt
netlify/functions/       API-, E-Mail-, HA- und Automationsfunktionen
netlify/lib/             gemeinsame serverseitige Module
src/components/          UI-, Layout- und Ticketkomponenten
src/hooks/               Auth-, Einstellungs- und Datenhooks
src/lib/                 Supabase-, Ticket-, Push- und HA-Zugriff
src/pages/               Anwendungsseiten
src/types/               TypeScript-Datenmodelle
supabase/migrations/     versioniertes Datenbankschema
```
