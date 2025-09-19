const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { logCommandExecution, hideEmbed, getColours, rollDie, rollDice } = require('../helper/misc');

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
                .setDescription('Indicate if it is an Action roll (with Hope and Fear), or Reaction roll without (default: Action)')
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
        let embedColor = getColours('default');

        const modifier = interaction.options.getInteger('modifier') ?? 0;
        const bonus = interaction.options.getString('bonus') ?? 'none';
        const allyDiceCount = interaction.options.getInteger('ally_dice') ?? 0;
        const show = interaction.options.getBoolean('show') ?? true;
        const roll_type = interaction.options.getString('type') ?? 'Action';
        const isReaction = roll_type === 'Reaction';

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
        } else if (bonus === 'ally' && (allyDiceCount ?? 0) > 0) {
            const rolls = rollDice(allyDiceCount, 6);
            const highest = Math.max(...rolls);
            bonusText = `Ally help d6s: [${rolls.join(', ')}] > **+${highest}**`;
            finalTotal += highest;
        }

        const isCrit = hope === fear;

        let tone = '';
        if (!isReaction) {
            if (isCrit) {
                tone = ' [**Critical Success!**] :light_blue_heart: \n-# You gain 1 Hope.\n-# You can clear 1 Stress.';
                embedColor = getColours('critical');
            } else if (hope > fear) {
                tone = ' [**With Hope**] :yellow_heart: \n-# You gain 1 Hope.';
                embedColor = getColours('hope');
            } else {
                tone = ' [**With Fear**] :purple_circle: \n-# GM gains 1 Fear.';
                embedColor = getColours('fear');
            }
        } else {
            if (isCrit) {
                tone = ' [**Critical Success!**] :light_blue_heart:'; //mention the crit, but give no in-game effect
                embedColor = getColours('critical');
            } else {
                tone = ''; //no special tone for reaction rolls otherwise
                embedColor = getColours('neutral');
            }
        }

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`${roll_type} Roll - 2d12`)
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

        logCommandExecution(interaction);

        await interaction.reply({ embeds: [embed], flags: hideEmbed(!show) });
    }
};
