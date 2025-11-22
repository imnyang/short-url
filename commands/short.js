import { ApplicationCommandOptionType as Options } from 'discord.js';
import randomstring from 'randomstring';

import * as main from '../main.js';
import * as utils from '../utils.js';

import Page from '../schemas/page.js';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Domain = require('../domain.json');

export const info = {
    name: 'short',
    description: 'URL을 짧게 만들어줍니다.',
    options: [
        {
            name: 'url',
            description: '짧게 만들 URL입니다.',
            type: Options.String,
            required: true
        }
    ]
};

export const checkPermission = async interaction => {
    const domain = interaction.dbUser.selectedDomain;

    if (domain === Domain[0].domain || main.getTeamOwner() === interaction.user.id) return true;

    const result = interaction.dbUser?.allowedDomains.includes(domain);
    if (!result) await interaction.reply(utils.missingPermissionMessage(interaction, `${domain} 관리`));

    return result;
};

export const handler = async interaction => {
    const url = interaction.options.getString('url');

    if (!utils.validateURL(url)) return interaction.reply({
        embeds: [utils.errorEmbed(interaction, '올바른 URL이 아닙니다!')],
        ephemeral: true
    });

    const page = new Page({
        domain: interaction.dbUser.selectedDomain || Domain[0].domain,
        url: randomstring.generate(main.getOwnerID().includes(interaction.user.id) ? 4 : 8),
        flows: [{
            condition: {
                id: 'EVERYONE'
            },
            action: {
                id: 'REDIRECT',
                data: {
                    url
                }
            }
        }],
        creator: interaction.user.id
    });
    await page.save();

    return interaction.reply(utils.formatUrl(page.domain, page.url));
};