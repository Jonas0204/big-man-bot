# big-man-bot

Ein schlanker Discord.js Gateway-Bot mit den Slash-Commands `/split-team`, `/restore-team` und `/help`.

## Funktion

- `/split-team` teilt alle echten Nutzer aus deinem aktuellen Voice-Channel zufällig in zwei Teams auf und verschiebt sie in zwei bestehende Voice-Channels.
  - Optional kann `/split-team` per Env auf Admins oder den Server-Owner eingeschränkt werden.
  - Optionaler Testmodus erlaubt eine Vorschau mit nur einem Nutzer (ohne Verschieben, zufällige Zuweisung zu Team 1 oder Team 2).
- `/restore-team` verschiebt alle Mitglieder aus Team 1 und Team 2 zurück in den Ursprungskanal.
- `/help` zeigt eine Übersicht aller verfügbaren Bot-Befehle.

## Voraussetzungen

- Node.js 18+
- Ein Discord-Bot mit mindestens diesen Rechten:
  - View Channels
  - Connect
  - Move Members

## Einrichtung

1. Abhängigkeiten installieren:

```bash
npm install
```

2. `.env` aus `.env.example` erstellen und Werte eintragen.

3. Slash-Command registrieren:

```bash
npm run register
```

Wenn `GUILD_ID` gesetzt ist, wird als Guild-Command registriert (schnell für Entwicklung).
Wenn `GUILD_ID` fehlt, wird global registriert (für alle Server der App).

4. Bot starten:

```bash
npm start
```

## Docker (ohne Portfreigabe)

Der Bot nutzt die Discord Gateway-Verbindung nach außen und benötigt **keinen eingehenden Port**.

1. Image bauen:

```bash
docker build -t big-man-bot .
```

2. Container starten:

```bash
docker run -d --name big-man-bot --env-file .env big-man-bot
```

Alternativ mit Docker Compose lokal bauen und starten:

```bash
docker compose up -d --build
```

## Umgebungsvariablen

- `DISCORD_TOKEN`
- `APP_ID` oder `CLIENT_ID`
- `GUILD_ID` (optional für Development-Registrierung)
- `TEAM_1_CHANNEL_ID` und `TEAM_2_CHANNEL_ID` (globale Fallbacks)
- `ORIGINAL_CHANNEL_ID` (Zielkanal für `/restore-team`)
- `SPLIT_TEAM_ADMIN_ONLY` (optional: `true` = nur Admins dürfen `/split-team` nutzen)
- `SPLIT_TEAM_OWNER_ONLY` (optional: `true` = nur Server-Owner darf `/split-team` nutzen)
- `SPLIT_TEAM_TEST_MODE` (optional: `true` = `/split-team` funktioniert mit 1 Nutzer als Vorschau ohne Move, zufällige Teamzuweisung)

Optional pro Server (für Multi-Server-Betrieb):

- `TEAM_1_CHANNEL_ID_<GUILD_ID>`
- `TEAM_2_CHANNEL_ID_<GUILD_ID>`
- `ORIGINAL_CHANNEL_ID_<GUILD_ID>`
