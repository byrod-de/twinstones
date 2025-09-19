const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const colours = require('../conf/colours.json');
const { logCommandExecution, hideEmbed } = require('../helper/misc');

let embedColor = colours.default || '#8A2BE2';
const EPHEMERAL = 1 << 6;

function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dh-roll')
        .setDescription('Roll the duality dice, the Daggerheart™ way!')
        .addIntegerOption(option =>
            option.setName('modifier')
                .setDescription('Add a modifier to the total (default: 0)')
        )
        .addStringOption(option =>
            option.setName('bonus')
                .setDescription('Choose bonus dice')
                .addChoices(
                    { name: 'None', value: 'none' },
                    { name: 'Advantage', value: 'advantage' },
                    { name: 'Disadvantage', value: 'disadvantage' },
                    { name: 'Ally Help', value: 'ally' }
                )
        )
        .addIntegerOption(option =>
            option.setName('ally_dice')
                .setDescription('Number of d6 to roll for ally help (only if bonus = ally)')
        )
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Indicate if is is an Action roll (with Hope and Fear), or Reaction roll without (default: Action)')
                .addChoices(
                    { name: 'Action', value: 'Action' },
                    { name: 'Reaction', value: 'Reaction' }
                )
        )
        .addBooleanOption(option =>
            option.setName('show')
                .setDescription('Show response (default: true)')
        ),

    async execute(interaction) {
        const modifier = interaction.options.getInteger('modifier') ?? 0;
        const bonus = interaction.options.getString('bonus') ?? 'none';
        const allyDiceCount = interaction.options.getInteger('ally_dice') ?? 0;
        const show = interaction.options.getBoolean('show') ?? true;
        const roll_type = interaction.options.getString('type') ?? 'Action';
        const isReaction = interaction.options.getString('type') === 'Reaction' ? true : false;

        const hope = rollDie(12);
        const fear = rollDie(12);
        const baseTotal = hope + fear + modifier;

        let bonusText = '';
        let finalTotal = baseTotal;

        if (bonus === 'advantage') {
            const d6 = rollDie(6);
            bonusText = `Advantage d6: **+${d6}**`;
            finalTotal += d6;
        } else if (bonus === 'disadvantage') {
            const d6 = rollDie(6);
            bonusText = `Disadvantage d6: **-${d6}**`;
            finalTotal -= d6;
        } else if (bonus === 'ally' && allyDiceCount > 0) {
            const rolls = Array.from({ length: allyDiceCount }, () => rollDie(6));
            const highest = Math.max(...rolls);
            bonusText = `Ally help d6's: [${rolls.join(', ')}] > **+${highest}**`;
            finalTotal += highest;
        }

        const isCrit = hope === fear;

        let tone = '';
        if (!isReaction) {
            if (isCrit) {
                tone = ' [**Critical Success!**] :light_blue_heart: \n-# You gain 1 Hope.\n-# You can clear 1 Stress.';
                embedColor = colours.critical; 
            } else if (hope > fear) {
                tone = ' [**With Hope**] :yellow_heart: \n-# You gain 1 Hope.';
                embedColor = colours.hope;
            } else {
                tone = ' [**With Fear**] :purple_circle: \n-# GM gains 1 Fear.';
                embedColor = colours.fear;
            }
        } else {
            if (isCrit) {
                tone = ' [**Critical Success!**] :light_blue_heart:'; //mention the crit, but give no in-game effect
                embedColor = colours.critical;
            } else {
                tone = ''; //no special tone for reaction rolls otherwise
                embedColor = colours.neutral;
            }
        }


        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`Two D12 Roll - ${roll_type}`)
            .setDescription(
                `**Hope d12:** \`${hope.toString().padStart(2, ' ')}\` | ` +
                `**Fear d12:** \`${fear.toString().padStart(2, ' ')}\`\n` +
                (modifier ? `-# **Modifier:** ${modifier}\n` : '') +
                (bonusText ? `${bonusText}\n` : '') +
                `\n**Final Total:** ${finalTotal} ` +
                `${tone}`
            )
            .setTimestamp()
            .setFooter({ text: 'inspired by Daggerheart™' });

        let executionInfo = 'in a DM channel.';

        if (interaction.guild) {
            executionInfo = `in ${interaction.guild.name} [${interaction.guild.id}].`;
        }

        logCommandExecution(interaction);

        await interaction.reply({ embeds: [embed], flags: hideEmbed(!show) });
    }
};
