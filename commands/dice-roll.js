const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { logCommandExecution, getColours, hideEmbed, rollDie, rollDice } = require('../helper/misc');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice-roll')
        .setDescription('Roll dice. Supports XdY (e.g., 3d6) and "coin".')

        .addStringOption(option =>
            option.setName('dice')
                .setDescription('(optional): Dice format in the format XdY, or "coin" (default: 1d20).')
                .setRequired(false))

        .addStringOption(option =>
            option.setName('bonus')
                .setDescription('(optional): D20 roll bonus (ignored if rolling multiple dice).')
                .setRequired(false)
                .addChoices(
                    { name: 'Advantage', value: 'advantage' },
                    { name: 'Disadvantage', value: 'disadvantage' },
                )
        )
        .addBooleanOption(option =>
            option.setName('show')
                .setRequired(false)
                .setDescription('(optional): Shows the result (default: true).')),

    /**
     * Asynchronously executes the interaction by rolling a dice and generating a result based on the dice value. 
     *
     * @param {Object} interaction - the interaction object
     * @return {Promise<void>} a promise that resolves when the interaction is executed
     */
    async execute(interaction) {
        let embedColor = getColours('default');

        const rawDiceString = interaction.options.getString('dice');
        let diceString = (rawDiceString ?? '1d20').trim().toLowerCase();

        const show = interaction.options.getBoolean('show') ?? true;
        const bonus = interaction.options.getString('bonus') ?? 'none';

        //tranfer coin to 1d2 for easier processing
        if (diceString === 'coin') {
            diceString = '1d2';
        }

        let [numDice, numSides] = diceString.split('d').map(Number);

        if (!Number.isInteger(numDice) || !Number.isInteger(numSides) || numSides <= 0) {
            embedColor = getColours('error') || '#FF4C4C';

            const errorEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('Invalid dice format')
                .setDescription('Please use the format `XdY`, where `X` is the number of dice and `Y` is the number of sides (e.g., 3d6), or `coin`.')
            await interaction.reply({ embeds: [errorEmbed], flags: hideEmbed(true) });
            return;
        }

        const allowedDice = ['d2', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', 'coin'];

        if (!allowedDice.includes('d' + numSides) && !(numSides === 2 && numDice === 1)) {
            embedColor = getColours('error') || '#FF4C4C';

            const errorEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('Invalid dice size')
                .setDescription(`Please use one of the following dice sizes: \`${allowedDice.join('`, `')}\``);
            await interaction.reply({ embeds: [errorEmbed], flags: hideEmbed(true) });
            return;
        }

        if (numDice > 1 && numSides === 20 && bonus !== 'none') {
            embedColor = getColours('error') || '#FF4C4C';
            const errorEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('Invalid dice combination')
                .setDescription('You cannot roll multiple D20s with a bonus. Please use a single D20 and choose `advantage` or `disadvantage`.');
            await interaction.reply({ embeds: [errorEmbed], flags: hideEmbed(true) });
            return;
        }

        if (numDice <= 0) {
            numDice = 1;
        }

        let rolls = rollDice(numDice, numSides);
        let total = rolls.reduce((acc, val) => acc + val, 0);

        let value = '';

        const rollsString = rolls.join(', ');

        if (numDice === 1) {
            if (numSides === 2) {
                if (rolls[0] === 1) {
                    value = 'Result of flipping a coin: **Heads**';
                } else {
                    value = 'Result of flipping a coin: **Tails**';
                }
            } else {
                value = `Result of rolling a d${numSides}\n### Total: **${total}**`;
            }
        } else {
            value = `Result: ${numDice}d${numSides} (${rollsString})\n### Total: **${total}**`;
        }

        let title = 'Roll Result for ' + (rawDiceString ?? '1d20').trim();
        let finalResult = '';
        let firstRoll = rolls[0];
        let secondRoll = null;

        if (numSides === 20 && numDice === 1) {
            if (bonus === 'advantage' || bonus === 'disadvantage') {
                secondRoll = rollDice(1, 20)[0];
                rolls.push(secondRoll);

                if (bonus === 'advantage') {
                    finalResult = Math.max(firstRoll, secondRoll);
                    title = 'Roll Result for d20';
                } else {
                    finalResult = Math.min(firstRoll, secondRoll);
                    title = 'Roll Result for d20';
                }

                value = `Result: (d20 > ${rolls[0]}, ${secondRoll})\n### Total: **${finalResult}**`;
            } else {
                finalResult = rolls[0];
                title = 'Roll Result for 1d20';
                value = `Result: d20\n### Total: **${finalResult}**`;
            }

            if (finalResult === 20) {
                value += '\n\n:fire: Natural f*ing 20!';
                title = 'Critical Success!';
                embedColor = getColours('hope');
            } else if (finalResult === 1) {
                value += '\n\n:skull: Natural One...';
                title = 'Critical Fail!';
                embedColor = getColours('fear');
            }

            if (bonus === 'advantage') title += ' (with Advantage)';
            if (bonus === 'disadvantage') title += ' (with Disadvantage)';
        }


        const rolliesEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(title)
            .setDescription(`${value}`)
            .setTimestamp()
            .setFooter({ text: 'inspired by TTRPGs' })

        logCommandExecution(interaction);

        await interaction.reply({ embeds: [rolliesEmbed], flags: hideEmbed(!show) });
    }
};
