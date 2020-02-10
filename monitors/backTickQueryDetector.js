const { Monitor } = require('klasa');
const { MTAWikiParser } = require('mta-wiki-parser');
const matchAll = require('string.prototype.matchall');

const maxQueriesFromMessage = 2;
const cooldown = new Map();
const cooldownTime = 2000;

module.exports = class extends Monitor {
  constructor(...args) {
    super(...args, {
      ignoreOthers: false,
    });
  }

  setCooldown(authorID) {
    cooldown.set(authorID, true);
    setTimeout(() => {
      cooldown.delete(authorID);
    }, cooldownTime);
  }

  async run(msg) {
    if (!msg.guild || msg.channel.type !== 'text') {
      return;
    }
    if (cooldown.has(msg.author.id)) {
      return;
    }
    if (msg.guild.settings.get('channelBlacklist').includes(msg.channel.id)) {
      return;
    }
    if (!msg.guild.settings.get('general.enableBacktick')) {
      return;
    }

    const { content } = msg;
    if (
      !content ||
      !content.length ||
      content.length < 3 ||
      content.startsWith(`${msg.guild.settings.prefix}wiki`)
    ) {
      return;
    }

    const matches = [...matchAll(content, /(?<!`)`([a-zA-Z ]{3,20})`(?!`)/g)];
    if (matches && matches.length > 0) {
      const send = 0;
      for (const match of matches) {
        if (
          send <= maxQueriesFromMessage &&
          typeof match[1] === 'string' &&
          match[1].length > 2
        ) {
          let fetched;
          try {
            fetched = await MTAWikiParser.fetch(
              match[1],
              'Truth - MTASA Discord bot'
            );
          } catch (err) {
            if (
              err.message ===
              "missingtitle: The page you specified doesn't exist."
            ) {
              if (msg.guild.settings.get('general.returnNoResultMessage')) {
                msg.channel.send(`No results for **${match[1]}**`);
              }
            } else if (
              msg.guild.settings.get('general.returnNoResultMessage')
            ) {
              msg.channel.send(`Could not find results. ***${err.message}***`);
            }
            console.error(err);
            // eslint-disable-next-line no-continue
            continue;
          }
          msg.channel.sendEmbed(
            msg.client.wikiEmbed(fetched, msg.guildSettings, msg.author)
          );
        }
      }
    }
    this.setCooldown(msg.author.id);
  }
};
