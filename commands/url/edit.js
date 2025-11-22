import * as utils from '../../utils.js';
import * as handler from './handler.js';

export default async interaction => {
    const url = interaction.options.getString('url');
    const parsedUrl = url.startsWith('id/') ? ({
        url
    }) : utils.parseUrl(url);

    const page = await interaction.resolvePage(parsedUrl);
    if (!page) return interaction.reply({
        content: '존재하지 않는 URL입니다.',
        ephemeral: true
    });

    const msg = await interaction.reply(await handler.getMessage(page));
    return handler.handleMessage(page, msg, interaction);
}