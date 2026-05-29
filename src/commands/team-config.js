import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import {
  deleteGuildTeamConfig,
  getGuildTeamConfig,
  setGuildTeamConfig,
  updateGuildTeamConfig,
} from '../teamConfigStore.js';

const ownerUserIds = new Set(
  (process.env.OWNER_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
);
const supportedTeamNumbers = [1, 2, 3, 4, 5, 6];
const optionalTeamNumbers = supportedTeamNumbers.slice(2);

function addTeamChannelOption(command, teamNumber, required) {
  return command.addChannelOption((option) => (
    option
      .setName(`team${teamNumber}`)
      .setDescription(`Voice-Channel für Team ${teamNumber}`)
      .setRequired(required)
      .addChannelTypes(ChannelType.GuildVoice)
  ));
}

export const setTeam1Command = new SlashCommandBuilder()
  .setName('set-team1')
  .setDescription('Setzt den Voice-Channel für Team 1 auf diesem Server.')
  .addChannelOption((option) => (
    option
      .setName('channel')
      .setDescription('Voice-Channel für Team 1')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildVoice)
  ));

export const setTeam2Command = new SlashCommandBuilder()
  .setName('set-team2')
  .setDescription('Setzt den Voice-Channel für Team 2 auf diesem Server.')
  .addChannelOption((option) => (
    option
      .setName('channel')
      .setDescription('Voice-Channel für Team 2')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildVoice)
  ));

export const configureCommand = new SlashCommandBuilder()
  .setName('configure')
  .setDescription('Setzt Team 1, Team 2, optional Team 3 bis 6 und den Default-Channel gleichzeitig.');

addTeamChannelOption(configureCommand, 1, true);
addTeamChannelOption(configureCommand, 2, true);
for (const teamNumber of optionalTeamNumbers) {
  addTeamChannelOption(configureCommand, teamNumber, false);
}

configureCommand
  .addChannelOption((option) => (
    option
      .setName('default')
      .setDescription('Voice-Default-Channel zum Zurückholen')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildVoice)
  ));

export const showRolesCommand = new SlashCommandBuilder()
  .setName('showroles')
  .setDescription('Aktiviert oder deaktiviert die Rollenanzeige bei /split-team.')
  .addBooleanOption((option) => (
    option
      .setName('enabled')
      .setDescription('Ob /split-team die Positions-Tags anzeigen soll')
      .setRequired(true)
  ));

export const resetConfigCommand = new SlashCommandBuilder()
  .setName('reset-config')
  .setDescription('Löscht die gespeicherte Team-Konfiguration für diesen Server.');

export const resetChannelCommand = new SlashCommandBuilder()
  .setName('reset-channel')
  .setDescription('Holt alle Nutzer aus den konfigurierten Team-Channels in den Default-Channel zurück.');

export const showTeamConfigCommand = new SlashCommandBuilder()
  .setName('show-team-config')
  .setDescription('Zeigt die aktuell gespeicherte Team-Konfiguration für diesen Server.');

function isVoiceChannel(channel) {
  return channel?.type === ChannelType.GuildVoice;
}

function getTeamChannelKey(teamNumber) {
  return `team${teamNumber}ChannelId`;
}

function getConfiguredTeamChannelIds(config) {
  return supportedTeamNumbers
    .map((teamNumber) => ({
      teamNumber,
      channelId: config?.[getTeamChannelKey(teamNumber)] ?? null,
    }))
    .filter(({ channelId }) => Boolean(channelId));
}

