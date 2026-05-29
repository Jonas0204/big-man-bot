import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { getGuildTeamConfig } from '../teamConfigStore.js';

const supportedTeamNumbers = [1, 2, 3, 4, 5, 6];
const positionTags = ['Top', 'Jungle', 'Mid', 'sup', 'adc'];

export const splitTeamCommand = new SlashCommandBuilder()
  .setName('split-team')
  .setDescription('Teilt alle Mitglieder deines aktuellen Voice-Channels zufällig in zwei Teams auf.');

export const splitTeamIn3Command = new SlashCommandBuilder()
  .setName('split-team-in-3')
  .setDescription('Verschiebt Nutzer aus dem Default-Channel stapelweise in 3er-Gruppen auf die Team-Channels.');

function getTeamChannelKey(teamNumber) {
  return `team${teamNumber}ChannelId`;
}

function shuffleMembers(members) {
  const shuffled = [...members];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatTeamList(members, { withPositionTags = false } = {}) {
  if (members.length === 0) {
    return '- (leer)';
  }

  return members.map((member, index) => {
    if (!withPositionTags) {
      return `- ${member.displayName}`;
    }
    const positionTag = positionTags[index];
    return `- ${member.displayName}${positionTag ? ` (${positionTag})` : ''}`;
  }).join('\n');
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

async function getConfiguredChannels(guild) {
  const teamConfig = await getGuildTeamConfig(guild.id);
  const showRoleTags = Boolean(teamConfig?.showRoleTags);
  const defaultChannelId = teamConfig?.defaultChannelId ?? null;
  const configuredTeams = supportedTeamNumbers
    .map((teamNumber) => ({
      teamNumber,
      channelId: teamConfig?.[getTeamChannelKey(teamNumber)] ?? null,
    }))
    .filter(({ channelId }) => Boolean(channelId));

  if (configuredTeams.length < 2 || !defaultChannelId) {
    return {
      teamChannels: [],
      defaultChannel: null,
      hasMissingChannelConfig: true,
      hasInvalidConfig: false,
      showRoleTags,
    };
  }

  const fetchedChannels = await Promise.all([
    ...configuredTeams.map(({ channelId }) => guild.channels.fetch(channelId).catch(() => null)),
    guild.channels.fetch(defaultChannelId).catch(() => null),
  ]);

  const defaultChannel = fetchedChannels.at(-1);
  const teamChannels = configuredTeams.map((team, index) => ({
    ...team,
    channel: fetchedChannels[index],
  }));
  const hasInvalidConfig = (
    !validateVoiceChannel(defaultChannel)
    || teamChannels.some(({ channel }) => !validateVoiceChannel(channel))
    || new Set([
      ...teamChannels.map(({ channel }) => channel?.id),
      defaultChannel?.id,
    ].filter(Boolean)).size !== teamChannels.length + 1
  );

  return {
    teamChannels,
    defaultChannel,
    hasMissingChannelConfig: false,
    hasInvalidConfig,
    showRoleTags,
  };
}

function createTripleAssignments(members, teamChannels) {
  const assignments = [];
  let startIndex = 0;

  for (let index = 0; index < teamChannels.length && startIndex < members.length; index += 1) {
    const remainingMembers = members.length - startIndex;
    const remainingChannels = teamChannels.length - index;
    const takeCount = remainingChannels === 1 || remainingMembers <= 3 ? remainingMembers : 3;

    assignments.push({
      ...teamChannels[index],
      members: members.slice(startIndex, startIndex + takeCount),
    });
    startIndex += takeCount;
  }

  return assignments;
}

export async function handleSplitTeamInteraction(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: 'Dieser Command kann nur auf einem Server genutzt werden.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const requestingMember = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!requestingMember?.voice?.channel) {
    await interaction.reply({
      content: 'Du musst in einem Voice-Channel sein, um Teams aufzuteilen.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const requesterChannel = requestingMember.voice.channel;
  const realUsers = Array.from(requesterChannel.members.values()).filter((member) => !member.user.bot);

  if (realUsers.length < 2) {
    await interaction.reply({
      content: 'Es müssen mindestens zwei Nutzer im Voice-Channel sein.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const {
    teamChannels,
    hasMissingChannelConfig,
    hasInvalidConfig,
    showRoleTags,
  } = await getConfiguredChannels(interaction.guild);

  if (hasMissingChannelConfig) {
    await interaction.reply({
      content: 'Bitte konfiguriere zuerst Team 1, Team 2 und Default mit /configure.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (hasInvalidConfig) {
    await interaction.reply({
      content:
        'Die gespeicherte Team-Konfiguration ist ungültig. Bitte setze Team 1, Team 2 und Default mit /configure neu.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const [team1, team2] = teamChannels;
  const botMember = interaction.guild.members.me;

  if (!botMember) {
    await interaction.reply({
      content: 'Bot-Mitglied konnte nicht geladen werden.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (
    getMissingPermissions(team1.channel, botMember).length > 0
    || getMissingPermissions(team2.channel, botMember).length > 0
  ) {
    await interaction.reply({
      content:
        'Mir fehlen Berechtigungen zum Verschieben von Mitgliedern. Ich brauche mindestens: View Channels, Connect, Move Members.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  const shuffledUsers = shuffleMembers(realUsers);
  const splitIndex = Math.ceil(shuffledUsers.length / 2);
  const team1Members = shuffledUsers.slice(0, splitIndex);
  const team2Members = shuffledUsers.slice(splitIndex);
  const moveErrors = [];

  await Promise.all(
    team1Members.map(async (member) => {
      try {
        await member.voice.setChannel(team1.channel, 'Teams mit /split-team aufgeteilt');
      } catch {
        moveErrors.push(member.displayName);
      }
    }),
  );

  await Promise.all(
    team2Members.map(async (member) => {
      try {
        await member.voice.setChannel(team2.channel, 'Teams mit /split-team aufgeteilt');
      } catch {
        moveErrors.push(member.displayName);
      }
    }),
  );

  const responseLines = [
    'Teams wurden zufällig aufgeteilt:',
    '',
    'Team 1:',
    formatTeamList(team1Members, { withPositionTags: showRoleTags }),
    '',
    'Team 2:',
    formatTeamList(team2Members, { withPositionTags: showRoleTags }),
  ];

  if (moveErrors.length > 0) {
    responseLines.push('', `Diese Nutzer konnten nicht verschoben werden: ${moveErrors.join(', ')}`);
  }

  await interaction.editReply({ content: responseLines.join('\n') });
}

export async function handleSplitTeamIn3Interaction(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: 'Dieser Command kann nur auf einem Server genutzt werden.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const {
    teamChannels,
    defaultChannel,
    hasMissingChannelConfig,
    hasInvalidConfig,
  } = await getConfiguredChannels(interaction.guild);

  if (hasMissingChannelConfig) {
    await interaction.reply({
      content: 'Bitte konfiguriere zuerst Team 1, Team 2 und Default mit /configure.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (hasInvalidConfig) {
    await interaction.reply({
      content:
        'Die gespeicherte Team-Konfiguration ist ungültig. Bitte setze Team 1, Team 2 und Default mit /configure neu.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const botMember = interaction.guild.members.me;
  if (!botMember) {
    await interaction.reply({
      content: 'Bot-Mitglied konnte nicht geladen werden.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const hasMissingPermissions = [
    ...teamChannels.map(({ channel }) => channel),
    defaultChannel,
  ].some((channel) => getMissingPermissions(channel, botMember).length > 0);
  if (hasMissingPermissions) {
    await interaction.reply({
      content:
        'Mir fehlen Berechtigungen zum Verschieben von Mitgliedern. Ich brauche mindestens: View Channels, Connect, Move Members.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const realUsers = Array.from(defaultChannel.members.values()).filter((member) => !member.user.bot);
  if (realUsers.length === 0) {
    await interaction.reply({
      content: 'Im Default-Channel sind aktuell keine Nutzer zum Aufteilen.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  const assignments = createTripleAssignments(realUsers, teamChannels);
  const moveErrors = [];

  await Promise.all(
    assignments.flatMap(({ channel, members }) => members.map(async (member) => {
      try {
        await member.voice.setChannel(channel, 'Teams mit /split-team-in-3 aufgeteilt');
      } catch {
        moveErrors.push(member.displayName);
      }
    })),
  );

  const responseLines = ['Teams wurden stapelweise aufgeteilt:'];
  for (const assignment of assignments) {
    responseLines.push(
      '',
      `Team ${assignment.teamNumber}:`,
      formatTeamList(assignment.members),
    );
  }

  if (moveErrors.length > 0) {
    responseLines.push('', `Diese Nutzer konnten nicht verschoben werden: ${moveErrors.join(', ')}`);
  }

  await interaction.editReply({ content: responseLines.join('\n') });
}
