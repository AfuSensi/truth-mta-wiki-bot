const { Inhibitor } = require('klasa');

module.exports = class extends Inhibitor {
  constructor(...args) {
    super(...args, {
      name: 'channelBlacklist',
      enabled: true,
      spamProtection: false,
    });
  }

  async run(message) {
    if (
      message.guild.settings
        .get('channelBlacklist')
        .includes(message.channel.id)
    ) {
      return true;
    }
  }
};
