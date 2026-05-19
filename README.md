# big-man-bot

Ein schlanker Discord-Bot mit dem Slash-Command `/split-team`.

## Funktion

`/split-team` teilt alle echten Nutzer aus deinem aktuellen Voice-Channel zufällig in zwei Teams auf und verschiebt sie in zwei bestehende Voice-Channels.

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

3. Slash-Command als Guild-Command registrieren:

```bash
npm run register
```

4. Bot starten:

```bash
npm start
```

## Umgebungsvariablen

- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID`
- `TEAM_1_CHANNEL_ID`
- `TEAM_2_CHANNEL_ID`
