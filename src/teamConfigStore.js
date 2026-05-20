import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const dataDirPath = resolve(currentDir, '../data');
const configFilePath = resolve(dataDirPath, 'team-config.json');

async function ensureConfigFile() {
  await mkdir(dataDirPath, { recursive: true });

  try {
    await readFile(configFilePath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    await writeFile(configFilePath, '{}\n', 'utf8');
  }
}

async function readConfig() {
  await ensureConfigFile();

  try {
    const rawContent = await readFile(configFilePath, 'utf8');
    const parsed = JSON.parse(rawContent || '{}');
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {};
    }
    throw error;
  }
}

async function writeConfig(config) {
  await ensureConfigFile();
  const temporaryConfigFilePath = `${configFilePath}.tmp`;
  await writeFile(temporaryConfigFilePath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  await rename(temporaryConfigFilePath, configFilePath);
}

function isValidSnowflake(value) {
  return typeof value === 'string' && /^\d{17,20}$/.test(value);
}

function normalizeGuildConfig(guildConfig) {
  if (typeof guildConfig !== 'object' || guildConfig === null) {
    return null;
  }

  const normalized = {};
  if (isValidSnowflake(guildConfig.team1ChannelId)) {
    normalized.team1ChannelId = guildConfig.team1ChannelId;
  }
  if (isValidSnowflake(guildConfig.team2ChannelId)) {
    normalized.team2ChannelId = guildConfig.team2ChannelId;
  }
  if (isValidSnowflake(guildConfig.defaultChannelId)) {
    normalized.defaultChannelId = guildConfig.defaultChannelId;
  }
  return normalized;
}

export async function getGuildTeamConfig(guildId) {
  if (!isValidSnowflake(guildId)) {
    return null;
  }

  const config = await readConfig();
  return normalizeGuildConfig(config[guildId]);
}

export async function setGuildTeamConfig(guildId, guildConfig) {
  if (!isValidSnowflake(guildId)) {
    return;
  }

  const normalizedGuildConfig = normalizeGuildConfig(guildConfig);
  if (!normalizedGuildConfig || Object.keys(normalizedGuildConfig).length === 0) {
    return;
  }

  const config = await readConfig();
  config[guildId] = normalizedGuildConfig;
  await writeConfig(config);
}

export async function updateGuildTeamConfig(guildId, partialConfig) {
  if (!isValidSnowflake(guildId)) {
    return;
  }

  const currentGuildConfig = (await getGuildTeamConfig(guildId)) ?? {};
  const mergedConfig = normalizeGuildConfig({
    ...currentGuildConfig,
    ...partialConfig,
  });
  if (!mergedConfig || Object.keys(mergedConfig).length === 0) {
    return;
  }
  await setGuildTeamConfig(guildId, mergedConfig);
}

export async function deleteGuildTeamConfig(guildId) {
  if (!isValidSnowflake(guildId)) {
    return;
  }

  const config = await readConfig();
  delete config[guildId];
  await writeConfig(config);
}
