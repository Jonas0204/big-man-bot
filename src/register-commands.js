import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { splitTeamCommand } from './commands/split-team.js';
import { restoreTeamCommand } from './commands/restore-team.js';
import { helpCommand } from './commands/help.js';

if (!process.env.DISCORD_TOKEN) {
  throw new Error('Fehlende Umgebungsvariable: DISCORD_TOKEN');
}

const appId = process.env.APP_ID ?? process.env.CLIENT_ID;

if (!appId) {
  throw new Error('Fehlende Umgebungsvariable: APP_ID oder CLIENT_ID');
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
const commands = [
  splitTeamCommand.toJSON(),
  restoreTeamCommand.toJSON(),
  helpCommand.toJSON(),
];

async function registerCommands() {
  if (process.env.GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(appId, process.env.GUILD_ID), {
      body: commands,
    });
    console.log(`Slash-Commands als Guild-Commands registriert (GUILD_ID=${process.env.GUILD_ID}).`);
    return;
  }

  await rest.put(Routes.applicationCommands(appId), {
    body: commands,
  });
  console.log('Slash-Commands global registriert.');
}

registerCommands().catch((error) => {
  console.error('Fehler bei der Command-Registrierung:', error);
  process.exit(1);
});
