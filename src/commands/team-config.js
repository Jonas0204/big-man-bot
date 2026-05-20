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
  .setDescription('Setzt Team 1 und Team 2 gleichzeitig.')
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
  ));

export const resetTeamCommand = new SlashCommandBuilder()
  .setName('reset-team')
  .setDescription('Löscht die gespeicherte Team-Konfiguration für diesen Server.');

export const showTeamConfigCommand = new SlashCommandBuilder()
  .setName('show-team-config')
  .setDescription('Zeigt die aktuell gespeicherte Team-Konfiguration für diesen Server.');

function isVoiceChannel(channel) {
  return channel?.type === ChannelType.GuildVoice;
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
  if (interaction.member?.permissions) {
    return interaction.member;
  }

  return interaction.guild.members.fetch(interaction.user.id).catch(() => null);
}

async function hasConfigPermission(interaction) {
  if (ownerUserIds.has(interaction.user.id)) {
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

  if (!isVoiceChannel(team1) || !isVoiceChannel(team2)) {
    await interaction.reply({
      content: 'Bitte wähle für Team 1 und Team 2 gültige Voice-Channels aus.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (team1.id === team2.id) {
    await interaction.reply({
      content: 'Team 1 und Team 2 dürfen nicht derselbe Channel sein.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await setGuildTeamConfig(interaction.guildId, {
    team1ChannelId: team1.id,
    team2ChannelId: team2.id,
  });

  await interaction.reply({
    content: [
      'Team-Channels gespeichert:',
      `Team 1: <#${team1.id}>`,
      `Team 2: <#${team2.id}>`,
    ].join('\n'),
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleResetTeamInteraction(interaction) {
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

export async function handleShowTeamConfigInteraction(interaction) {
  if (!await ensureGuildInteraction(interaction)) {
    return;
  }

  const config = await getGuildTeamConfig(interaction.guildId);

  if (!config?.team1ChannelId || !config?.team2ChannelId) {
    await interaction.reply({
      content: 'Für diesen Server sind noch keine Team-Channels konfiguriert.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    content: [
      'Aktuelle Team-Konfiguration:',
      `Team 1: <#${config.team1ChannelId}>`,
      `Team 2: <#${config.team2ChannelId}>`,
    ].join('\n'),
    flags: MessageFlags.Ephemeral,
  });
}
