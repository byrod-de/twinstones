const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const moment = require('moment');

const fs = require('node:fs');
const path = require('node:path');

require('dotenv').config();

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
})

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(path.join(commandsPath, file));
	client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, () => {
	const startUpTime = moment().format().replace('T', ' ');
	console.log(`Logged in as ${client.user.tag} at ${startUpTime}`);
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.commands.get(interaction.commandName);
	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'Error while executing command.', ephemeral: true });
	}
});

client.login(process.env.DISCORD_TOKEN);
