//to do:
// make best function work - it looks too far back
// make it ignore bot messages.

//var config = require("./config.json");

const Discord = require('discord.js');

const client = new Discord.Client();
const star_channel_id = '651669281196605442';
const min_emojis = 2;

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
  let my_array = message.reactions.map(reaction => {
    return reaction.emoji.toString() + ' ' + reaction.count;
  })

  emoji_string = my_array.join(' | ');
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

//returns the message with the most number of reacts in a given timeframe:
async function bestMessage(guild, days) {
  var t_best_message;
  let max_emojis = 0;
  let date = new Date();
  date.setDate(date.getDate() - days);
  let min_snowflake = Discord.SnowflakeUtil.generate(date);

  //get all text channels
  const channels = await guild.channels.filter(channel => channel.type === 'text');
  //loop over channels:
  for (const c of channels) {
    let channel = c[1];

    //get all messages after the set snowflake
    let messages = await channel.fetchMessages();//({after : min_snowflake});
    //loop over messages
    for (const m of messages) {
      let message = m[1]
      let emoji_count = await getEmojiCount(message);
      
      if (emoji_count > max_emojis) {
        max_emojis = emoji_count;
        t_best_message = message;
      }
    }
  }

  return t_best_message;
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
      icon_url: message.author.displayAvatarURL
    },
    fields: [
      {
        name: 'Original',
        value: `[Jump to Message](${message.url})`
      },
      {
        name: 'Reacts',
        value: await getEmojiString(message)
      }
    ],
    footer: {
      text: message.id
    },
    timestamp: message.createdAt,
    image: {
      url: image
    }
  };

  return embed;
}
 

client.on('ready', () => {
  console.log('Ready to collect wisdom!');
  client.user.setActivity('ping me for help');
});


client.on('message', async msg => {
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
  else if (command ==='throw'){
    throw 'bad error';
  }
  // this is broken right now!
  // else if (command === 'best') {
  //   //default to day
  //   let days = 1;
  //   let timespan = 'day';
  //   if (args[2]) {
  //     timespan = args[2].toLowerCase();
  //   }

  //   if (timespan === 'alltime') {
  //     embed_title = `Most reacted post of all time`;
  //   }
  //   else {
  //     embed_title = `Most reacted post of the past ${timespan}`;
  //   }

  //   if (timespan === 'day') {
  //     let days = 1;
  //   }
  //   else if (timespan === 'week') {
  //     let days = 7;
  //   }
  //   else if (timespan === 'month') {
  //     let days = 31;
  //   }
  //   else if (timespan === 'alltime') {
  //     let days = 1000;
  //   } else {
  //     msg.channel.send('unknown option, options are day, week, month, alltime');
  //     return;
  //   }
  //   //find the best message
  //   const best_message = await bestMessage(msg.channel.guild, days);
  //   const embed = await buildEmbed(best_message);
  //   if(embed) {
  //     embed.title = embed_title;
  //     await msg.channel.send({ embed });
  //   }
  // }
  else {
    msg.channel.send('unknown command');
  }

});

const events = {
  MESSAGE_REACTION_ADD: 'messageReactionAddCust',
  MESSAGE_REACTION_REMOVE: 'messageReactionRemoveCust',
};

client.on('raw', async event => {

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
  //was const message = reaction.message
  //hoping this will fix emoji counts?
  const message = await reaction.message.channel.fetchMessage(reaction.message.id); 
  const starChannel = client.channels.get(star_channel_id);


  //don't allow starring bot messages
  if(message.author.bot) return;

  //don't allow starring messages in the starboard channel
  if(message.channel.id === star_channel_id) return;

  //only continue if the message has the necessary number of stars
  if(getStarCount(message) < min_emojis) return;

  //scan starboard to see if message already exists there
  const fetchedMessages = await starChannel.fetchMessages();
  const alreadyStarredMessage = await fetchedMessages.find(m => m.embeds[0] && m.embeds[0].footer && m.embeds[0].footer.text.endsWith(message.id));
  const embed = await buildEmbed(message);

  if(alreadyStarredMessage) {
    //edit the embed
    if(embed) await alreadyStarredMessage.edit({ embed });
  }
  else {
    //add message to starboard
    if(embed) await starChannel.send({ embed });
  }

    
});

//exactly the same as messageReactionAddCust, but don't send, only edit emoji field
client.on('messageReactionRemoveCust', async (reaction, user) => {
//                                        (reaction on the message, user who reacted)
  const message = reaction.message;
  const starChannel = client.channels.get(star_channel_id);

  //don't allow starring bot messages
  if(message.author.bot) return;

  //don't allow starring messages in the starboard channel
  if(message.channel.id === star_channel_id) return;

  //only continue if the message has the necessary number of stars
  if(getStarCount(message) < min_emojis) return;

  //scan starboard to see if message already exists there
  const fetchedMessages = await starChannel.fetchMessages();
  const alreadyStarredMessage = await fetchedMessages.find(m => m.embeds[0] && m.embeds[0].footer && m.embeds[0].footer.text.endsWith(message.id));
  const embed = await buildEmbed(message);

  if(alreadyStarredMessage) {
    //edit the embed
    if(embed) await alreadyStarredMessage.edit({ embed });
  }    
});

 


//for running locally:
//client.login(config.token);

//for running with heroku
client.login(process.env.BOT_TOKEN);//where BOT_TOKEN is a heroku config variable
