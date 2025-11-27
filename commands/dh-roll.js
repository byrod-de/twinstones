const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { logCommandExecution, hideEmbed, getColours, getEmoji, rollDie, rollDice } = require('../helper/misc');
const { writeToDB } = require('../helper/db');

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
        .addStringOption(option =>
            option.setName('d20_bonus')
                .setDescription('Add a d20 roll bonus or penalty (for either fear or hope die)')
                .addChoices(
                    { name: 'None', value: 'none' },
                    { name: 'Hope Bonus', value: 'hope' },
                    { name: 'Fear Penalty', value: 'fear' }
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
        const d20_bonus = interaction.options.getString('d20_bonus') ?? 'none';
        const isReaction = roll_type === 'Reaction';

        const hopeDie = d20_bonus === 'hope' ? 20 : 12;
        const fearDie = d20_bonus === 'fear' ? 20 : 12;
        const hope = rollDie(hopeDie);
        const fear = rollDie(fearDie);
        const baseTotal = hope + fear + modifier;

        let bonusText = '';
        let finalTotal = baseTotal;

        if (bonus === 'advantage') {
            const d6 = rollDie(6);
            bonusText = `-# Advantage d6: \`+${d6}\``;
            finalTotal += d6;
        } else if (bonus === 'disadvantage') {
            const d6 = rollDie(6);
            bonusText = `-# Disadvantage d6: \`-${d6}\``;
            finalTotal -= d6;
        } else if (bonus === 'ally' && (allyDiceCount ?? 0) > 0) {
            const rolls = rollDice(allyDiceCount, 6);
            const highest = Math.max(...rolls);
            bonusText = `-# Ally help d6s: [${rolls.join(', ')}] > \`+${highest}\``;
            finalTotal += highest;
        }

        const isCrit = hope === fear;

        let tone = '';
        let emoji = '';
        if (!isReaction) {
            if (isCrit) {
                emoji = getEmoji('TwoD12', ':light_blue_heart:');
                tone = `\n**Critical Success!**\n-# You gain 1 Hope. You can clear 1 Stress.`;
                embedColor = getColours('critical');
            } else if (hope > fear) {
                emoji = getEmoji('Hope', ':yellow_heart:');
                tone = `\n**With Hope**\n-# You gain 1 Hope.`;
                embedColor = getColours('hope');
            } else {
                emoji = getEmoji('Fear', ':purple_heart:');
                tone = `\n**With Fear**\n-# GM gains 1 Fear.`;
                embedColor = getColours('fear');
            }
        } else {
            if (isCrit) {
                emoji = getEmoji('TwoD12', ':light_blue_heart:');
                tone = `\n**Critical Success!** ${emoji}`; //mention the crit, but give no in-game effect
                embedColor = getColours('critical');
            } else {
                tone = '';
                embedColor = getColours('neutral');
            }
        }

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`${roll_type} Roll`)
            .setDescription(
                `**Hope d${hopeDie}:** \`${hope.toString().padStart(2, ' ')}\` | ` +
                `**Fear d${fearDie}:** \`${fear.toString().padStart(2, ' ')}\`` +
                (modifier ? `\n-# Modifier: \`${modifier}\`` : '') +
                (bonusText ? `\n${bonusText}` : '') +
                `\n### **Final Total:** \`${finalTotal}\` ${emoji}` +
                `${tone}`
            )
            .setTimestamp()
            .setFooter({ text: 'inspired by Daggerheart™' });

        logCommandExecution(interaction);

        //write to db: if fear was created, if hopw was created, if stress was cleared, if it was a crit
        writeToDB({
            isCrit,
            hopeGained: !isReaction && (isCrit || hope > fear) ? 1 : 0,
            fearGained: !isReaction && (fear > hope) ? 1 : 0,
            stressCleared: !isReaction && isCrit ? 1 : 0
        });

        await interaction.reply({ embeds: [embed], flags: hideEmbed(!show) });
    }
};
