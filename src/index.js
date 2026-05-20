import 'dotenv/config';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { handleSplitTeamInteraction, splitTeamCommand } from './commands/split-team.js';
import { handleHelpInteraction, helpCommand } from './commands/help.js';
import {
  configureCommand,
  handleConfigureInteraction,
  handleResetTeamInteraction,
  handleSetTeam1Interaction,
  handleSetTeam2Interaction,
  handleShowTeamConfigInteraction,
  resetTeamCommand,
  setTeam1Command,
  setTeam2Command,
  showTeamConfigCommand,
} from './commands/team-config.js';

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

  if (interaction.commandName === helpCommand.name) {
    await handleHelpInteraction(interaction);
    return;
  }

  if (interaction.commandName === setTeam1Command.name) {
    await handleSetTeam1Interaction(interaction);
    return;
  }

  if (interaction.commandName === setTeam2Command.name) {
    await handleSetTeam2Interaction(interaction);
    return;
  }

  if (interaction.commandName === configureCommand.name) {
    await handleConfigureInteraction(interaction);
    return;
  }

  if (interaction.commandName === resetTeamCommand.name) {
    await handleResetTeamInteraction(interaction);
    return;
  }

  if (interaction.commandName === showTeamConfigCommand.name) {
    await handleShowTeamConfigInteraction(interaction);
  }
});

client.login(process.env.DISCORD_TOKEN);
