
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { logCommandExecution } = require('../helper/misc');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Send feedback about the bot.')
        .addBooleanOption(option =>
            option.setName('anonymous')
                .setDescription('Send feedback anonymously (default: false)')
                .setRequired(false)
        ),

    async execute(interaction) {
        logCommandExecution(interaction);

        const anonymous = interaction.options.getBoolean('anonymous') || false;

        const modal = new ModalBuilder()
            .setCustomId(`feedbackModal-${anonymous}`)
            .setTitle('Bot Feedback.');

        const labelText = 'Your Feedback' + (anonymous ? ' (anonymous)' : ' (includes your username)');
        const feedbackInput = new TextInputBuilder()
            .setCustomId('feedbackText')
            .setLabel(labelText)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000)
            .setPlaceholder('Enter your feedback here...');


        modal.addComponents(
            new ActionRowBuilder().addComponents(feedbackInput)
        );

        await interaction.showModal(modal);
    }
};