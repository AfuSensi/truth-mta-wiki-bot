const {
  Route,
  util: { encrypt },
  constants: { RESPONSES },
} = require('klasa-dashboard-hooks');
const { inspect } = require('util');
const axios = require('axios');

module.exports = class extends Route {
  constructor(...args) {
    super(...args, {
      route: 'oauth/user',
      authenticated: true,
    });
  }

  async api(_token) {
    const token = `Bearer ${_token}`;
    let user = {};
    const userRes = await axios.get('https://discordapp.com/api/users/@me', {
      headers: { Authorization: token },
    });
    if (!userRes || !userRes.data) throw new Error('Failed to fetch user');
    user = userRes.data;

    const userGuildsRes = await axios.get(
      'https://discordapp.com/api/users/@me/guilds',
      {
        headers: { Authorization: token },
      }
    );

    user.guilds = [];
    if (userGuildsRes && userGuildsRes.data) {
      user.guilds = userGuildsRes.data;
    }
    return this.client.dashboardUsers.add(user);
  }

  async get(request, response) {
    let dashboardUser = this.client.dashboardUsers.cache.get(
      request.auth.scope[0]
    );

    if (!dashboardUser) {
      dashboardUser = await this.api(request.auth.token);
      response.setHeader(
        'Authorization',
        encrypt(
          {
            token: request.auth.token,
            scope: [
              dashboardUser.id,
              ...dashboardUser.guilds
                .filter(guild => guild.userCanManage)
                .map(guild => guild.id),
            ],
          },
          this.client.options.clientSecret
        )
      );
    }

    return response.end(JSON.stringify(dashboardUser));
  }

  async post(request, response) {
    const botUser = await this.client.users.fetch(request.body.id);
    const updated = await botUser.settings.update(request.body.data, {
      action: 'overwrite',
    });
    const errored = Boolean(updated.errors.length);

    if (errored)
      this.client.emit(
        'error',
        `${botUser.username}[${
          botUser.id
        }] failed updating user configs via dashboard with error:\n${inspect(
          updated.errors
        )}`
      );

    return response.end(RESPONSES.UPDATED[Number(!errored)]);
  }
};
