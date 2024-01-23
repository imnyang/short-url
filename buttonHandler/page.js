const main = require('../main');
const utils = require('../utils');
const handler = require('../commands/url/handler');

const Page = require('../schemas/page');

module.exports = async interaction => {
    const params = interaction.customId.split('_');
    if(params.length < 3) return;

    const action = params[1];

    const page = await Page.findOne({
        id: params[2]
    });
    if(!page) return interaction.reply({
        content: '존재하지 않는 URL입니다.',
        ephemeral: true
    });

    if(!main.getOwnerID().includes(interaction.user.id) && !interaction.dbUser.allowedDomains.includes(page.domain)) return;

    if(action === 'edit') {
        const msg = await interaction.reply(await handler.getMessage(page));
        return handler.handleMessage(page, msg, interaction.user);
    }

    if(action === 'delete') {
        await Page.deleteOne({
            id: page.id
        });
        return interaction.update({
            components: utils.disableComponents(interaction.message.components)
        });
    }
}