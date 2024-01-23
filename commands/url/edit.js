const utils = require('../../utils');
const handler = require('./handler');

module.exports = async interaction => {
    const url = interaction.options.getString('url');
    const parsedUrl = url.startsWith('id/') ? ({
        url
    }) : utils.parseUrl(url);

    const page = await interaction.resolvePage(parsedUrl);
    if(!page) return interaction.reply({
        content: '존재하지 않는 URL입니다.',
        ephemeral: true
    });

    const msg = await interaction.reply(await handler.getMessage(page));
    return handler.handleMessage(page, msg, interaction.user);
}