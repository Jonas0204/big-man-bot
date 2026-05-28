import { MessageFlags, SlashCommandBuilder } from 'discord.js';

export const helpCommand = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Zeigt alle verfügbaren Bot-Befehle an.');

export async function handleHelpInteraction(interaction) {
  await interaction.reply({
    content: [
      'Verfügbare Befehle:',
      '- `/help`: Zeigt diese Übersicht an.',
      '- `/split-team`: Teilt Nutzer aus deinem aktuellen Voice-Channel zufällig auf Team 1 und Team 2 auf.',
      '- `/configure`: Setzt Team 1, Team 2 und den Default-Channel für diesen Server.',
      '- `/set-team1`: Setzt den Team-1-Voice-Channel für diesen Server.',
      '- `/set-team2`: Setzt den Team-2-Voice-Channel für diesen Server.',
      '- `/show-team-config`: Zeigt die aktuelle Team-Konfiguration dieses Servers.',
      '- `/reset-config`: Löscht die Team-Konfiguration dieses Servers.',
      '- `/reset-channel`: Holt alle Nutzer aus Team 1 und Team 2 zurück in den Default-Channel.',
    ].join('\n'),
    flags: MessageFlags.Ephemeral,
  });
}
