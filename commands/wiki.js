const { Command } = require('klasa');
const { MTAWikiParser } = require('mta-wiki-parser');

module.exports = class extends Command {
  // (value:str{1,30}) [...]
  constructor(...args) {
    super(...args, {
      usage: '<help|example|search|get:default> [value:string{1,30}]  [...]',
      usageDelim: ' ',
      cooldown: 2,
      cooldownLevel: 'author',
      runIn: ['text'],
      permissionLevel: 0,
      // subcommands: true,
      description: "Search and get articles from MTA:SA's wiki.",
    });
  }

  run(message, [type, ...params]) {
    return this[type](message, params);
  }

  async help(message) {
    const usageMessage = `
\`\`\`md
# MTA:SA Wiki command usage
\`query\`               :: < Get a wiki article. Wrap query in backticks >
${message.guild.settings.prefix}wiki <query>         :: < Get a wiki article >
${message.guild.settings.prefix}wiki search <query>  :: < Get search results >
${
  message.guild.settings.prefix
}wiki example <query> :: < Get example of function/event >
\`\`\`
> *This bot has settings such as channel blacklists, embed configurations and more.
> To configure this bot, please go to <${message.client.options.webURL}>*`;
    return message.channel.send(usageMessage);
  }

  async example(message, [query]) {
    if (!message.guild.settings.get('general.enableExample')) return;
    if (!query || typeof query !== 'string' || query.length <= 3) {
      return false;
    }
    let fetched;
    let exampleMessage;
    try {
      fetched = await MTAWikiParser.fetch(query, 'Truth - MTASA Discord bot');
      exampleMessage = message.client.wikiExampleMessage(
        fetched,
        message.author
      );
    } catch (err) {
      if (
        err.message === "missingtitle: The page you specified doesn't exist."
      ) {
        if (message.guild.settings.get('general.returnNoResultMessage')) {
          return message.channel.send(`No results for **${query}**`);
        }
      } else if (err.message === 'NO PAGE TYPE') {
        return message.channel.send(
          `You can only use examples for functions and events`
        );
      } else if (err.message === 'NO EXAMPLE') {
        return message.channel.send(`No examples for **${query}**`);
      } else {
        message.channel.send(`Could not find results. ***${err.message}***`);
      }
      console.error(err);
      return;
    }
    return message.channel.send(exampleMessage);
  }

  async search(message, [query]) {
    if (!message.guild.settings.get('general.enableSearch')) return;
    if (!query || typeof query !== 'string' || query.length <= 3) {
      return false;
    }
    let fetched;
    try {
      fetched = await MTAWikiParser.search(
        query,
        10,
        'Truth - MTASA Discord bot'
      );
    } catch (err) {
      console.log(err);
      return false;
    }
    if (fetched.hits === 0) {
      return message.channel.send(`No results for **${query}**`);
    }

    return message.channel.sendEmbed(
      message.client.wikiSearchEmbed(fetched, message.author, 10)
    );
  }

  async get(message, [query]) {
    if (!message.guild.settings.get('general.enableGet')) return;
    if (!query || typeof query !== 'string' || query.length <= 3) {
      return false;
    }
    let fetched;
    try {
      fetched = await MTAWikiParser.fetch(query, 'Truth - MTASA Discord bot');
    } catch (err) {
      if (
        err.message === "missingtitle: The page you specified doesn't exist." &&
        message.guild.settings.get('general.returnNoResultMessage')
      ) {
        return message.channel.send(`No results for **${query}**`);
      }
      console.error(err);
      return message.guild.settings.get('general.returnNoResultMessage')
        ? message.channel.send(`Could not find results. ***${err.message}***`)
        : false;
    }
    return message.channel.sendEmbed(
      message.client.wikiEmbed(fetched, message.guildSettings, message.author)
    );
  }
};
