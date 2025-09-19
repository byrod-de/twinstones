const fs = require('node:fs');
const path = require('node:path');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { logCommandExecution } = require('../helper/misc');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Help to all commands.'),

  async execute(interaction) {
    const botName = interaction.client.user.username;
    logCommandExecution(interaction);

    // --- Long, descriptions (central place)
    const longHelp = {
      'dh-roll': [
        '**What it does:** Rolls two d12 (Hope + Fear) the Daggerheart™ way.',
        '**Options:**',
        '- `modifier` – adds/subtracts a number (default 0).',
        '- `bonus` – `advantage`, `disadvantage`, or `ally` (adds extra d6).',
        '- `ally_dice` – number of d6 for ally help (highest die is added; only if `bonus=ally`).',
        '- `type` – `Action` (default, applies Hope/Fear) or `Reaction` (no Hope/Fear).',
        '- `show` – set false to hide the roll.',
        '**Example:**',
        '- `/dh-roll modifier:2 bonus:advantage type:Reaction ally_dice:3`'
      ].join('\n'),

      'dice-roll': [
        '**What it does:** Rolls standard dice or flips a coin.',
        '**Options:**',
        '- `dice` – `XdY` (e.g., `3d6`) or `coin` (default `1d20`).',
        '- `bonus` – only for a **single** d20: `advantage` or `disadvantage`.',
        '- `modifier` – adds/subtracts a number.',
        '- `show` – set false to hide the roll.',
        '**Examples:**',
        '- `/dice-roll dice:coin`',
        '- `/dice-roll dice:3d6 bonus:advantage`'
      ].join('\n'),

      'roll-any': [
        '**What it does:** Rolls any mix of dice and flat numbers with + / –.',
        '**Input:** put everything in `rollinput`, e.g. `2d6 + d8 - 2`.',
        'Allowed dice: d2, d4, d6, d8, d10, d12, d20, d100.',
        '- `show` – set false to hide the roll.',
        '**Example:**',
        '- `/roll-any rollinput:2d6 + d8 - 2`'
      ].join('\n'),
    };

    const helpEmbed = new EmbedBuilder()
      .setTitle(`${botName} – Help`)
      .setDescription('Slash Commands Overview');

    // Fetch both global and guild commands to ensure clickable mentions
    const globalCmds = await interaction.client.application.commands.fetch();
    const guildCmds = interaction.guild ? await interaction.guild.commands.fetch() : null;

    // Build a unified map: name -> id (guild overrides global if present)
    const cmdId = new Map();
    globalCmds.forEach(c => cmdId.set(c.name, c.id));
    if (guildCmds) guildCmds.forEach(c => cmdId.set(c.name, c.id));

    // Helper to render a clickable command mention
    const link = (name, sub, group) => {
      const id = cmdId.get(name);
      const parts = [name, group, sub].filter(Boolean).join(' ');
      return id ? `</${parts}:${id}>` : `/${parts}`; // graceful fallback if not deployed yet
    };

    // Load local command files to build sections dynamically
    const commandsDir = path.join(__dirname);
    const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(path.join(commandsDir, file));
      const name = command?.data?.name;
      if (!name) continue;

      // Base (short) description from builder
      const base = command?.data?.description || '';

      // Long addon if present
      const longHelpText = longHelp[name];

      // Check for subcommands/groups to list them too (if your bot adds any later)
      const json = typeof command.data.toJSON === 'function' ? command.data.toJSON() : {};
      const options = Array.isArray(json.options) ? json.options : [];

      const SUB_COMMAND = 1;
      const SUB_COMMAND_GROUP = 2;

      const groups = options.filter(o => o.type === SUB_COMMAND_GROUP);
      const subs = options.filter(o => o.type === SUB_COMMAND);

      let value = base;
      if (groups.length) {
        value += '\n**Subcommands:**';
        for (const g of groups) {
          const gSubs = (g.options || []).filter(o => o.type === SUB_COMMAND);
          for (const s of gSubs) value += `\n- ${link(name, s.name, g.name)} — ${s.description || ''}`;
        }
      } else if (subs.length) {
        value += '\n**Subcommands:**';
        for (const s of subs) value += `\n- ${link(name, s.name)} — ${s.description || ''}`;
      }

      // Append the long text (if defined for that command)
      if (longHelpText) value += `\n\n${longHelpText}\n\n`;

      helpEmbed.addFields({ name: ':game_die: ' + link(name), value: value || '-', inline: false });
    }

    await interaction.reply({ embeds: [helpEmbed] });
  },
};
