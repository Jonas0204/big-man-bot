import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {};
    }
    throw error;
  }
}

async function writeConfig(config) {
  await ensureConfigFile();
  await writeFile(configFilePath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

export async function getGuildTeamConfig(guildId) {
  if (!guildId) {
    return null;
  }

  const config = await readConfig();
  return config[guildId] ?? null;
}

export async function setGuildTeamConfig(guildId, guildConfig) {
  if (!guildId) {
    return;
  }

  const config = await readConfig();
  config[guildId] = guildConfig;
  await writeConfig(config);
}

export async function updateGuildTeamConfig(guildId, partialConfig) {
  if (!guildId) {
    return;
  }

  const currentGuildConfig = (await getGuildTeamConfig(guildId)) ?? {};
  await setGuildTeamConfig(guildId, {
    ...currentGuildConfig,
    ...partialConfig,
  });
}

export async function deleteGuildTeamConfig(guildId) {
  if (!guildId) {
    return;
  }

  const config = await readConfig();
  delete config[guildId];
  await writeConfig(config);
}
