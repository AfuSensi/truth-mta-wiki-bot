const { Client } = require('klasa');
const config = require('./config.json');
// const WikiFetch = require("./wikiFetch/wikiFetch")
Client.use(require('./wikiEmbed/wikiEmbed'));
Client.use(require('klasa-dashboard-hooks'));

new Client({
  fetchAllMembers: false,
  prefix: config.defaultPrefix,
  commandEditing: false,
  typing: false,
  slowmode: 1000,
  disabledCorePieces: ['commands'],
  readyMessage: c =>
    `Successfully initialized. Ready to serve ${c.guilds.size} guilds.`,
  presence: {
    status: 'online',
    activity: {
      name: '.wiki help',
      type: 'PLAYING',
    },
  },
  providers: {
    default: 'mongodb',
    mongodb: {
      connectionString: config.db.connectionString,
      db: config.db.databaseName,
    },
  },
  dashboardHooks: config.dashboardConfig,
  clientSecret: config.clientSecret,
  clientID: config.clientID,
  callbackUri: config.callbackUri,
  webURL: config.webURL,
}).login(config.token);

// Default guild settings
Client.defaultGuildSchema.add('wikiembed', schema =>
  schema
    .add('showPageDescription', 'boolean', { default: true })
    .add('showPageImage', 'boolean', { default: true })
    .add('showFunctionSyntax', 'boolean', { default: true })
    .add('showFunctionOOPSyntax', 'boolean', { default: true })
    .add('showFunctionReturnsSection', 'boolean', { default: true })
    .add('showEventParameter', 'boolean', { default: true })
    .add('showEventParameterText', 'boolean', { default: true })
    .add('showEventSource', 'boolean', { default: true })
    .add('showEventCancel', 'boolean', { default: true })
);
Client.defaultGuildSchema.add('general', schema =>
  schema
    .add('enableGet', 'boolean', { default: true })
    .add('enableBacktick', 'boolean', { default: true })
    .add('enableExample', 'boolean', { default: true })
    .add('enableSearch', 'boolean', { default: true })
    .add('returnNoResultMessage', 'boolean', { default: true })
);
Client.defaultGuildSchema.add('channelBlacklist', 'textchannel', {
  array: true,
});
