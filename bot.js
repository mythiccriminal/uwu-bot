const Discord = require('discord.js');

const client = new Discord.Client();
const channel_id = '651141135141699586';

 

client.on('ready', () => {

    console.log('Ready to collect wisdom!');
    client.user.setActivity('ping me for help');

});

 

client.on('message', msg => {
  //ignore bots including self:
  if (msg.author.bot) return;

  //pinging the bot is the trigger here
  if(msg.content.indexOf(`<@${client.user.id}>`) !== 0) return;

  const args = msg.content.split(/\s+/g);
  let command = '';

  //if you pinged the bot with no command, use the 'help' command
  if (typeof args[1] === 'undefined') {
    command = 'help';
  }
  else {
    command = args[1].toLowerCase();
  }

  //commands:
  if (command === 'help') {
    msg.channel.send('This is a starboard bot');
  }
  //other commands go here...
  else {
    msg.channel.send('unknown command');
  }

});

 

// THIS  MUST  BE  THIS  WAY

client.login(process.env.BOT_TOKEN);//where BOT_TOKEN is the token of our bot