const { REST, Routes } = require('discord.js');
const fs = require('fs');
const { printLog } = require('./helper/misc');

require('dotenv').config();

const discordConf = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
};

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  printLog(`✅ Deploying: ${file}`);
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(discordConf.token);

(async () => {
  try {
    printLog(`Started refreshing ${commands.length} global application (/) commands...`);
    await rest.put(Routes.applicationCommands(discordConf.clientId), { body: commands });
    printLog(`✅ Successfully reloaded ${commands.length} global command(s).`);
  } catch (error) {
    console.error('❌ Deployment failed:', error);
  }
})();
