const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const randomstring = require('randomstring');

const main = require('../../main');
const utils = require('../../utils');

const Page = require('../../schemas/page');

const Domain = require('../../domain.json');

module.exports = async interaction => {
    const { options } = interaction;

    let domain = options.getString('domain');
    let customUrl = options.getString('customurl');
    const dest = options.getString('dest');

    if(!domain && customUrl?.includes('/')) {
        const parsedUrl = utils.parseUrl(customUrl);
        domain = parsedUrl.domain;
        customUrl = parsedUrl.url;
    }

    domain ??= interaction.dbUser.selectedDomain || Domain[0].domain;
    customUrl ??= randomstring.generate(main.getOwnerID().includes(interaction.user.id) ? 4 : 8);

    if(!(interaction.teamOwner || interaction.dbUser.allowedDomains.includes(domain)) || !Domain.some(d => d.domain === domain)) return interaction.reply({
        content: '사용할 수 없는 도메인입니다.',
        ephemeral: true
    });

    if(customUrl) {
        const checkPage = await Page.findOne({
            domain,
            url: customUrl
        });
        if(checkPage) return interaction.reply({
            content: '이미 존재하는 URL입니다.',
            ephemeral: true
        });
    }

    if(!utils.validateCustomUrl(customUrl)) return interaction.reply({
        content: 'URL로 사용할 수 없는 문자열입니다.',
        ephemeral: true
    });

    const page = new Page({
        domain,
        url: customUrl,
        flows: [{
            condition: {
                id: 'EVERYONE'
            },
            action: {
                id: dest ? 'REDIRECT' : 'REJECT',
                data: dest ? {
                        url: dest
                    }
                    : {}
            }
        }],
        creator: interaction.user.id
    });
    await page.save();

    return interaction.reply({
        content: `URL을 생성했습니다: ${utils.formatUrl(page.domain, page.url)}\nURL을 수정하려면 아래 버튼을 누르세요.`,
        components: [
            new ActionRowBuilder()
                .addComponents([
                    new ButtonBuilder()
                        .setCustomId(`page_edit_${page.id}`)
                        .setStyle(ButtonStyle.Primary)
                        .setLabel('URL 수정')
                        .setEmoji('✏️'),
                    new ButtonBuilder()
                        .setCustomId(`page_delete_${page.id}`)
                        .setStyle(ButtonStyle.Danger)
                        .setLabel('URL 삭제')
                        .setEmoji('🗑️')
                ])
        ]
    });
}