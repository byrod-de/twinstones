const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const { logCommandExecution, hideEmbed, getColours, rollDie, rollDice } = require('../helper/misc');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll-any')
        .setDescription('Roll any dice and modifiers in any combination. Supports XdY format.')

        .addStringOption(option =>
            option.setName('rollinput')
                .setDescription('Any dice and modifiers, separated by `+` and `-` are allowed. Example: 2d6 + d8 - 2. (default: 1d20)')
                .setRequired(true))

        .addBooleanOption(option =>
            option.setName('show')
                .setRequired(false)
                .setDescription('(optional): Shows the result (default: true).')),
    async execute(interaction) {
        let embedColor = getColours('default');

        const rawRollInput = interaction.options.getString('rollinput').toLowerCase();
        const show = interaction.options.getBoolean('show') ?? true;

        //check if input only contains valid characters (digits, d, +, -, spaces)
        if (!/^[\dd+\-\s]+$/i.test(rawRollInput)) {
            embedColor = getColours('error') || '#FF4C4C';
            const errorEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('Invalid input format')
                .setDescription('Please use the format `XdY + XdY + X...`, where `X` is the number of dice and `Y` is the number of sides (e.g., 3d6).');
            await interaction.reply({ embeds: [errorEmbed], flags: hideEmbed(true) });
            return;
        }

        //split Input by '+' or '-', keep the '-' with the number
        let rollInput = rawRollInput.replaceAll(' ', '').replaceAll('--', '-').replaceAll('-', '+-');
        const rollParts = rollInput.split(/[\+]/).map(part => part.trim());

        //Gatekeeping to avoid too many dice or terms
        const MAX_TERMS = 30;
        const MAX_DICE = 100;

        if (rollParts.length > MAX_TERMS) {
            embedColor = getColours('error') || '#FF4C4C';
            const errorEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('Too many terms')
                .setDescription(`Please limit your rolls to ${MAX_TERMS} terms or less.`);
            await interaction.reply({ embeds: [errorEmbed], flags: hideEmbed() });
            return;
        }

        let total = 0;
        let diceCount = 0;
        let rolls = [];
        let invalidInput = false;
        let errorReason = '';

        //only allow certain dice types for simplicity and to avoid abuse
        const allowedDice = ['d2', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

        for (const part of rollParts) {
            if (part.includes('d')) {
                let sign = 1;
                let partClean = part;
                if (partClean.startsWith('-')) {
                    sign = -1;
                    partClean = partClean.substring(1);
                }

                if (partClean.startsWith('d')) {
                    partClean = '1' + partClean;
                }

                let [numDice, numSides] = partClean.split('d').map(Number);

                if (!allowedDice.includes('d' + numSides)) {
                    invalidInput = true;
                    errorReason += `Dice type not allowed: ${part}\n`;
                    continue;
                }
                if (!Number.isInteger(numDice) || !Number.isInteger(numSides) || numSides <= 0 || numDice <= 0) {
                    invalidInput = true;
                    errorReason += `Invalid dice format: ${part}\n`;
                    continue;
                }
                const dieRolls = rollDice(numDice, numSides);
                const sum = dieRolls.reduce((a, b) => a + b, 0);

                total += sign * sum;
                if (sign === -1) {
                    rolls = rolls.concat(dieRolls.map(n => -n));
                } else {
                    rolls = rolls.concat(dieRolls);
                };

                diceCount += numDice;

                if (diceCount > MAX_DICE) {
                    invalidInput = true;
                    errorReason += `Too many dice rolled (max ${MAX_DICE}).\n`;
                    break;
                }
            } else if (!isNaN(part)) {
                const modifier = Number(part);
                total += modifier;
                rolls.push(modifier);
            } else if (isNaN(part) && !part.includes('d')) {
                invalidInput = true;
                errorReason += `Invalid input: ${part}\n`;
            }
        }

        if (invalidInput) {
            embedColor = getColours('error') || '#FF4C4C';
            const errorEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('Invalid dice format')
                .setDescription(errorReason + '\n-# Please use the format `XdY`, where `X` is the number of dice and `Y` is the number of sides (e.g., 3d6).')
            await interaction.reply({ embeds: [errorEmbed], flags: hideEmbed(true) });
            return;
        }

        let rollString = rolls.map((roll, index) => `${roll}${index === rolls.length - 1 ? '' : '+'}`).join('');
        rollString = rollString.replaceAll('+-', '-');
        rollInput = rollInput.replaceAll('+-', '-');

        let title = 'Roll Result for '  + (rollInput || '').trim();
        let value = `Result: ${rollString}\n### Total: **${total}**`;

        const rollEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(title)
            .setDescription(`${value}`)
            .setTimestamp()
            .setFooter({ text: 'inspired by TTRPGs' })

        logCommandExecution(interaction, 'roll');

        await interaction.reply({ embeds: [rollEmbed], flags: hideEmbed(!show) });

    }
};