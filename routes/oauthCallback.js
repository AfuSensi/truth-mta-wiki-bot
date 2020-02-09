const {
  Route,
  util: { encrypt },
  constants: { RESPONSES },
} = require('klasa-dashboard-hooks');
const axios = require('axios');
const qs = require('querystring');

module.exports = class extends Route {
  constructor(...args) {
    super(...args, { route: 'oauth/callback' });
  }

  get oauthUser() {
    return this.store.get('oauthUser');
  }

  async post(request, response) {
    /* eslint-disable camelcase */
    if (!request.body.code) return this.noCode(response);

    const postData = qs.stringify({
      grant_type: 'authorization_code',
      redirect_uri: this.client.options.callbackUri,
      code: request.body.code,
      client_id: this.client.options.clientID,
      client_secret: this.client.options.clientSecret,
      scope: 'identify%20guilds',
    });

    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };
    const res = await axios.post(
      'https://discordapp.com/api/oauth2/token',
      postData,
      config
    );

    if (!res || res.status !== 200)
      return response.end(RESPONSES.FETCHING_TOKEN);

    const { oauthUser } = this;

    if (!oauthUser) return this.notReady(response);

    const body = res.data;
    const user = await oauthUser.api(body.access_token);

    return response.end(
      JSON.stringify({
        access_token: encrypt(
          {
            token: body.access_token,
            scope: [
              user.id,
              ...user.guilds
                .filter(guild => guild.userCanManage)
                .map(guild => guild.id),
            ],
          },
          this.client.options.clientSecret
        ),
        user,
      })
    );
    /* eslint-enable camelcase */
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
