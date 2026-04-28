#!/usr/bin/env node
// skillr CLI — Skill Registry client for installing and managing AI skills.
// Targets: OpenCode, Claude Code, Codex

import { getConfig, saveConfig, getConfigPaths, readLock } from './config';
import { RegistryClient } from './client';
import { installSkill, updateSkill, removeSkill, listSkills, TARGET_PATHS } from './installer';

const USAGE = `
skillr — Skill Registry CLI

Usage:
  skillr config set <key> <value>  [--global|--project]
  skillr config show

  skillr search [query]
  skillr info <name>

  skillr install <name>[@version]  [--target <name>] [--project] [--force]
  skillr update [name]             [--target <name>]
  skillr remove <name>             [--target <name>]
  skillr list                      [--project]

Options:
  --target    Target platform: opencode, claude-code, codex, all (default)
  --project   Use project-level config/lock instead of global
  --force     Force install, skip conflict and SHA checks
`.trim();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log(USAGE);
    process.exit(0);
  }

  try {
    switch (cmd) {
      case 'config':
        await handleConfig(args.slice(1));
        break;
      case 'search':
        await handleSearch(args.slice(1));
        break;
      case 'info':
        await handleInfo(args.slice(1));
        break;
      case 'install':
        await handleInstall(args.slice(1));
        break;
      case 'update':
        await handleUpdate(args.slice(1));
        break;
      case 'remove':
      case 'uninstall':
        handleRemove(args.slice(1));
        break;
      case 'list':
      case 'ls':
        handleList(args.slice(1));
        break;
      default:
        console.error(`Unknown command: ${cmd}`);
        console.error('Run skillr --help for usage.');
        process.exit(1);
    }
  } catch (err) {
    console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

// ─── Config ────────────────────────────────────────────────────────────

async function handleConfig(args: string[]): Promise<void> {
  const sub = args[0];

  if (sub === 'set' && args.length >= 3) {
    const key = args[1];
    const value = args[2];
    const level = args.includes('--project') ? 'project' : 'global';
    saveConfig({ [key]: value }, level);
    console.log(`✅ ${key}=${value} saved (${level})`);
  } else if (sub === 'show') {
    const config = getConfig();
    const paths = getConfigPaths();
    console.log('\nConfiguration:');
    console.log(`  registry: ${config.registry || '(not set)'}`);
    console.log(`  token:    ${config.token ? config.token.slice(0, 12) + '...' : '(not set)'}`);
    console.log(`\nConfig files:`);
    console.log(`  global:   ${paths.global}`);
    console.log(`  project:  ${paths.project}`);
    console.log(`  lock:     ${paths.globalLock}`);
    console.log('');
  } else {
    console.log(`Usage: skillr config set <key> <value> [--global|--project]`);
    console.log(`       skillr config show`);
  }
}

// ─── Search ────────────────────────────────────────────────────────────

async function handleSearch(args: string[]): Promise<void> {
  const client = new RegistryClient();
  const query = args[0] || '';
  const result = await client.search(query);

  console.log(`\n🔍 Search: "${query}" (${result.total} result(s))\n`);

  for (const skill of result.data) {
    console.log(`  ${skill.name}@${skill.latestVersion}  score: ${skill.latestScore}`);
    console.log(`    ${skill.description.slice(0, 80)}`);

    const compat = skill.compatibility?.join(', ') || '';
    if (compat) console.log(`    targets: ${compat}`);
    console.log('');
  }
}

// ─── Info ──────────────────────────────────────────────────────────────

async function handleInfo(args: string[]): Promise<void> {
  const name = args[0];
  if (!name) { console.error('Usage: skillr info <name>'); process.exit(1); }

  const client = new RegistryClient();
  const info = await client.info(name);
  const versions = await client.versions(name);

  console.log(`\n📦 ${info.name} v${info.latestVersion}`);
  console.log(`   Score: ${info.latestScore}/100`);
  console.log(`   Compatibility: ${info.compatibility?.join(', ') || 'unknown'}\n`);

  console.log(`   ${info.description}\n`);

  if (versions.length > 0) {
    console.log('   Versions:');
    for (const v of versions.slice(0, 10)) {
      console.log(`     ${v.version}  sha256=${v.sha256?.slice(0, 12)}...  ${v.size}B`);
    }
  }
  console.log('');
}

// ─── Install ───────────────────────────────────────────────────────────

async function handleInstall(args: string[]): Promise<void> {
  const spec = args.find((a) => !a.startsWith('--'));
  if (!spec) { console.error('Usage: skillr install <name>[@version]'); process.exit(1); }

  const [name, version] = spec.split('@');
  const target = getOption(args, '--target') || 'all';
  const isProject = args.includes('--project');
  const force = args.includes('--force');

  await installSkill(name, { version, target, project: isProject, force });
}

// ─── Update ────────────────────────────────────────────────────────────

async function handleUpdate(args: string[]): Promise<void> {
  const name = args.find((a) => !a.startsWith('--'));
  const target = getOption(args, '--target');
  const isProject = args.includes('--project');

  await updateSkill(name, { target, project: isProject });
}

// ─── Remove ────────────────────────────────────────────────────────────

function handleRemove(args: string[]): void {
  const name = args.find((a) => !a.startsWith('--'));
  if (!name) { console.error('Usage: skillr remove <name>'); process.exit(1); }

  const target = getOption(args, '--target');
  const isProject = args.includes('--project');

  removeSkill(name, { target, project: isProject });
}

// ─── List ──────────────────────────────────────────────────────────────

function handleList(args: string[]): void {
  const isProject = args.includes('--project');
  listSkills({ project: isProject });
}

// ─── Helpers ───────────────────────────────────────────────────────────

function getOption(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx >= 0 && idx + 1 < args.length && !args[idx + 1].startsWith('--')) {
    return args[idx + 1];
  }
  return undefined;
}

main();
