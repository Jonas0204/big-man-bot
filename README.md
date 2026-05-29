# big-man-bot

Ein schlanker Discord.js Gateway-Bot mit serverabhängiger Team-Konfiguration und dem Slash-Command `/split-team`.

## Funktion

- `/help` zeigt eine Übersicht aller verfügbaren Befehle.
- `/configure` setzt Team 1, Team 2, optional Team 3 bis Team 6 und den Default-Channel für den aktuellen Server.
- `/showroles` aktiviert oder deaktiviert die Positions-Tags bei `/split-team`.
- `/set-team1` setzt nur den Team-1-Voice-Channel für den aktuellen Server.
- `/set-team2` setzt nur den Team-2-Voice-Channel für den aktuellen Server.
- `/show-team-config` zeigt die gespeicherte Team-Konfiguration des aktuellen Servers.
- `/reset-config` löscht die Team-Konfiguration des aktuellen Servers.
- `/reset-channel` holt alle Nutzer aus den konfigurierten Team-Channels in den Default-Channel zurück.
- `/split-team` nimmt alle echten Nutzer aus deinem aktuellen Voice-Channel, mischt sie zufällig und verschiebt sie in die konfigurierten Team-Channels (optional mit `(Top)`, `(Jungle)`, `(Mid)`, `(sup)`, `(adc)` pro Team-Liste).
- `/split-team-in-3` nimmt alle echten Nutzer aus dem Default-Channel und verschiebt sie stapelweise in 3er-Gruppen auf die konfigurierten Team-Channels; der Rest landet gesammelt im nächsten freien Team.

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
- Änderungen erfolgen immer für die aktuelle `interaction.guildId`; es gibt keinen Command-Parameter, um fremde Guild-IDs zu überschreiben.
- Optional konfigurierte `OWNER_USER_IDS` sind globale Bot-Owner und dürfen absichtlich serverübergreifend Konfigurations-Commands nutzen.
