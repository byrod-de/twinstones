const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { printLog } = require('../helper/misc');
const colours = require('../conf/colours.json');

const EPHEMERAL = 1 << 6;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice-roll')
        .setDescription('Roll dice and generate a result based on the dice value. Supports XdY format.')

        .addStringOption(option =>
            option.setName('dice')
                .setDescription('(optional): Specifies the dice format in the format XdY. Defaults to 1d20.')
                .setRequired(false))

        .addStringOption(option =>
            option.setName('bonus')
                .setDescription('Choose D20 roll bonus')
                .setRequired(false)
                .addChoices(
                    { name: 'Advantage', value: 'advantage' },
                    { name: 'Disadvantage', value: 'disadvantage' },
                )
        )

        .addBooleanOption(option =>
            option.setName('show')
                .setRequired(false)
                .setDescription('(optional): Determines whether the response should be shown or not. Defaults to true.')),

    /**
     * Asynchronously executes the interaction by rolling a dice and generating a result based on the dice value. 
     *
     * @param {Object} interaction - the interaction object
     * @return {Promise<void>} a promise that resolves when the interaction is executed
     */
    async execute(interaction) {
        let embedColor = colours.default || '#8A2BE2';

        let diceString = interaction.options.getString('dice') ?? '1d20';
        const show = interaction.options.getBoolean('show') ?? true;
        const bonus = interaction.options.getString('bonus') ?? 'none';

        let [numDice, numSides] = diceString.split('d').map(Number);


        if (isNaN(numDice) || isNaN(numSides) || numSides === 0) {
            embedColor = colours.error || '#FF4C4C';

            const errorEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('Invalid dice format')
                .setDescription('Please use the format `XdY`, where `X` is the number of dice and `Y` is the number of sides.')
            await interaction.reply({ embeds: [errorEmbed], flags: EPHEMERAL });
            return;
        }

        const allowedDice = ['d2', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

        if (!allowedDice.includes('d' + numSides)) {
            embedColor = colours.error || '#FF4C4C';

            const errorEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('Invalid dice size')
                .setDescription(`Please use one of the following dice sizes: \`${allowedDice.join('`, `')}\``);
            await interaction.reply({ embeds: [errorEmbed], flags: EPHEMERAL });
            return;
        }

        if (numDice > 1 && numSides === 20) {
            embedColor = colours.error || '#FF4C4C';
            const errorEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('Invalid dice combination')
                .setDescription('You cannot roll multiple D20s at once. Please use a single D20, or choose advantage or disadvantage.');
            await interaction.reply({ embeds: [errorEmbed], flags: EPHEMERAL });
            return;
        }

        if (numDice === 0) {
            numDice = 1;
        }

        let rolls = [];
        let total = 0;
        let value = '';

        for (let i = 0; i < numDice; i++) {
            const roll = Math.floor(Math.random() * numSides) + 1;
            rolls.push(roll);
            total += roll;
        }

        const rollsString = rolls.join(', ');

        if (numDice === 1) {
            if (numSides === 2) {
                if (rolls[0] === 1) {
                    value = 'Result of flipping a coin: **Heads**';
                } else {
                    value = 'Result of flipping a coin: **Tails**';
                }
            } else {
                value = `Result of rolling a D${numSides}, Total: **${total}**`;
            }
        } else {
            value = `Result: ${numDice}d${numSides} (${rollsString}), Total: **${total}**`;
        }

        let title = 'Roll Result for ' + diceString;
        let finalResult = rolls[0];
        let secondRoll = null;

        if (numSides === 20 && numDice === 1) {
            if (bonus === 'advantage' || bonus === 'disadvantage') {
                secondRoll = Math.floor(Math.random() * 20) + 1;
                rolls.push(secondRoll);

                if (bonus === 'advantage') {
                    finalResult = Math.max(rolls[0], secondRoll);
                    title = 'Roll Result for d20';
                } else {
                    finalResult = Math.min(rolls[0], secondRoll);
                    title = 'Roll Result for d20';
                }

                value = `Result: (d20 > ${rolls[0]}, ${secondRoll}), Total: **${finalResult}**`;
            } else {
                finalResult = rolls[0];
                title = 'Roll Result for 1d20';
                value = `Result: d20, Total: **${finalResult}**`;
            }

            if (finalResult === 20) {
                value += '\n\n:fire: Natural f*ing 20!';
                title = 'Critical Success!';

                embedColor = colours.hope || embedColor;
            } else if (finalResult === 1) {
                value += '\n\n:skull: Natural 1';
                title = 'Critical Fail!';

                embedColor = colours.fear || embedColor;
            }

            if (bonus === 'advantage') title += ' (with Advantage)';
            if (bonus === 'disadvantage') title += ' (with Disadvantage)';
        }


        const rolliesEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(title)
            .setDescription(`${value}`)
            .setTimestamp()
            .setFooter({ text: 'inspired by DnD' })

        let executionInfo = 'in a DM channel.';

        if (interaction.guild) {
            executionInfo = `in ${interaction.guild.name} [${interaction.guild.id}].`;
        }

        printLog(`Command /${interaction.commandName} executed by ${interaction.user.username} [${interaction.user.id}] ${executionInfo}`);
        printLog(`>>> Dice: ${diceString}, Bonus: ${bonus}, Show: ${show}`);

        await interaction.reply({ embeds: [rolliesEmbed], flags: !show ? EPHEMERAL : 0 });
    }
};
