import 'dotenv/config';
import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
} from 'discord.js';

const REQUIRED_ENV_VARS = [
  'DISCORD_TOKEN',
  'TEAM_1_CHANNEL_ID',
  'TEAM_2_CHANNEL_ID',
];

for (const envVar of REQUIRED_ENV_VARS) {
  if (!process.env[envVar]) {
    throw new Error(`Fehlende Umgebungsvariable: ${envVar}`);
  }
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

function shuffleMembers(members) {
  const shuffled = [...members];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatTeamList(members) {
  return members.map((member) => `- ${member.displayName}`).join('\n');
}

async function getTeamChannels(guild) {
  const team1Channel = await guild.channels
    .fetch(process.env.TEAM_1_CHANNEL_ID)
    .catch(() => null);
  const team2Channel = await guild.channels
    .fetch(process.env.TEAM_2_CHANNEL_ID)
    .catch(() => null);

  return { team1Channel, team2Channel };
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

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot ist online als ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'split-team') {
    return;
  }

  if (!interaction.inGuild()) {
    await interaction.reply({
      content: 'Dieser Command kann nur auf einem Server genutzt werden.',
      ephemeral: true,
    });
    return;
  }

  const requesterChannel = interaction.member.voice.channel;
  if (!requesterChannel) {
    await interaction.reply({
      content: 'Du musst in einem Voice-Channel sein, um Teams aufzuteilen.',
      ephemeral: true,
    });
    return;
  }

  const realUsers = Array.from(requesterChannel.members.values()).filter(
    (member) => !member.user.bot,
  );

  if (realUsers.length < 2) {
    await interaction.reply({
      content: 'Es müssen mindestens zwei Nutzer im Voice-Channel sein.',
      ephemeral: true,
    });
    return;
  }

  const { team1Channel, team2Channel } = await getTeamChannels(interaction.guild);

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
    'Teams wurden zufällig aufgeteilt:',
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
});

client.login(process.env.DISCORD_TOKEN);
