/**
 * Slack approval flow.
 *
 *   web /submit → postApprovalRequest()
 *     → message in #banner-approvals with the banner image + Approve / Reject
 *   Approve button  → posts banner to #approved-designs, @mentions requester
 *   Reject button   → opens a modal with a *required* reason
 *     reject_submit  → DMs the requester the reason
 *
 * Uses Socket Mode (no public webhook needed for interactivity).
 */
import { App } from '@slack/bolt';
import { publicBaseUrl } from './static-server';
import { loadRequest, updateRequest } from './pending-store';
import type { PendingRequest } from '../types';

const APPROVAL_CHANNEL = process.env.SLACK_APPROVAL_CHANNEL || '#banner-approvals';
const APPROVED_CHANNEL = process.env.SLACK_APPROVED_CHANNEL || '#approved-designs';

let app: App | null = null;

export function isApprovalConfigured(): boolean {
  return Boolean(
    process.env.SLACK_BOT_TOKEN &&
    process.env.SLACK_APP_TOKEN &&
    process.env.SLACK_SIGNING_SECRET
  );
}

function bannerImageUrl(req: PendingRequest): string | null {
  const base = publicBaseUrl();
  if (!base) return null;
  return `${base}/pending/${req.id}.png`;
}

/** Post a new banner to the approvals channel with Approve / Reject buttons. */
export async function postApprovalRequest(req: PendingRequest): Promise<void> {
  if (!app) throw new Error('Slack approval app not initialised');
  const imageUrl = bannerImageUrl(req);
  const requesterTag = req.slackUserId ? `<@${req.slackUserId}>` : req.requester;

  const blocks: any[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:framed_picture: *New banner awaiting approval*\nFrom: ${requesterTag}\nTemplate: \`${req.templateId}\`${req.params.title ? `\nTitle: "${req.params.title}"` : ''}`,
      },
    },
  ];
  if (imageUrl) {
    blocks.push({ type: 'image', image_url: imageUrl, alt_text: 'Banner preview' });
  } else {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: ':warning: PUBLIC_BASE_URL not set — preview image unavailable.' }],
    });
  }
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Approve', emoji: true },
        style: 'primary',
        action_id: 'approve_request',
        value: req.id,
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Reject', emoji: true },
        style: 'danger',
        action_id: 'reject_request',
        value: req.id,
      },
    ],
  });

  await app.client.chat.postMessage({
    channel: APPROVAL_CHANNEL,
    text: `New banner awaiting approval from ${req.requester}`,
    blocks,
  });
}

function registerHandlers(a: App): void {
  // ── Approve ──────────────────────────────────────────────────────────────
  a.action('approve_request', async ({ ack, body, client }: any) => {
    await ack();
    const id = body.actions[0].value as string;
    const req = loadRequest(id);
    const approver = `<@${body.user.id}>`;
    const channel = body.channel?.id || body.container?.channel_id;
    const messageTs = body.message?.ts || body.container?.message_ts;

    if (!req) {
      if (channel && messageTs) {
        await client.chat.update({ channel, ts: messageTs, text: 'Request not found (expired).' }).catch(() => {});
      }
      return;
    }

    updateRequest(id, { status: 'approved', decidedBy: body.user.id });

    // Post to the design channel
    const imageUrl = bannerImageUrl(req);
    const requesterTag = req.slackUserId ? `<@${req.slackUserId}>` : req.requester;
    const postBlocks: any[] = [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `:white_check_mark: New banner by ${requesterTag} — approved by ${approver}.` },
      },
    ];
    if (imageUrl) postBlocks.push({ type: 'image', image_url: imageUrl, alt_text: 'Approved banner' });
    await client.chat.postMessage({
      channel: APPROVED_CHANNEL,
      text: `Approved banner by ${req.requester}`,
      blocks: postBlocks,
    }).catch((e: Error) => console.error('post to approved channel failed:', e.message));

    // Update the approvals message in place
    if (channel && messageTs) {
      await client.chat.update({
        channel,
        ts: messageTs,
        text: 'Approved',
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: `:white_check_mark: *Approved* by ${approver} — posted to <#${stripHash(APPROVED_CHANNEL)}|${stripHash(APPROVED_CHANNEL)}>.` } },
        ],
      }).catch(() => {});
    }

    // Notify the requester via DM
    if (req.slackUserId) {
      await client.chat.postMessage({
        channel: req.slackUserId,
        text: `:white_check_mark: Your banner was approved and posted to #${stripHash(APPROVED_CHANNEL)}.`,
      }).catch(() => {});
    }
  });

  // ── Reject → open modal ──────────────────────────────────────────────────
  a.action('reject_request', async ({ ack, body, client }: any) => {
    await ack();
    const id = body.actions[0].value as string;
    const channel = body.channel?.id || body.container?.channel_id;
    const messageTs = body.message?.ts || body.container?.message_ts;
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'reject_submit',
        private_metadata: JSON.stringify({ id, channel, messageTs }),
        title: { type: 'plain_text', text: 'Reject banner' },
        submit: { type: 'plain_text', text: 'Send rejection' },
        close: { type: 'plain_text', text: 'Cancel' },
        blocks: [
          {
            type: 'input',
            block_id: 'reason_block',
            label: { type: 'plain_text', text: 'Reason (required)' },
            element: {
              type: 'plain_text_input',
              action_id: 'reason_input',
              multiline: true,
              placeholder: { type: 'plain_text', text: 'Explain what needs to change…' },
            },
          },
        ],
      },
    });
  });

  // ── Reject modal submit ──────────────────────────────────────────────────
  a.view('reject_submit', async ({ ack, body, view, client }: any) => {
    await ack();
    const meta = JSON.parse(view.private_metadata || '{}');
    const reason = view.state.values?.reason_block?.reason_input?.value || '(no reason)';
    const req = loadRequest(meta.id);
    const rejecter = `<@${body.user.id}>`;

    if (req) {
      updateRequest(meta.id, { status: 'rejected', rejectReason: reason, decidedBy: body.user.id });
      if (req.slackUserId) {
        await client.chat.postMessage({
          channel: req.slackUserId,
          text: `:x: Your banner was rejected by ${rejecter}.\n*Reason:* ${reason}`,
        }).catch(() => {});
      }
    }

    if (meta.channel && meta.messageTs) {
      await client.chat.update({
        channel: meta.channel,
        ts: meta.messageTs,
        text: 'Rejected',
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: `:x: *Rejected* by ${rejecter}.\n*Reason:* ${reason}` } },
        ],
      }).catch(() => {});
    }
  });
}

function stripHash(ch: string): string {
  return ch.replace(/^#/, '');
}

/** Boot the Socket-Mode Bolt app for approval interactions. Returns null if unconfigured. */
export async function initApprovalApp(): Promise<App | null> {
  if (!isApprovalConfigured()) {
    console.warn('[approval] Slack tokens not set — approval flow disabled (banner building still works).');
    return null;
  }
  app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
  });
  registerHandlers(app);
  await app.start();
  console.log('[approval] Slack approval app connected (Socket Mode).');
  return app;
}
