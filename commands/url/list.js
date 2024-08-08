const utils = require('../../utils');

const Page = require('../../schemas/page');

const Domain = require('../../domain.json');

module.exports = async interaction => {
    await interaction.deferReply({
        ephemeral: true
    });

    let domain = interaction.options.getString('domain');

    domain ??= interaction.dbUser.selectedDomain || Domain[0].domain;

    if(!(interaction.teamOwner || interaction.dbUser.allowedDomains.includes(domain)) || !Domain.some(d => d.domain === domain)) return interaction.reply({
        content: '사용할 수 없는 도메인입니다.',
        ephemeral: true
    });

    const pages = await Page.find({
        domain
    });

    return interaction.editReply({
        files: [{
            name: 'domains.txt',
            attachment: Buffer.from(pages.map(p => utils.formatUrl(p.domain, p.url)).join('\n'))
        }]
    });
}