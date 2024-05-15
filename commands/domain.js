const { ApplicationCommandOptionType: Options } = require('discord.js');

const main = require('../main');

const User = require('../schemas/user');

const Domain = require('../domain.json');

const choices = Domain.map(a => ({
    name: a.domain,
    value: a.domain
}));

module.exports = {
    info: {
        name: 'domain',
        description: '기본값으로 사용할 도메인을 선택합니다.',
        options: [
            {
                name: 'domain',
                description: '선택할 도메인입니다.',
                type: Options.String,
                required: true,
                choices
            }
        ]
    },
    handler: async interaction => {
        const domain = interaction.options.getString('domain');
        if(main.getTeamOwner() !== interaction.user.id
            && domain !== Domain[0].domain
            && !interaction.dbUser.allowedDomains.includes(domain)) return interaction.reply({
            content: '해당 도메인을 사용할 권한이 없습니다.',
            ephemeral: true
        });

        await User.updateOne({
            id: interaction.user.id
        }, {
            selectedDomain: domain
        });

        return interaction.reply({
            content: `${domain} 도메인을 선택했습니다!`,
            ephemeral: true
        });
    }
}