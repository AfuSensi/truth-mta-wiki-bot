const { Task } = require('klasa');

const maxUserAge = 60000; // Max user cache age in ms
module.exports = class extends Task {
  constructor(...args) {
    super(...args, { name: 'invalidateDashboardUsers', enabled: true });
  }

  async run() {
    if (!this.client.dashboardUsers) return;
    this.client.dashboardUsers.forEach((value, key, map) => {
      if (!value.fetched || new Date() - value.fetched > maxUserAge) {
        console.log(`Invalidating dashboarduser ${key}`);
        map.delete(key);
      }
    });
  }
};
