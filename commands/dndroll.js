const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const { printLog } = require('../helper/misc');
const colours = require('../conf/colours.json');

const embedColor = colours.default || '#0099ff';
const EPHEMERAL = 1 << 6;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dndroll')
        .setDescription('Roll a classic die like in DnD!')       
        .addIntegerOption(option =>
            option.setName('dice')
                .setDescription('Select your dice')
                .addChoices(
                    { name: 'Roll a D20', value: 20 },
                    { name: 'Roll a D12', value: 12 },
                    { name: 'Roll a D10', value: 10 },
                    { name: 'Roll a D8', value: 8 },
                    { name: 'Roll a D6', value: 6 },
                    { name: 'Roll a D4', value: 4 },
                    { name: 'Coinflip', value: 2 },
                ))
        .addBooleanOption(option =>
            option.setName('show')
                .setDescription('Show response (default: true)')),

    /**
     * Asynchronously executes the interaction by rolling a dice and generating a result based on the dice value. 
     *
     * @param {Object} interaction - the interaction object
     * @return {Promise<void>} a promise that resolves when the interaction is executed
     */
    async execute(interaction) {

        const dice = interaction.options.getInteger('dice') ?? 20;
        const show = interaction.options.getBoolean('show') ?? true;

        let result = Math.floor(Math.random() * dice) + 1;
        let value = '';

        if (dice == 2) {
            if (result == 1) {
                result = 'Heads';
                value = 'Coinflip Result';
            } else {
                result = 'Tails';
                value = 'Coinflip Result';
            }
        } else {
            if (result == 1 && dice == 20) {
                result = 'Natural 1 *sad trombone*';
            }

            if (result == 20) {
                result = 'Natural *f-cking* 20!';
            }

            value = 'Result dice roll D' + dice;
        }

        const rolliesEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`Rollies!`)
            .setDescription(`${value} - **${result}**`)
            .setTimestamp()
            .setFooter({ text: 'inspired by DnD'})

        printLog(`Command /dndroll executed by ${interaction.user.username}#${interaction.user.discriminator} [${interaction.user.id}] in ${interaction.guild.name} [${interaction.guild.id}]`);
        printLog(`>>> Dice: ${dice}, Show: ${show}`);

        await interaction.reply({ embeds: [rolliesEmbed], flags: !show ? EPHEMERAL : 0 });
    }
};
