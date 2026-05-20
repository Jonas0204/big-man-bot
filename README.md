# big-man-bot

Ein schlanker Discord.js Gateway-Bot mit serverabhängiger Team-Konfiguration und dem Slash-Command `/split-team`.

## Funktion

- `/configure` setzt Team 1 und Team 2 für den aktuellen Server.
- `/set-team1` setzt nur den Team-1-Voice-Channel für den aktuellen Server.
- `/set-team2` setzt nur den Team-2-Voice-Channel für den aktuellen Server.
- `/show-team-config` zeigt die gespeicherte Team-Konfiguration des aktuellen Servers.
- `/reset-team` löscht die Team-Konfiguration des aktuellen Servers.
- `/split-team` nimmt alle echten Nutzer aus deinem aktuellen Voice-Channel, mischt sie zufällig und verschiebt sie in die konfigurierten Team-Channels.

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
- `OWNER_USER_IDS` (optional, kommaseparierte User-IDs mit globalem Zugriff auf Konfigurations-Commands)

## Persistente Team-Konfiguration

- Team-Channels werden pro Server in `data/team-config.json` gespeichert.
- Der Bot legt den `data`-Ordner und die Datei automatisch an, falls sie fehlen.
