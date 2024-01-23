const User = require('../../../schemas/user');

module.exports = async interaction => {
    const { options } = interaction;

    const user = options.getUser('user');
    const domain = options.getString('domain');

    await User.updateOne({
        id: user.id
    }, {
        $addToSet: {
            allowedDomains: domain
        }
    });

    return interaction.reply(`${user.displayName}님에게 ${domain} 도메인의 접근 권한을 부여했습니다.`);
}