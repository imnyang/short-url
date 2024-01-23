const utils = require('../../utils');

const Page = require('../../schemas/page');

module.exports = async interaction => {
    const url = interaction.options.getString('url');
    const parsedUrl = utils.parseUrl(url);

    const page = await interaction.resolvePage(parsedUrl);
    if(!page) return interaction.reply({
        content: '존재하지 않는 URL입니다.',
        ephemeral: true
    });

    await Page.deleteOne({
        id: page.id
    });

    return interaction.reply(`${utils.formatUrl(page.domain, page.url)} URL을 삭제했습니다.`);
}