const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { logCommandExecution, hideEmbed, getColours, aOrAn, rollDie } = require('../helper/misc');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rollies')
        .setDescription('Everyone rolls a d20! Highest roll wins.')
        .addIntegerOption(option =>
            option.setName('minutes')
                .setDescription('How long to wait for players to join (default: 1, max: 5)')
                .setMinValue(1)
                .setMaxValue(5)
        ),

    async execute(interaction) {
        const minutes = interaction.options.getInteger('minutes') ?? 1;
        const endsAt = Math.floor(Date.now() / 1000) + (minutes * 60) + 10;
        const embedColor = getColours('default');

        const joinButton = new ButtonBuilder()
            .setCustomId('rollies-join')
            .setLabel('Join 🎲')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(joinButton);

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle('🎲 Rollies!')
            .setDescription(`Everyone roll a d20! Click the button to join.\n\nJoining open until <t:${endsAt}:R>`)
            .setFooter({ text: 'inspired by Critical Role' });

        logCommandExecution(interaction);


        await interaction.reply({ embeds: [embed], components: [row] });

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.customId === 'rollies-join',
            time: (minutes * 60 + 10) * 1000
        });

        const participants = new Map();
        collector.on('collect', async i => {
            if (participants.has(i.user.id)) {
                await i.reply({ content: 'You already joined!', flags: hideEmbed() });
                return;
            }
            const roll = rollDie(20);

            const member = await interaction.guild.members.fetch(i.user.id);
            const displayName = member.displayName;

            participants.set(i.user.id, { userId: i.user.id, username: displayName, roll });

            let flavourText = '';
            if (roll === 1) {
                flavourText = '\n:skull: Natural One...';
            } else if (roll === 20) {
                flavourText = '\n:fire: Natural f*ing 20!';
            }


            await i.reply({ content: `🎲 ${displayName} joined and rolled ${aOrAn(roll)} **${roll}**!${flavourText}` });
        });

        collector.on('end', async () => {
            if (participants.size === 0) {
                await interaction.editReply({ content: 'Nobody joined. 😢', embeds: [], components: [] });
                return;
            }

            // Roll for each participant
            const results = [...participants.values()]
                .sort((a, b) => b.roll - a.roll);

            // Assign ranks (handle ties)
            let rank = 1;
            results.forEach((r, i) => {
                if (i > 0 && r.roll === results[i - 1].roll) {
                    r.rank = results[i - 1].rank;
                } else {
                    r.rank = rank;
                }
                rank++;
            });

            const ranking = results.map(r => `**#${r.rank}** <@${r.userId}> — \`${r.roll}\``).join('\n'); const winner = results.filter(r => r.rank === 1).map(r => r.username).join(' & ');

            const resultEmbed = new EmbedBuilder()
                .setColor(getColours('critical'))
                .setTitle('🎲 Rollies - Results!')
                .setDescription(`🏆 **${winner}** rolled highest!\n\n${ranking}`)
                .setFooter({ text: 'inspired by Critical Role' });

            await interaction.editReply({ embeds: [resultEmbed], components: [] });
        });
    }
};