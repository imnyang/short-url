const utils = require('../../utils');

const Page = require('../../schemas/page');

module.exports = async interaction => {
    const url = interaction.options.getString('url');
    const parsedUrl = utils.parseUrl(url);

    const deleted = await Page.findOneAndDelete({
        url: parsedUrl
    });
    if(!deleted) return interaction.reply({
        content: '존재하지 않는 URL입니다.',
        ephemeral: true
    });

    return interaction.reply(`${utils.formatUrl(deleted.url)} URL을 삭제했습니다.`);
}