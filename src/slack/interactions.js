const { TEMPLATES, listLogos } = require('../templates/templates');
const { renderBanner } = require('../renderer');
const fs = require('fs');

function registerSlackHandlers(app) {
  // /banner command - opens the modal
  app.command('/banner', async ({ ack, body, client }) => {
    await ack();

    const templateOptions = Object.entries(TEMPLATES).map(([id, t]) => ({
      text: { type: 'plain_text', text: `${t.name} — ${t.description}` },
      value: id,
    }));

    const logos = listLogos();
    const logoOptions = logos.length > 0
      ? logos.map(l => ({
          text: { type: 'plain_text', text: l.replace(/\.[^.]+$/, '') },
          value: l,
        }))
      : [{ text: { type: 'plain_text', text: 'No logos available' }, value: 'none' }];

    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'banner_submit',
        title: { type: 'plain_text', text: 'Create Banner' },
        submit: { type: 'plain_text', text: 'Generate' },
        close: { type: 'plain_text', text: 'Cancel' },
        private_metadata: body.channel_id || '',
        blocks: [
          {
            type: 'input',
            block_id: 'template_block',
            label: { type: 'plain_text', text: 'Template' },
            element: {
              type: 'static_select',
              action_id: 'template_select',
              placeholder: { type: 'plain_text', text: 'Choose a template...' },
              options: templateOptions,
            },
          },
          {
            type: 'input',
            block_id: 'title_block',
            label: { type: 'plain_text', text: 'Title' },
            optional: true,
            element: {
              type: 'plain_text_input',
              action_id: 'title_input',
              placeholder: { type: 'plain_text', text: 'Main banner title' },
              multiline: true,
            },
          },
          {
            type: 'input',
            block_id: 'subtitle_block',
            label: { type: 'plain_text', text: 'Subtitle' },
            optional: true,
            element: {
              type: 'plain_text_input',
              action_id: 'subtitle_input',
              placeholder: { type: 'plain_text', text: 'Small text above the title (optional)' },
            },
          },
          {
            type: 'input',
            block_id: 'logo_block',
            label: { type: 'plain_text', text: 'Partner Logo' },
            optional: true,
            element: {
              type: 'static_select',
              action_id: 'logo_select',
              placeholder: { type: 'plain_text', text: 'Choose partner logo...' },
              options: logoOptions,
            },
          },
          {
            type: 'input',
            block_id: 'theme_block',
            label: { type: 'plain_text', text: 'Theme' },
            element: {
              type: 'static_select',
              action_id: 'theme_select',
              options: [
                { text: { type: 'plain_text', text: 'Light' }, value: 'light' },
                { text: { type: 'plain_text', text: 'Dark' }, value: 'dark' },
              ],
              initial_option: { text: { type: 'plain_text', text: 'Light' }, value: 'light' },
            },
          },
          {
            type: 'input',
            block_id: 'date_block',
            label: { type: 'plain_text', text: 'Date Range (for Week in Blockchains)' },
            optional: true,
            element: {
              type: 'plain_text_input',
              action_id: 'date_input',
              placeholder: { type: 'plain_text', text: 'e.g. February 23 – March 1' },
            },
          },
        ],
      },
    });
  });

  // Handle modal submission
  app.view('banner_submit', async ({ ack, view, client, body }) => {
    await ack();

    const values = view.state.values;
    const templateId = values.template_block.template_select.selected_option.value;
    const title = values.title_block.title_input?.value || '';
    const subtitle = values.subtitle_block.subtitle_input?.value || '';
    const partnerLogo = values.logo_block.logo_select?.selected_option?.value || '';
    const theme = values.theme_block.theme_select.selected_option.value;
    const dateRange = values.date_block.date_input?.value || '';
    const channelId = view.private_metadata;
    const userId = body.user.id;

    try {
      // Send "generating..." message
      const msg = channelId
        ? await client.chat.postMessage({
            channel: channelId,
            text: `:hourglass_flowing_sand: Generating banner...`,
          })
        : null;

      const params = {
        title,
        subtitle,
        partnerLogo: partnerLogo !== 'none' ? partnerLogo : '',
        theme,
        dateRange,
      };

      const outputPath = await renderBanner(templateId, params);

      // Upload the banner
      const uploadTarget = channelId || userId;
      await client.files.uploadV2({
        channel_id: uploadTarget,
        file: fs.createReadStream(outputPath),
        filename: `banner-${Date.now()}.png`,
        title: `Banner: ${title || TEMPLATES[templateId].name}`,
        initial_comment: `:white_check_mark: Banner ready! Template: *${TEMPLATES[templateId].name}*${title ? ` | Title: "${title}"` : ''}`,
      });

      // Delete the "generating" message
      if (msg) {
        await client.chat.delete({ channel: channelId, ts: msg.ts }).catch(() => {});
      }

      // Clean up file
      fs.unlinkSync(outputPath);
    } catch (error) {
      console.error('Banner generation error:', error);
      const target = channelId || userId;
      if (target) {
        await client.chat.postMessage({
          channel: target,
          text: `:x: Failed to generate banner: ${error.message}`,
        });
      }
    }
  });
}

module.exports = { registerSlackHandlers };
