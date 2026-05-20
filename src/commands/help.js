import { SlashCommandBuilder } from 'discord.js';

export const helpCommand = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Zeigt alle verfügbaren Bot-Befehle an.');

export async function handleHelpInteraction(interaction) {
  await interaction.reply({
    content: [
      'Verfügbare Befehle:',
      '- `/split-team`: Teilt den aktuellen Voice-Channel zufällig in Team 1 und Team 2 auf.',
      '- `/restore-team`: Verschiebt alle Mitglieder aus Team 1 und Team 2 zurück in den Ursprungskanal.',
      '- `/help`: Zeigt diese Übersicht an.',
    ].join('\n'),
    ephemeral: true,
  });
}
