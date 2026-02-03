
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { logCommandExecution, hideEmbed, getEmoji } = require('../helper/misc');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Send feedback about the bot.'),

    async execute(interaction) {
        logCommandExecution(interaction);

        const modal = new ModalBuilder()
            .setCustomId('feedbackModal')
            .setTitle('Bot Feedback.');

        const feedbackInput = new TextInputBuilder()
            .setCustomId('feedbackText')
            .setLabel('Your Feedback')
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