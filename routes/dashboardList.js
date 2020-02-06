const {
  Route,
  util: { encrypt },
} = require('klasa-dashboard-hooks');

const fetch = require('node-fetch');

module.exports = class extends Route {
  constructor(...args) {
    super(...args, {
      route: 'dashboard/list',
      authenticated: true,
    });
  }

  async api(_token) {
    const token = `Bearer ${_token}`;
    const user = await fetch('https://discordapp.com/api/users/@me', {
      headers: { Authorization: token },
    }).then(result => result.json());
    await this.client.users.fetch(user.id);
    user.guilds = await fetch('https://discordapp.com/api/users/@me/guilds', {
      headers: { Authorization: token },
    }).then(result => result.json());
    return this.client.dashboardUsers.add(user);
  }

  async get(request, response) {
    let dashboardUser = this.client.dashboardUsers.get(request.auth.scope[0]);

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

    const managedGuildList = dashboardUser.guilds
      .filter(guild => guild.userCanManage)
      .map(guild => ({
        id: guild.id,
        name: guild.name,
        iconURL: guild.iconURL,
        botIsInGuild: this.client.guilds.has(guild.id),
        inviteURL: `${this.client.invite}&guild_id=${guild.id}`,
      }));

    return response.end(JSON.stringify(managedGuildList));
  }
};
