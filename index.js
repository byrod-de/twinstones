const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const moment = require('moment');

const { printLog } = require('./helper/misc');

const fs = require('node:fs');
const path = require('node:path');

require('dotenv').config();

const dbConfig = require('./conf/dbConfig');
const mysql = require('mysql2/promise');

const EPHEMERAL = 1 << 6;

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

// --- Status JSON ---
const statusPath = process.env.WEBROOT
  ? path.join(process.env.WEBROOT, 'status.json')
  : path.join(__dirname, '../twinstones-web/status.json');

const rollStats = process.env.WEBROOT
  ? path.join(process.env.WEBROOT, 'rollStats.json')
  : path.join(__dirname, '../twinstones-web/rollStats.json');
  
function updateStatus() {
	const status = {
		online: client.ws.status === 0, // 0 = READY
		timestamp: new Date().toISOString(),
		servers: client.guilds.cache.size,
	};
	fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
	//printLog(`Status updated: ${status.online ? 'Online' : 'Offline'} | Servers: ${status.servers}`);
}

function updateRollStats() {
	mysql.createConnection(dbConfig)
		.then(connection => {
			const query = 'SELECT COUNT(*) AS totalRolls, SUM(isCrit) AS totalCrits, SUM(hopeGained) AS totalHope, SUM(fearGained) AS totalFear, SUM(stressCleared) AS totalStress FROM rollstats';
			return connection.query(query)
				.then(([rows]) => {
					connection.end();
					const stats = {
						totalRolls: rows[0].totalRolls || 0,
						totalCrits: rows[0].totalCrits || 0,
						totalHope: rows[0].totalHope || 0,
						totalFear: rows[0].totalFear || 0,
						totalStress: rows[0].totalStress || 0,
					};
					fs.writeFileSync(rollStats, JSON.stringify(stats, null, 2));
				});
		})
		.catch(error => {
			printLog(`Error updating roll stats: ${error}`, 'error');
		});
}

client.once(Events.ClientReady, () => {
	const startUpTime = moment().format().replace('T', ' ');
	printLog(`Logged in as ${client.user.tag} at ${startUpTime}`);

	// Initial status update
	updateStatus();
	updateRollStats();

	// Update status every 5 minutes
	setInterval(updateStatus, 5 * 60 * 1000);
	setInterval(updateRollStats, 5 * 60 * 1000);
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) {
		printLog(`Unknown command: /${interaction.commandName}`, 'warn');
		await interaction.reply({ content: 'Unknown command.', flags: EPHEMERAL });
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		printLog(error, 'error');
		await interaction.reply({ content: 'Error while executing command.', flags: EPHEMERAL });
	}
});

client.on(Events.GuildCreate, guild => {
	const joinedAt = moment().format('YYYY-MM-DD HH:mm:ss');
	printLog(`Joined new guild: ${guild.name} (ID: ${guild.id}) at ${joinedAt}`);
});
client.on(Events.GuildDelete, guild => {
	const leftAt = moment().format('YYYY-MM-DD HH:mm:ss');
	printLog(`Left guild: ${guild.name} (ID: ${guild.id}) at ${leftAt}`);
});

process.on('SIGINT', () => {
	printLog('Bot is shutting down (SIGINT received)', 'warn');
	process.exit();
});

process.on('SIGTERM', () => {
	printLog('Bot is shutting down (SIGTERM received)', 'warn');
	process.exit();
});


client.login(process.env.DISCORD_TOKEN);
