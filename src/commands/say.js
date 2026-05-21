import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';

export const sayCommand = new SlashCommandBuilder()
  .setName('say')
  .setDescription('Sendet eine Nachricht als Bot in einen anderen Channel.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('Der Ziel-Channel, in den die Nachricht gesendet werden soll.')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('message')
      .setDescription('Die Nachricht, die gesendet werden soll.')
      .setRequired(true),
  );

export async function handleSayInteraction(interaction) {
  const channel = interaction.options.getChannel('channel');
  const message = interaction.options.getString('message');

  if (!channel.isTextBased()) {
    await interaction.reply({
      content: 'Der angegebene Channel ist kein Text-Channel.',
    });
    return;
  }

  try {
    await channel.send(message);
    await interaction.reply({
      content: `Nachricht wurde in ${channel} gesendet.`,
    });
  } catch {
    await interaction.reply({
      content: `Fehler: Die Nachricht konnte nicht in ${channel} gesendet werden.`,
    });
  }
}
