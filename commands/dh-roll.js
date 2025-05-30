const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const colours = require('../conf/colours.json');
const { logCommandExecution } = require('../helper/misc');

let embedColor = colours.default || '#8A2BE2';
const EPHEMERAL = 1 << 6;

function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dh-roll')
        .setDescription('Roll for Hope and Fear, the Daggerheart™ way!')
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
        .addBooleanOption(option =>
            option.setName('show')
                .setDescription('Show response (default: true)')
        ),

    async execute(interaction) {
        const modifier = interaction.options.getInteger('modifier') ?? 0;
        const bonus = interaction.options.getString('bonus') ?? 'none';
        const allyDiceCount = interaction.options.getInteger('ally_dice') ?? 0;
        const show = interaction.options.getBoolean('show') ?? true;

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

        let tone = '';
        if (hope === fear) {
            tone = ' [**Critical Success!**] :light_blue_heart: \n-# You gain 1 Hope.\n-# You can clear 1 Stress.';
            embedColor = colours.critical || '#8A2BE2';
        } else if (hope > fear) {
            tone =  ' [**With Hope**] :yellow_heart: \n-# You gain 1 Hope.';
            embedColor = colours.hope || '#8A2BE2';
        } else {
            tone = ' [**With Fear**] :purple_circle: \n-# GM gains 1 Fear.';
            embedColor = colours.fear || '#8A2BE2';
        }

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle('Two D12 Roll')
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

        await interaction.reply({ embeds: [embed], flags: !show ? EPHEMERAL : 0 });
    }
};
