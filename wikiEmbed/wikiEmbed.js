// Embed limits: https://discordjs.guide/popular-topics/embeds.html#embed-limits

const { MessageEmbed } = require('discord.js');
const {
  Client: { plugin },
} = require('klasa');

function getColorFromType(type) {
  if (type === 'Server Function' || type === 'Server Event') return '#FF7F00';
  if (type === 'Client Function' || type === 'Client Event') return '#FF0000';
  if (type === 'Shared Function') return '#0000FF';
  if (type === 'Useful Function') return '#228B22';
  return '#FFFFFF';
}
function getUrlFromType(type) {
  if (type === 'Server Function')
    return 'https://wiki.multitheftauto.com/wiki/Server_Scripting_Functions';
  if (type === 'Server Event')
    return 'https://wiki.multitheftauto.com/wiki/Server_Scripting_Events';
  if (type === 'Client Function')
    return 'https://wiki.multitheftauto.com/wiki/Client_Scripting_Functions';
  if (type === 'Client Event')
    return 'https://wiki.multitheftauto.com/wiki/Client_Scripting_Events';
  if (type === 'Shared Function')
    return 'https://wiki.multitheftauto.com/wiki/Shared_Scripting_Functions';
  if (type === 'Useful Function')
    return 'https://wiki.multitheftauto.com/wiki/Useful_Functions';
  return 'https://wiki.multitheftauto.com/wiki/Main_Page';
}
function getDescriptionString(article) {
  let description = '';
  let maxDescriptionLength = 400;
  if (article.type === 'Page') {
    maxDescriptionLength = 1000;
    for (const section of article.sections) {
      if (section.paragraphs.length > 0 && section.title !== 'See Also') {
        description = `${description}\n**${section.title || ''}**\n`;
        for (const paragraph of section.paragraphs) {
          description += paragraph.text;
          if (description.length >= maxDescriptionLength) {
            description = description.substring(0, maxDescriptionLength);
            break;
          }
        }
      }
    }
  } else {
    for (const section of article.sections) {
      if (section.title === 'Description') {
        for (const paragraph of section.paragraphs) {
          description += paragraph.text;
          if (description.length >= maxDescriptionLength) {
            description = description.substring(0, maxDescriptionLength);
            break;
          }
        }
        break;
      }
    }
  }

  return description.length >= maxDescriptionLength
    ? `${description}...`
    : description;
}

