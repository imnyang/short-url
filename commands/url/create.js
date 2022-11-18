const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const utils = require('../../utils');

const Page = require('../../schemas/page');

module.exports = async interaction => {
    const { options } = interaction;

    const customUrl = options.getString('customurl');
    const dest = options.getString('dest');

    if(customUrl) {
        const checkPage = await Page.findOne({
            url: customUrl
        });
        if(checkPage) return interaction.reply({
            content: '이미 존재하는 URL입니다.',
            ephemeral: true
        });
    }

    const page = new Page({
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
        content: `URL을 생성했습니다: ${utils.formatUrl(page.url)}\nURL을 수정하려면 아래 버튼을 누르세요.`,
        components: [
            new ActionRowBuilder()
                .addComponents([
                    new ButtonBuilder()
                        .setCustomId(`page_edit_${page.id}`)
                        .setStyle(ButtonStyle.Primary)
                        .setLabel('URL 수정')
                        .setEmoji('✏️')
                ])
        ]
    });
}