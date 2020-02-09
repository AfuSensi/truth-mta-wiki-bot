const {
  Route,
  util: { encrypt },
  constants: { RESPONSES },
} = require('klasa-dashboard-hooks');

module.exports = class extends Route {
  constructor(...args) {
    super(...args, {
      route: 'dashboard/settings/:guildID',
      authenticated: true,
    });
  }

  formatGuildChannels(guild) {
    const channelBlacklists = guild.settings.get('channelBlacklist');
    const rawFormatted = guild.channels
      .filter(channel => channel.type === 'text' && !channel.deleted)
      .map(channel => {
        const channelObj = {
          id: channel.id,
          name: channel.name,
          isBlacklisted: channelBlacklists.includes(channel.id),
          parent: false,
        };

        if (channel.parentID && guild.channels.has(channel.parentID)) {
          channelObj.parent = {
            id: channel.parentID,
            name: guild.channels.get(channel.parentID).name,
          };
        }
        return channelObj;
      })
      // return rawFormatted
      // Format into category => channels
      .reduce((r, a) => {
        r[a.parent.name || 'Uncategorized'] = [
          ...(r[a.parent.name || 'Uncategorized'] || []),
          a,
        ];
        return r;
      }, {});
    const formatted = [];
    for (const cat in rawFormatted) {
      if (cat) {
        formatted.push({
          name: cat,
          channels: rawFormatted[cat],
        });
      }
    }
    return formatted;
  }

  async post(request, response) {
    if (
      !request.body.embedSettings &&
      !request.body.channelBlacklistSettings &&
      !request.body.generalSettings
    ) {
      response.writeHead(400);
      return response.end('No valid settings in body');
    }

    let dashboardUser = this.client.dashboardUsers.get(request.auth.scope[0]);

    if (!dashboardUser) {
      const oauthUser = this.store.get('oauthUser');
      if (!oauthUser) return this.notReady(response);

      dashboardUser = await oauthUser.api(request.auth.token);
      response.setHeader(
        'Authorization',
        encrypt(
          {
            token: request.auth.token,
            scope: [
              dashboardUser.id,
              ...dashboardUser.guilds
                .filter(g => g.userCanManage)
                .map(g => g.id),
            ],
          },
          this.client.options.clientSecret
        )
      );
    }

    const managedGuildList = dashboardUser.guilds
      .filter(g => g.userCanManage)
      .map(g => g.id);

    // Check if auth user has manage guild perms
    const { guildID } = request.params;
    if (!guildID || !managedGuildList.includes(guildID)) {
      response.writeHead(403);
      return response.end('No permissions for requested guild');
    }

    // Check if bot is in guild
    if (!this.client.guilds.has(guildID)) {
      response.writeHead(403);
      return response.end('Bot is not in guild');
    }
    const guild = this.client.guilds.get(guildID);

    // Embed settings
    if (request.body.embedSettings) {
      for (const name in request.body.embedSettings) {
        if (typeof name === 'string') {
          try {
            await guild.settings.update(
              `wikiembed.${name}`,
              request.body.embedSettings[name],
              { action: 'overwrite' }
            );
          } catch (err) {
            console.log(err);
            response.writeHead(500);
            return response.end(err.message);
          }
        }
      }
    }
    // Channel Blacklist settings
    if (request.body.channelBlacklistSettings) {
      try {
        await guild.settings.update(
          `channelBlacklist`,
          request.body.channelBlacklistSettings,
          { action: 'overwrite' }
        );
      } catch (err) {
        console.log(err);
        response.writeHead(500);
        return response.end(err.message);
      }
    }

    // General Settings
    if (request.body.generalSettings) {
      for (const name in request.body.generalSettings) {
        if (name) {
          try {
            await guild.settings.update(
              `general.${name}`,
              request.body.generalSettings[name],
              { action: 'overwrite' }
            );
          } catch (err) {
            console.log(err);
            response.writeHead(500);
            return response.end(err.message);
          }
        }
      }
    }

    return response.end(JSON.stringify({ ok: true }));
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
                .filter(g => g.userCanManage)
                .map(g => g.id),
            ],
          },
          this.client.options.clientSecret
        )
      );
    }

    const managedGuildList = dashboardUser.guilds
      .filter(g => g.userCanManage)
      .map(g => g.id);

    // Check if auth user has manage guild perms
    const { guildID } = request.params;
    if (!guildID || !managedGuildList.includes(guildID)) {
      response.writeHead(403);
      return response.end('No permissions for requested guild');
    }

    // Check if bot is in guild
    if (!this.client.guilds.has(guildID)) {
      response.writeHead(403);
      return response.end('Bot is not in guild');
    }

    // Map response
    const guild = this.client.guilds.get(guildID);
    const res = {
      name: guild.name,
      id: guild.id,
      embedSettings: guild.settings.wikiembed,
      blacklistSettings: this.formatGuildChannels(guild),
      generalSettings: guild.settings.general,
    };
    return response.end(JSON.stringify(res));
  }

  notReady(response) {
    response.writeHead(500);
    return response.end(RESPONSES.NOT_READY);
  }

  noCode(response) {
    response.writeHead(400);
    return response.end(RESPONSES.NO_CODE);
  }
};
