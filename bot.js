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

const events = {
  MESSAGE_REACTION_ADD: 'messageReactionAddCust',
  MESSAGE_REACTION_REMOVE: 'messageReactionRemoveCust',
};

client.on('raw', async event => {
  //console.log('\nRaw event data:\n', event);

  //events I care about have event.t = MESSAGE_REACTION_ADD or MESSAGE_REACTION_REMOVE. ignore everything else.
  if (!(event.t in events)) return;

  //save raw event data
  const data = event.d;
  const user = await client.users.get(data.user_id);

  //if the user is a bot, ignore it (ignore self)
  if(user.bot) return;

  let channel = await client.channels.get(data.channel_id);
  let message = await channel.fetchMessage(data.message_id);
  let emojiKey = (data.emoji.id) ? `${data.emoji.name}:${data.emoji.id}` : data.emoji.name;
  let reaction = await message.reactions.get(emojiKey);

  //if reaction is undefined because the reaction was just removed, build it from scratch (this applies to MESSAGE_REACTION_REMOVE events)
  if (!reaction) {
    // Create an object that can be passed through the event like normal
    const emoji = new Discord.Emoji(client.guilds.get(data.guild_id), data.emoji);
    reaction = new Discord.MessageReaction(message, emoji, 1, data.user_id === client.user.id);
  }

  //emit an event:
  client.emit(events[event.t], reaction, user);
});

client.on('messageReactionAddCust', async (reaction, user) => {
  
  //const user = reaction.message.author;
  const channel = reaction.message.channel;

  //pin
  if (reaction.emoji.toString() === '📌' || reaction.emoji.toString() === '⭐') {
    channel.send('I saw a star');
    
  }
});

 

// THIS  MUST  BE  THIS  WAY

client.login(process.env.BOT_TOKEN);//where BOT_TOKEN is the token of our bot