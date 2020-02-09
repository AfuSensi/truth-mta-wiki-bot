const {
  Route,
  util: { encrypt },
  constants: { RESPONSES },
} = require('klasa-dashboard-hooks');

module.exports = class extends Route {
  constructor(...args) {
    super(...args, {
      route: 'dashboard/list',
      authenticated: true,
    });
  }

  async get(request, response) {
    const oauthUser = this.store.get('oauthUser');
    if (!oauthUser) return this.notReady(response);

    let dashboardUser = this.client.dashboardUsers.get(request.auth.scope[0]);

    if (!dashboardUser) {
      dashboardUser = await oauthUser.api(request.auth.token);
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

  notReady(response) {
    response.writeHead(500);
    return response.end(RESPONSES.NOT_READY);
  }
};