function formatConfiguredTeamLines(config) {
  return getConfiguredTeamChannelIds(config).map(({ teamNumber, channelId }) => `Team ${teamNumber}: <#${channelId}>`);
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

async function ensureGuildInteraction(interaction) {
  if (interaction.inGuild()) {
    return true;
  }

  await interaction.reply({
    content: 'Dieser Command kann nur auf einem Server genutzt werden.',
    flags: MessageFlags.Ephemeral,
  });
  return false;
}

async function getRequestingMember(interaction) {
  return interaction.guild.members.fetch(interaction.user.id).catch(() => null);
}

async function hasConfigPermission(interaction) {
  if (ownerUserIds.has(interaction.user.id)) {
    return true;
  }

  if (interaction.user.id === interaction.guild.ownerId) {
    return true;
  }

  const member = await getRequestingMember(interaction);
  return Boolean(member?.permissions?.has(PermissionFlagsBits.Administrator));
}

async function ensureConfigPermission(interaction) {
  const allowed = await hasConfigPermission(interaction);
  if (allowed) {
    return true;
  }

  await interaction.reply({
    content: 'Diesen Command dürfen nur Administratoren oder Bot-Owner ausführen.',
    flags: MessageFlags.Ephemeral,
  });
  return false;
}

export async function handleSetTeam1Interaction(interaction) {
  if (!await ensureGuildInteraction(interaction)) {
    return;
  }

  if (!await ensureConfigPermission(interaction)) {
    return;
  }

  const channel = interaction.options.getChannel('channel', true);
  if (!isVoiceChannel(channel)) {
    await interaction.reply({
      content: 'Bitte wähle einen gültigen Voice-Channel aus.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await updateGuildTeamConfig(interaction.guildId, { team1ChannelId: channel.id });
  await interaction.reply({
    content: `Team-1-Channel gespeichert: <#${channel.id}>`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleSetTeam2Interaction(interaction) {
  if (!await ensureGuildInteraction(interaction)) {
    return;
  }

  if (!await ensureConfigPermission(interaction)) {
    return;
  }

  const channel = interaction.options.getChannel('channel', true);
  if (!isVoiceChannel(channel)) {
    await interaction.reply({
      content: 'Bitte wähle einen gültigen Voice-Channel aus.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await updateGuildTeamConfig(interaction.guildId, { team2ChannelId: channel.id });
  await interaction.reply({
    content: `Team-2-Channel gespeichert: <#${channel.id}>`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleConfigureInteraction(interaction) {
  if (!await ensureGuildInteraction(interaction)) {
    return;
  }

  if (!await ensureConfigPermission(interaction)) {
    return;
  }

  const defaultChannel = interaction.options.getChannel('default', true);
  const selectedTeams = supportedTeamNumbers.map((teamNumber) => ({
    teamNumber,
    channel: interaction.options.getChannel(`team${teamNumber}`, teamNumber <= 2),
  }));
  const configuredTeams = selectedTeams.filter(({ channel }) => channel);

  if (
    !isVoiceChannel(defaultChannel)
    || configuredTeams.some(({ channel }) => !isVoiceChannel(channel))
  ) {
    await interaction.reply({
      content: 'Bitte wähle für Team 1, Team 2, optionale weitere Teams und Default gültige Voice-Channels aus.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const configuredChannelIds = [
    ...configuredTeams.map(({ channel }) => channel.id),
    defaultChannel.id,
  ];

  if (new Set(configuredChannelIds).size !== configuredChannelIds.length) {
    await interaction.reply({
      content: 'Alle konfigurierten Team-Channels und Default müssen unterschiedlich sein.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const existingConfig = await getGuildTeamConfig(interaction.guildId);
  const nextConfig = configuredTeams.reduce((config, { teamNumber, channel }) => ({
    ...config,
    [getTeamChannelKey(teamNumber)]: channel.id,
  }), {
    defaultChannelId: defaultChannel.id,
  });
  if (typeof existingConfig?.showRoleTags === 'boolean') {
    nextConfig.showRoleTags = existingConfig.showRoleTags;
  }

  await setGuildTeamConfig(interaction.guildId, {
    ...nextConfig,
  });

  await interaction.reply({
    content: [
      'Team-Konfiguration gespeichert:',
      ...configuredTeams.map(({ teamNumber, channel }) => `Team ${teamNumber}: <#${channel.id}>`),
      `Default: <#${defaultChannel.id}>`,
    ].join('\n'),
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleShowRolesInteraction(interaction) {
  if (!await ensureGuildInteraction(interaction)) {
    return;
  }

  if (!await ensureConfigPermission(interaction)) {
    return;
  }

  const enabled = interaction.options.getBoolean('enabled', true);
  await updateGuildTeamConfig(interaction.guildId, { showRoleTags: enabled });
  await interaction.reply({
    content: `Rollenanzeige bei /split-team: ${enabled ? 'aktiviert' : 'deaktiviert'}`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleResetConfigInteraction(interaction) {
  if (!await ensureGuildInteraction(interaction)) {
    return;
  }

  if (!await ensureConfigPermission(interaction)) {
    return;
  }

  await deleteGuildTeamConfig(interaction.guildId);
  await interaction.reply({
    content: 'Die Team-Konfiguration für diesen Server wurde gelöscht.',
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleResetChannelInteraction(interaction) {
  if (!await ensureGuildInteraction(interaction)) {
    return;
  }

  if (!await ensureConfigPermission(interaction)) {
    return;
  }

  const config = await getGuildTeamConfig(interaction.guildId);
  const configuredTeamChannels = getConfiguredTeamChannelIds(config);
  const defaultChannelId = config?.defaultChannelId;

  if (configuredTeamChannels.length < 2 || !defaultChannelId) {
    await interaction.reply({
      content: 'Bitte konfiguriere zuerst Team 1, Team 2 und Default mit /configure.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const fetchedChannels = await Promise.all([
    ...configuredTeamChannels.map(({ channelId }) => (
      interaction.guild.channels.fetch(channelId).catch(() => null)
    )),
    interaction.guild.channels.fetch(defaultChannelId).catch(() => null),
  ]);
  const defaultChannel = fetchedChannels.at(-1);
  const teamChannels = fetchedChannels.slice(0, -1);

  if (!isVoiceChannel(defaultChannel) || teamChannels.some((channel) => !isVoiceChannel(channel))) {
    await interaction.reply({
      content: 'Die gespeicherte Konfiguration ist ungültig. Bitte nutze /configure erneut.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const configuredChannelIds = [
    ...teamChannels.map((channel) => channel.id),
    defaultChannel.id,
  ];

  if (new Set(configuredChannelIds).size !== configuredChannelIds.length) {
    await interaction.reply({
      content: 'Die gespeicherte Konfiguration ist ungültig. Bitte nutze /configure erneut.',
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
    ...teamChannels,
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

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const membersInTeamChannels = [
    ...teamChannels.flatMap((channel) => [...channel.members.values()]),
  ].filter((member) => !member.user.bot);
  const uniqueMembers = Array.from(
    new Map(membersInTeamChannels.map((member) => [member.id, member])).values(),
  );

  if (uniqueMembers.length === 0) {
    await interaction.editReply({
      content: 'In den Team-Channels sind aktuell keine Nutzer zum Zurückholen.',
    });
    return;
  }

  const moveErrors = [];
  await Promise.all(
    uniqueMembers.map(async (member) => {
      try {
        await member.voice.setChannel(defaultChannel, 'Nutzer mit /reset-channel zurückgeholt');
      } catch {
        moveErrors.push(member.displayName);
      }
    }),
  );

  const movedCount = uniqueMembers.length - moveErrors.length;
  const responseLines = [
    `Zurückholen abgeschlossen: ${movedCount}/${uniqueMembers.length} Nutzer nach <#${defaultChannel.id}> verschoben.`,
  ];
  if (moveErrors.length > 0) {
    responseLines.push(`Diese Nutzer konnten nicht verschoben werden: ${moveErrors.join(', ')}`);
  }

  await interaction.editReply({
    content: responseLines.join('\n'),
  });
}

export async function handleShowTeamConfigInteraction(interaction) {
  if (!await ensureGuildInteraction(interaction)) {
    return;
  }

  const config = await getGuildTeamConfig(interaction.guildId);

  if (!config?.team1ChannelId || !config?.team2ChannelId || !config?.defaultChannelId) {
    await interaction.reply({
      content: 'Für diesen Server ist noch keine vollständige Team-Konfiguration gespeichert.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    content: [
      'Aktuelle Team-Konfiguration:',
      ...formatConfiguredTeamLines(config),
      `Default: <#${config.defaultChannelId}>`,
      `Rollenanzeige bei /split-team: ${config.showRoleTags ? 'aktiviert' : 'deaktiviert'}`,
    ].join('\n'),
    flags: MessageFlags.Ephemeral,
  });
}
