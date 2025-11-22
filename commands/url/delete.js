import * as utils from '../../utils.js';

import Page from '../../schemas/page.js';

export default async interaction => {
    const url = interaction.options.getString('url');
    const parsedUrl = utils.parseUrl(url);

    const page = await interaction.resolvePage(parsedUrl);
    if (!page) return interaction.reply({
        content: '존재하지 않는 URL입니다.',
        ephemeral: true
    });

    await Page.deleteOne({
        id: page.id
    });

    if (page.url.includes(':')) delete global.wildcardPages[page.id];

    return interaction.reply(`${utils.formatUrl(page.domain, page.url)} URL을 삭제했습니다.`);
}