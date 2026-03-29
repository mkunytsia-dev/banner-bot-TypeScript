require('dotenv').config();
const { App } = require('@slack/bolt');
const { registerSlackHandlers } = require('./slack/interactions');
const { closeBrowser } = require('./renderer');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 3000,
});

registerSlackHandlers(app);

(async () => {
  await app.start();
  console.log('⚡ Banner Bot is running!');
  console.log('Use /banner in Slack to create a banner.');
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});
