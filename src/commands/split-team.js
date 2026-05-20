import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export const splitTeamCommand = new SlashCommandBuilder()
  .setName('split-team')
  .setDescription('Teilt alle Mitglieder deines aktuellen Voice-Channels zufällig in zwei Teams auf.');

function shuffleMembers(members) {
  const shuffled = [...members];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatTeamList(members) {
  if (members.length === 0) {
    return '- (leer)';
  }

  return members.map((member) => `- ${member.displayName}`).join('\n');
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

function validateVoiceChannel(channel) {
  return channel?.type === ChannelType.GuildVoice;
}

function getTeamChannelId(guildId, teamNumber) {
  return process.env[`TEAM_${teamNumber}_CHANNEL_ID_${guildId}`] ?? process.env[`TEAM_${teamNumber}_CHANNEL_ID`];
}

async function getTeamChannels(guild) {
  const team1ChannelId = getTeamChannelId(guild.id, 1);
  const team2ChannelId = getTeamChannelId(guild.id, 2);

  if (!team1ChannelId || !team2ChannelId) {
    return { team1Channel: null, team2Channel: null, hasMissingChannelIds: true };
  }

  const [team1Channel, team2Channel] = await Promise.all([
    guild.channels.fetch(team1ChannelId).catch(() => null),
    guild.channels.fetch(team2ChannelId).catch(() => null),
  ]);

  return { team1Channel, team2Channel, hasMissingChannelIds: false };
}

export async function handleSplitTeamInteraction(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: 'Dieser Command kann nur auf einem Server genutzt werden.',
      ephemeral: true,
    });
    return;
  }

  const requestingMember = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

  if (!requestingMember?.voice?.channel) {
    await interaction.reply({
      content: 'Du musst in einem Voice-Channel sein, um Teams aufzuteilen.',
      ephemeral: true,
    });
    return;
  }

  const requesterChannel = requestingMember.voice.channel;
  const realUsers = Array.from(requesterChannel.members.values()).filter((member) => !member.user.bot);

  if (realUsers.length < 2) {
    await interaction.reply({
      content: 'Es müssen mindestens zwei Nutzer im Voice-Channel sein.',
      ephemeral: true,
    });
    return;
  }

  const { team1Channel, team2Channel, hasMissingChannelIds } = await getTeamChannels(interaction.guild);

  if (hasMissingChannelIds) {
    await interaction.reply({
      content:
        'Es fehlen Ziel-Channel-IDs. Setze TEAM_1_CHANNEL_ID und TEAM_2_CHANNEL_ID (optional pro Server: TEAM_1_CHANNEL_ID_<GUILD_ID> / TEAM_2_CHANNEL_ID_<GUILD_ID>).',
      ephemeral: true,
    });
    return;
  }

  if (!validateVoiceChannel(team1Channel) || !validateVoiceChannel(team2Channel)) {
    await interaction.reply({
      content:
        'Die konfigurierten Ziel-Channels sind ungültig. Bitte prüfe TEAM_1_CHANNEL_ID und TEAM_2_CHANNEL_ID.',
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

  const team1MissingPermissions = getMissingPermissions(team1Channel, botMember);
  const team2MissingPermissions = getMissingPermissions(team2Channel, botMember);

  if (team1MissingPermissions.length > 0 || team2MissingPermissions.length > 0) {
    await interaction.reply({
      content:
        'Mir fehlen Berechtigungen zum Verschieben von Mitgliedern. Ich brauche mindestens: View Channels, Connect, Move Members.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const shuffledUsers = shuffleMembers(realUsers);
  const splitIndex = Math.ceil(shuffledUsers.length / 2);
  const team1 = shuffledUsers.slice(0, splitIndex);
  const team2 = shuffledUsers.slice(splitIndex);

  const moveErrors = [];

  await Promise.all(
    team1.map(async (member) => {
      try {
        await member.voice.setChannel(team1Channel, 'Teams mit /split-team aufgeteilt');
      } catch {
        moveErrors.push(member.displayName);
      }
    }),
  );

  await Promise.all(
    team2.map(async (member) => {
      try {
        await member.voice.setChannel(team2Channel, 'Teams mit /split-team aufgeteilt');
      } catch {
        moveErrors.push(member.displayName);
      }
    }),
  );

  const responseLines = [
    `Teams wurden zufällig aufgeteilt (${interaction.guild.name}):`,
    '',
    'Team 1:',
    formatTeamList(team1),
    '',
    'Team 2:',
    formatTeamList(team2),
  ];

  if (moveErrors.length > 0) {
    responseLines.push('', `Diese Nutzer konnten nicht verschoben werden: ${moveErrors.join(', ')}`);
  }

  await interaction.editReply({ content: responseLines.join('\n') });
}
