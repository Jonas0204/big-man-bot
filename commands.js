import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const REQUIRED_ENV_VARS = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];

for (const envVar of REQUIRED_ENV_VARS) {
  if (!process.env[envVar]) {
    throw new Error(`Fehlende Umgebungsvariable: ${envVar}`);
  }
}

const commands = [
  new SlashCommandBuilder()
    .setName('split-team')
    .setDescription('Teilt alle Mitglieder deines aktuellen Voice-Channels zufällig in zwei Teams auf.')
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function registerGuildCommands() {
  await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
    body: commands,
  });

  console.log('Slash-Commands erfolgreich als Guild-Commands registriert.');
}

registerGuildCommands().catch((error) => {
  console.error('Fehler bei der Command-Registrierung:', error);
  process.exit(1);
});
