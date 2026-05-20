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
  .setDescription('Setzt Team 1, Team 2 und den Default-Channel gleichzeitig.')
  .addChannelOption((option) => (
    option
      .setName('team1')
      .setDescription('Voice-Channel für Team 1')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildVoice)
  ))
  .addChannelOption((option) => (
    option
      .setName('team2')
      .setDescription('Voice-Channel für Team 2')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildVoice)
  ))
  .addChannelOption((option) => (
    option
      .setName('default')
      .setDescription('Voice-Default-Channel zum Zurückholen')
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildVoice)
  ));

export const resetConfigCommand = new SlashCommandBuilder()
  .setName('reset-config')
  .setDescription('Löscht die gespeicherte Team-Konfiguration für diesen Server.');

export const resetChannelCommand = new SlashCommandBuilder()
  .setName('reset-channel')
  .setDescription('Holt alle Nutzer aus Team 1 und Team 2 in den Default-Channel zurück.');

export const showTeamConfigCommand = new SlashCommandBuilder()
  .setName('show-team-config')
  .setDescription('Zeigt die aktuell gespeicherte Team-Konfiguration für diesen Server.');

function isVoiceChannel(channel) {
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

  const team1 = interaction.options.getChannel('team1', true);
  const team2 = interaction.options.getChannel('team2', true);
  const defaultChannel = interaction.options.getChannel('default', true);

  if (!isVoiceChannel(team1) || !isVoiceChannel(team2) || !isVoiceChannel(defaultChannel)) {
    await interaction.reply({
      content: 'Bitte wähle für Team 1, Team 2 und Default gültige Voice-Channels aus.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (new Set([team1.id, team2.id, defaultChannel.id]).size !== 3) {
    await interaction.reply({
      content: 'Team 1, Team 2 und Default müssen unterschiedliche Channels sein.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await setGuildTeamConfig(interaction.guildId, {
    team1ChannelId: team1.id,
    team2ChannelId: team2.id,
    defaultChannelId: defaultChannel.id,
  });

  await interaction.reply({
    content: [
      'Team-Konfiguration gespeichert:',
      `Team 1: <#${team1.id}>`,
      `Team 2: <#${team2.id}>`,
      `Default: <#${defaultChannel.id}>`,
    ].join('\n'),
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
  const team1ChannelId = config?.team1ChannelId;
  const team2ChannelId = config?.team2ChannelId;
  const defaultChannelId = config?.defaultChannelId;

  if (!team1ChannelId || !team2ChannelId || !defaultChannelId) {
    await interaction.reply({
      content: 'Bitte konfiguriere zuerst Team 1, Team 2 und Default mit /configure.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const [team1Channel, team2Channel, defaultChannel] = await Promise.all([
    interaction.guild.channels.fetch(team1ChannelId).catch(() => null),
    interaction.guild.channels.fetch(team2ChannelId).catch(() => null),
    interaction.guild.channels.fetch(defaultChannelId).catch(() => null),
  ]);

  if (!isVoiceChannel(team1Channel) || !isVoiceChannel(team2Channel) || !isVoiceChannel(defaultChannel)) {
    await interaction.reply({
      content: 'Die gespeicherte Konfiguration ist ungültig. Bitte nutze /configure erneut.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (new Set([team1Channel.id, team2Channel.id, defaultChannel.id]).size !== 3) {
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

  const team1MissingPermissions = getMissingPermissions(team1Channel, botMember);
  const team2MissingPermissions = getMissingPermissions(team2Channel, botMember);
  const defaultMissingPermissions = getMissingPermissions(defaultChannel, botMember);
  if (
    team1MissingPermissions.length > 0
    || team2MissingPermissions.length > 0
    || defaultMissingPermissions.length > 0
  ) {
    await interaction.reply({
      content:
        'Mir fehlen Berechtigungen zum Verschieben von Mitgliedern. Ich brauche mindestens: View Channels, Connect, Move Members.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const membersInTeamChannels = [
    ...team1Channel.members.values(),
    ...team2Channel.members.values(),
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
      `Team 1: <#${config.team1ChannelId}>`,
      `Team 2: <#${config.team2ChannelId}>`,
      `Default: <#${config.defaultChannelId}>`,
    ].join('\n'),
    flags: MessageFlags.Ephemeral,
  });
}
