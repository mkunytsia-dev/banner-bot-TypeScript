import 'dotenv/config';
import { App } from '@slack/bolt';
import { registerSlackHandlers } from './slack/interactions';
import { closeBrowser } from './renderer';
import { startStaticServer, publicBaseUrl } from './lib/static-server';
import { warmLogoPreviews } from './lib/logo-previews';
import { listLogos } from './templates/templates';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

registerSlackHandlers(app);

(async () => {
  startStaticServer();

  warmLogoPreviews(listLogos()).catch(err => {
    console.warn('[startup] logo warmup error:', (err as Error).message);
  });

  await app.start();
  console.log('⚡ Banner Bot is running!');
  console.log('Use /banner in Slack to create a banner.');

  if (!publicBaseUrl()) {
    console.warn(
      '\n[!] PUBLIC_BASE_URL is not set. Slack image previews will not render.\n' +
        '    On Railway this is provided automatically via RAILWAY_PUBLIC_DOMAIN;\n' +
        '    locally, expose a tunnel (e.g. cloudflared / ngrok) and set\n' +
        '    PUBLIC_BASE_URL=https://your-tunnel.example\n'
    );
  }
})();

async function shutdown(): Promise<void> {
  await closeBrowser();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