// TODO: Fix parameters for events
function getEmbed(article, guildSettings, requester) {
  const embed = {
    color: getColorFromType(article.type),
    title: article.title,
    url: article.url,
    author: {
      name: article.type,
      url: getUrlFromType(article.type),
    },
    description: guildSettings.wikiembed.showPageDescription
      ? getDescriptionString(article)
      : undefined,
    fields: [],
    image: {},
    footer: {
      text: `${requester.username}#${
        requester.discriminator
      }            - use '.wiki help' for more information`,
      icon_url: `https://cdn.discordapp.com/avatars/${requester.id}/${
        requester.avatar
      }.png`,
    },
  };
  // Image
  if (guildSettings.wikiembed.showPageImage && article.image) {
    embed.image.url = article.image;
  }
  // Fields
  const fields = [];
  for (const section of article.sections) {
    if (article.type === 'Page') {
      break;
    } else if (
      article.type === 'Shared Function' ||
      article.type === 'Client Function' ||
      article.type === 'Server Function' ||
      article.type === 'Useful Function'
    ) {
      if (
        section.title === 'Syntax' &&
        (guildSettings.wikiembed.showFunctionSyntax ||
          guildSettings.wikiembed.showFunctionOOPSyntax)
      ) {
        const syntax = { name: 'Syntax', value: '' };
        const OOP = { name: 'OOP Syntax', value: '' };

        for (const paragraph of section.paragraphs) {
          if (
            paragraph.type === 'Codeblock' &&
            paragraph.title !== 'Required Arguments' &&
            guildSettings.wikiembed.showFunctionSyntax
          ) {
            const codeblockTitle = paragraph.title
              ? `***${paragraph.title}***\n`
              : '';
            syntax.value = syntax.value + codeblockTitle + paragraph.text;
          } else if (
            paragraph.title === 'OOP Syntax' &&
            guildSettings.wikiembed.showFunctionOOPSyntax
          ) {
            OOP.value = paragraph.text;
          }
        }
        if (
          guildSettings.wikiembed.showFunctionSyntax &&
          syntax.value.length > 0
        )
          fields.push(syntax);
        if (
          guildSettings.wikiembed.showFunctionOOPSyntax &&
          OOP.value.length > 0
        )
          fields.push(OOP);
      } else if (
        section.title === 'Returns' &&
        guildSettings.wikiembed.showFunctionReturnsSection
      ) {
        const returns = { name: 'Returns', value: '' };
        for (const paragraph of section.paragraphs) {
          returns.value += paragraph.text;
        }
        if (returns.value.length > 0) fields.push(returns);
      }
    } else if (
      article.type === 'Client Event' ||
      article.type === 'Server Event'
    ) {
      if (
        section.title === 'Parameters' &&
        (guildSettings.wikiembed.showEventParameter ||
          guildSettings.wikiembed.showEventParameterText)
      ) {
        const parameterBlock = { name: 'Parameters', value: '' };
        const parameterText = { name: 'Parameters List', value: '' };
        for (const paragraph of section.paragraphs) {
          if (
            paragraph.type === 'Codeblock' &&
            guildSettings.wikiembed.showEventParameter
          ) {
            parameterBlock.value += paragraph.text;
          } else if (guildSettings.wikiembed.showFunctionOOPSyntax) {
            parameterText.value = paragraph.text;
          }
        }
        if (
          guildSettings.wikiembed.showEventParameter &&
          parameterBlock.value.length > 0
        )
          fields.push(parameterBlock);
        if (
          guildSettings.wikiembed.showEventParameterText &&
          parameterText.value.length > 0
        )
          fields.push(parameterText);
      } else if (
        section.title === 'Source' &&
        guildSettings.wikiembed.showEventSource
      ) {
        const source = { name: 'Source', value: '' };
        for (const paragraph of section.paragraphs) {
          source.value += paragraph.text;
        }
        if (source.value.length > 0) fields.push(source);
      } else if (
        section.title === 'Canceling' &&
        guildSettings.wikiembed.showEventCancel
      ) {
        const canceling = { name: 'Canceling', value: '' };
        for (const paragraph of section.paragraphs) {
          canceling.value += paragraph.text;
        }
        if (canceling.value.length > 0) fields.push(canceling);
      }
    }
  }
  embed.fields = fields;
  return new MessageEmbed(embed);
}

function getSearchEmbed(searchResults, requester, maxResults) {
  const embed = {
    color: '#48c774',
    title: `Search results: ${searchResults.query}`,
    url: `https://wiki.multitheftauto.com/index.php?title=Special%3ASearch&go=Go&search=${encodeURI(
      searchResults.query
    )}`,
    description: `**Hits:** ${searchResults.hits}`,
    fields: [],
    footer: {
      text: `${requester.username}#${
        requester.discriminator
      } - use '.wiki help' for more information`,
      icon_url: `https://cdn.discordapp.com/avatars/${requester.id}/${
        requester.avatar
      }.png`,
    },
  };
  for (const result of searchResults.results) {
    const n = embed.fields.length + 1;
    if (embed.fields.length >= maxResults) break;
    embed.fields.push({
      name: `${n}.`,
      value: `[${result.title}](${result.url} 'Go to page')`,
    });
  }
  return new MessageEmbed(embed);
}

function getExampleMessage(article) {
  if (article.type === 'Page') {
    throw new Error('NO PAGE TYPE');
  }
  const returnMessage = `**${article.title} Example - <${
    article.url
  }#Example>**\n`;
  // Set example to fields
  const maxMessageLength = 2000 - returnMessage.length;
  let lastTitle = false;
  let exampleString = '';
  for (const section of article.sections) {
    if (section.title === 'Example') {
      for (const paragraph of section.paragraphs) {
        if (exampleString.length + paragraph.text.length >= maxMessageLength) {
          break;
        }
        if (
          typeof paragraph.title === 'string' &&
          lastTitle !== paragraph.title
        ) {
          exampleString = `${exampleString}\n__**${paragraph.title}**__\n`;
          lastTitle = paragraph.title;
        }
        exampleString = `${exampleString}${paragraph.text}`;
      }
      break;
    }
  }
  if (exampleString.length === 0) {
    throw new Error('NO EXAMPLE');
  }
  return returnMessage + exampleString;
}

module.exports = {
  [plugin]() {
    this.wikiEmbed = getEmbed;
    this.wikiExampleMessage = getExampleMessage;
    this.wikiSearchEmbed = getSearchEmbed;
  },
};