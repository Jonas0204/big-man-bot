import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export const restoreTeamCommand = new SlashCommandBuilder()
  .setName('restore-team')
  .setDescription('Verschiebt alle Mitglieder aus Team 1 und Team 2 zurück in den Ursprungskanal.');

function getTeamChannelId(guildId, teamNumber) {
  return process.env[`TEAM_${teamNumber}_CHANNEL_ID_${guildId}`] ?? process.env[`TEAM_${teamNumber}_CHANNEL_ID`];
}

function getOriginChannelId(guildId) {
  return process.env[`ORIGINAL_CHANNEL_ID_${guildId}`] ?? process.env.ORIGINAL_CHANNEL_ID;
}

function validateVoiceChannel(channel) {
  return channel?.type === ChannelType.GuildVoice;
}

function getMissingPermissions(channel, member) {
  const permissions = channel.permissionsFor(member);
  const required = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.MoveMembers,
  ];

  return required.filter((permission) => !permissions?.has(permission));
}

async function getChannels(guild) {
  const team1ChannelId = getTeamChannelId(guild.id, 1);
  const team2ChannelId = getTeamChannelId(guild.id, 2);
  const originChannelId = getOriginChannelId(guild.id);

  const missingVars = [];
  if (!team1ChannelId) {
    missingVars.push('TEAM_1_CHANNEL_ID');
  }
  if (!team2ChannelId) {
    missingVars.push('TEAM_2_CHANNEL_ID');
  }
  if (!originChannelId) {
    missingVars.push('ORIGINAL_CHANNEL_ID');
  }

  if (missingVars.length > 0) {
    return {
      team1Channel: null,
      team2Channel: null,
      originChannel: null,
      missingVars,
    };
  }

  const [team1Channel, team2Channel, originChannel] = await Promise.all([
    guild.channels.fetch(team1ChannelId).catch(() => null),
    guild.channels.fetch(team2ChannelId).catch(() => null),
    guild.channels.fetch(originChannelId).catch(() => null),
  ]);

  return {
    team1Channel,
    team2Channel,
    originChannel,
    missingVars: [],
  };
}

export async function handleRestoreTeamInteraction(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: 'Dieser Command kann nur auf einem Server genutzt werden.',
      ephemeral: true,
    });
    return;
  }

  const { team1Channel, team2Channel, originChannel, missingVars } = await getChannels(interaction.guild);

  if (missingVars.length > 0) {
    await interaction.reply({
      content: `Es fehlen Umgebungsvariablen: ${missingVars.join(', ')}`,
      ephemeral: true,
    });
    return;
  }

  if (
    !validateVoiceChannel(team1Channel)
    || !validateVoiceChannel(team2Channel)
    || !validateVoiceChannel(originChannel)
  ) {
    await interaction.reply({
      content:
        'Die konfigurierten Voice-Channels sind ungültig. Bitte prüfe TEAM_1_CHANNEL_ID, TEAM_2_CHANNEL_ID und ORIGINAL_CHANNEL_ID.',
      ephemeral: true,
    });
    return;
  }

  const botMember = interaction.guild.members.me;
  if (!botMember) {
    await interaction.reply({
      content: 'Bot-Mitglied konnte nicht geladen werden.',
      ephemeral: true,
    });
    return;
  }

  const missingPermissions = [
    ...getMissingPermissions(team1Channel, botMember),
    ...getMissingPermissions(team2Channel, botMember),
    ...getMissingPermissions(originChannel, botMember),
  ];

  if (missingPermissions.length > 0) {
    await interaction.reply({
      content:
        'Mir fehlen Berechtigungen zum Verschieben von Mitgliedern. Ich brauche mindestens: View Channels, Connect, Move Members.',
      ephemeral: true,
    });
    return;
  }

  const membersToMove = [
    ...team1Channel.members.values(),
    ...team2Channel.members.values(),
  ].filter((member, index, members) => (
    member.id !== interaction.client.user.id
    && members.findIndex((candidate) => candidate.id === member.id) === index
  ));

  if (membersToMove.length === 0) {
    await interaction.reply({
      content: 'In Team 1 und Team 2 sind aktuell keine Mitglieder zum Zurückverschieben.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const moveErrors = [];

  await Promise.all(
    membersToMove.map(async (member) => {
      try {
        await member.voice.setChannel(originChannel, 'Mit /restore-team in den Ursprungskanal zurück verschoben');
      } catch {
        moveErrors.push(member.displayName);
      }
    }),
  );

  const movedCount = membersToMove.length - moveErrors.length;
  const responseLines = [
    `Mitglieder zurückverschoben: ${movedCount}/${membersToMove.length}`,
    `Ursprungskanal: ${originChannel.name}`,
  ];

  if (moveErrors.length > 0) {
    responseLines.push('', `Diese Mitglieder konnten nicht verschoben werden: ${moveErrors.join(', ')}`);
  }

  await interaction.editReply({ content: responseLines.join('\n') });
}
