const Discord = require('discord.js');

const client = new Discord.Client();
const star_channel_id = '651141135141699586';
const min_emojis = 1;

//check a message attachment. if it's an image, return the attachment, otherwise return ''
function getImageAttachment(attachment) {
  const imageLink = attachment.split('.');
  const typeOfImage = imageLink[imageLink.length - 1];
  const image = /(jpg|jpeg|png|gif)/gi.test(typeOfImage);
  if (!image) return '';
  return attachment;
}

//return a string representation of the emoji reactions on a message
function getEmojiString(message) {
  let emoji_string = ''
  message.reactions.forEach(reaction => {
    emoji_string += reaction.emoji.toString() + ' ' + reaction.count + '  ';
  })
  return emoji_string;
}

//return the total number of reactions on a message
function getEmojiCount(message) {
  let emoji_count = 0;
  message.reactions.forEach(reaction => {
    emoji_count += reaction.count;
  })
  return emoji_count;
}

//return the total number of star reactions on a message
function getStarCount(message) {
  let star_count = 0;
  message.reactions.forEach(reaction => {
    if (reaction.emoji.toString() === '⭐') {// || or pin?
      star_count += reaction.count;
    }
  })
  return star_count;
}

//return a RichEmbed object based on the message, or return false if message is empty
async function buildEmbed(message) {
  const image = message.attachments.size > 0 ? await getImageAttachment(message.attachments.array()[0].url) : '';
  // If the message is empty, return undefined
  if (image === '' && message.cleanContent.length < 1) return false;

  const embed = {
    color: 15844367,
    // Here we use cleanContent, which replaces all mentions in the message with their
    // equivalent text. For example, an @everyone ping will just display as @everyone, without tagging you!
    // At the date of this edit (09/06/18) embeds do not mention yet.
    // But nothing is stopping Discord from enabling mentions from embeds in a future update.
    description: message.cleanContent,
    author: {
      name: message.author.tag, 
      url: message.author.displayAvatarURL
    },
    fields: [
      {
        name: 'Original',
        value: `[Jump to Message](${message.url})`
      }
    ],
    footer: `${getEmojiString(message)} | ${message.id}`,
    timestamp: new Date(),
    image: image
  };

  return embed;
}
 

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
//                                        (reaction on the message, user who reacted)
  const message = reaction.message;
  const starChannel = client.channels.get(star_channel_id);

  //don't allow starring bot messages
  if(message.author.bot) return;

  //don't allow starring messages in the starboard channel
  if(message.channel.id === star_channel_id) return;

  //only continue if the message has the necessary number of stars
  message.channel.send(`starcount: ${getStarCount(message)}`);
  if(getStarCount(message) < min_emojis) return;

  //scan starboard to see if message already exists there
  const fetchedMessages = await starChannel.fetchMessages();
  const alreadyStarredMessage = fetchedMessages.find(m => m.embeds[0] && m.embeds[0].footer && m.embeds[0].footer.text.endsWith(message.id));
  const embed = buildEmbed(message);
  console.log(embed);
  if(alreadyStarredMessage) {
    message.channel.send(`message is already starred here: ${alreadyStarredMessage.url}`);
    //edit the embed
    if(embed) await alreadyStarredMessage.edit({ embed });
  }
  else {
    //add message to starboard
    if(embed) await starChannel.send({ embed });
  }

    
});

 

// THIS  MUST  BE  THIS  WAY

client.login(process.env.BOT_TOKEN);//where BOT_TOKEN is the token of our bot