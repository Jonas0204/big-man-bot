import 'dotenv/config';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { handleSplitTeamInteraction, splitTeamCommand } from './commands/split-team.js';
import { handleRestoreTeamInteraction, restoreTeamCommand } from './commands/restore-team.js';
import { handleHelpInteraction, helpCommand } from './commands/help.js';

if (!process.env.DISCORD_TOKEN) {
  throw new Error('Fehlende Umgebungsvariable: DISCORD_TOKEN');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot ist online als ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName === splitTeamCommand.name) {
    await handleSplitTeamInteraction(interaction);
    return;
  }

  if (interaction.commandName === restoreTeamCommand.name) {
    await handleRestoreTeamInteraction(interaction);
    return;
  }

  if (interaction.commandName === helpCommand.name) {
    await handleHelpInteraction(interaction);
  }
});

client.login(process.env.DISCORD_TOKEN);
