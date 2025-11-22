import {
    EmbedBuilder,
    ComponentType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    PermissionsBitField
} from 'discord.js';
import Url from 'url';
import querystring from 'querystring';
import fs from 'fs';

import * as main from './main.js';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Domain = require('./domain.json');
const setting = require('./setting.json');

let client;


export const setup = c => {
    client = c;
}

const escapeRegExp = s => s.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export { escapeRegExp };

export const checkBatchim = word => {
    if (typeof word !== 'string') return null;

    let lastLetter = word[word.length - 1];

    if (/[a-zA-Z]/.test(lastLetter)) {
        const moem = ['a', 'e', 'i', 'o', 'u'];
        return moem.includes(lastLetter);
    }

    if (!isNaN(lastLetter)) {
        const k_number = '영일이삼사오육칠팔구십'.split('');
        for (let i = 0; i <= 10; i++) {
            lastLetter = lastLetter.replace(new RegExp(escapeRegExp(i.toString()), 'g'), k_number[i]);
        }
    }
    const uni = lastLetter.charCodeAt(0);

    if (uni < 44032 || uni > 55203) return null;

    return (uni - 44032) % 28 !== 0;
}

export const getYoilString = num => {
    const yoilmap = [
        '일',
        '월',
        '화',
        '수',
        '목',
        '금',
        '토'
    ]

    return yoilmap[num];
}

export const getEnglishMonthString = num => {
    const monthmap = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ]

    return monthmap[num - 1];
}

export const chunk = (str, n, put) => {
    return Array.from(Array(Math.ceil(str.length / n)), (_, i) => str.slice(i * n, i * n + n)).join(put);
}

export const chunkAsArray = (str, n) => {
    return Array.from(Array(Math.ceil(str.length / n)), (_, i) => str.slice(i * n, i * n + n));
}

export const parseYouTubeLink = link => {
    const parsedUrl = Url.parse(link);
    const parsedQuery = querystring.parse(parsedUrl.query);

    let videoCode;

    if (['youtube.com', 'www.youtube.com'].includes(parsedUrl.host)) videoCode = parsedQuery.v;
    if (['youtu.be'].includes(parsedUrl.host)) videoCode = parsedUrl.pathname.slice(1);

    return {
        videoCode
    }
}

export const increaseBrightness = (hex, percent) => {
    hex = hex.replace(/^\s*#|\s*$/g, '');

    if (hex.length === 3) {
        hex = hex.replace(/(.)/g, '$1$1');
    }

    const r = parseInt(hex.substr(0, 2), 16),
        g = parseInt(hex.substr(2, 2), 16),
        b = parseInt(hex.substr(4, 2), 16);

    return '#' +
        ((0 | (1 << 8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
        ((0 | (1 << 8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
        ((0 | (1 << 8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
}

export const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max + 1);
    return Math.floor(Math.random() * (max - min)) + min;
}

export const msToTime = (duration, en = false) => {
    // const weeks = duration / (1000 * 60 * 60 * 24 * 7);
    // const absoluteWeeks = Math.floor(weeks);
    // const w = absoluteWeeks ? (absoluteWeeks + '주 ') : '';

    // const days = (weeks - absoluteWeeks) * 7;
    const days = duration / (1000 * 60 * 60 * 24);
    const absoluteDays = Math.floor(days);
    const d = absoluteDays ? (absoluteDays + (en ? ` Day${absoluteDays > 1 ? 's' : ''} ` : '일 ')) : '';

    const hours = (days - absoluteDays) * 24;
    const absoluteHours = Math.floor(hours);
    const h = absoluteHours ? (absoluteHours + (en ? ` Hour${absoluteHours > 1 ? 's' : ''} ` : '시간 ')) : '';

    const minutes = (hours - absoluteHours) * 60;
    const absoluteMinutes = Math.floor(minutes);
    const m = absoluteMinutes ? (absoluteMinutes + (en ? ` Minute${absoluteMinutes > 1 ? 's' : ''} ` : '분 ')) : '';

    const seconds = (minutes - absoluteMinutes) * 60;
    const absoluteSeconds = Math.floor(seconds);
    const s = absoluteSeconds ? (absoluteSeconds + (en ? ` Second${absoluteSeconds > 1 ? 's' : ''} ` : '초 ')) : '';

    return (/* w + */ d + h + m + s).trim();
}

export const checkPermission = member => {
    if (!member) return false;
    return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

export const missingPermissionMessage = (interaction, commandName) => {
    return {
        content: `\`${commandName}\` 명령어를 사용할 권한이 없습니다.`,
        ephemeral: true
    }
}

export const subCommandHandler = (commandOrInteraction) => {
    // If called with a string (command name), return a handler function
    if (typeof commandOrInteraction === 'string') {
        return async (interaction) => {
            const command = commandOrInteraction;
            const subCommandGroup = interaction.options?.getSubcommandGroup(false);
            const subCommand = interaction.options?.getSubcommand(false);

            const subCommandGroupExists = subCommandGroup && fs.existsSync(`./commands/${command}/${subCommandGroup}`);
            const directory = subCommandGroupExists ? `${command}/${subCommandGroup}` : command;

            const filePath = subCommandGroupExists ? `./commands/${directory}/${subCommand}.js` : `./commands/${directory}/${subCommand}.js`;

            if (fs.existsSync(filePath)) {
                const module = await import(filePath);
                if (module.default) module.default(interaction);
                else if (module.commandHandler) module.commandHandler(interaction);
            }
        };
    }

    // If called with an interaction object directly (legacy usage)
    const interaction = commandOrInteraction;
    const command = interaction.commandName;
    const subCommandGroup = interaction.options?.getSubcommandGroup(false);
    const subCommand = interaction.options?.getSubcommand(false);

    const subCommandGroupExists = subCommandGroup && fs.existsSync(`./commands/${command}/${subCommandGroup}`);
    const directory = subCommandGroupExists ? `${command}/${subCommandGroup}` : command;

    const filePath = subCommandGroupExists ? `./commands/${directory}/${subCommand}.js` : `./commands/${directory}/${subCommand}.js`;

    if (fs.existsSync(filePath)) {
        return import(filePath).then(module => {
            if (module.default) module.default(interaction);
            else if (module.commandHandler) module.commandHandler(interaction);
        });
    }
}

export const autoCompleteHandler = async interaction => {
    const command = interaction.commandName;
    const subCommandGroup = interaction.options.getSubcommandGroup(false);
    const subCommand = interaction.options.getSubcommand(false);

    const subCommandGroupExists = subCommandGroup && fs.existsSync(`./commands/${command}/${subCommandGroup}`);
    const directory = subCommandGroupExists ? `${command}/${subCommandGroup}` : command;

    if (fs.existsSync(`./commands/${directory}/${command}.js`)) {
        const module = await import(`./commands/${directory}/${command}.js`);
        if (module.autoCompleteHandler) module.autoCompleteHandler(interaction);
    }
}

export const teamOwnerOnlyHandler = async (interaction, handler) => {
    const main = await import('./main.js');
    if (main.getTeamOwner() !== interaction.user.id) return interaction.reply({
        content: '이 명령어는 봇 소유자만 사용할 수 있습니다.',
        ephemeral: true
    });

    handler(interaction);
}

export const sendWebhookMessage = async (channel, user = {
    username: '',
    avatarURL: ''
}, message = {}) => {
    let webhook;
    const webhooks = await channel.fetchWebhooks();
    if (!webhooks.size) webhook = await channel.createWebhook({
        name: `${channel.client.user.username} Webhook`
    });
    else webhook = webhooks.first();

    message.username = user.username;
    message.avatarURL = user.avatarURL;

    return webhook.send(message);
}

export const codeBlock = (lang, content) => {
    return `\`\`\`${lang}\n${content}\n\`\`\``;
}

export const jsonCodeBlock = json => {
    return codeBlock('json', JSON.stringify(json, null, 2));
}

export const escapeRichText = str => str.replace(/<[^>]*>/g, '');

export const disableComponents = (components = [], except, customIdExactMatch = false, disableURL = false) => {
    if (!Array.isArray(except)) except = [except];

    const rows = [];

    for (let beforeRow of components) {
        const row = new ActionRowBuilder()
            .addComponents(beforeRow.components.map(c => {
                if (customIdExactMatch && except.includes(c.data.custom_id)) return c;
                if (!customIdExactMatch && except.some(e => c.data.custom_id?.startsWith(e))) return c;

                let newComponent;
                switch (c.data.type) {
                    case ComponentType.Button:
                        if (c.data.style === ButtonStyle.Link && !disableURL) return c;

                        newComponent = ButtonBuilder.from(c);
                        break;
                    case ComponentType.SelectMenu:
                        newComponent = StringSelectMenuBuilder.from(c);
                        break;
                    default:
                        return c;
                }

                newComponent.setDisabled();

                return newComponent;
            }));

        rows.push(row);
    }

    return rows;
}

export const validateURL = url => {
    try {
        const parsed = new URL(url);
        return parsed.href;
    }
    catch (e) {
        return null;
    }
}

export const parseGithubURL = url => {
    const parsedURL = Url.parse(url);
    const pathnameArray = parsedURL.pathname.split('/');
    const username = pathnameArray[1];
    const repo = pathnameArray[2];
    return {
        username,
        repo
    }
}

const defaultUserEmbedFunc = (interaction, options = {}) => {
    const defaultValues = {
        title: null,
        description: null,
        color: 0xff8282,
        thumbnail: null,
        image: null,
        fields: [],
        footer: {}
    }
    for (let key in defaultValues) options[key] ??= defaultValues[key];

    return new EmbedBuilder()
        .setColor(options.color)
        .setAuthor({
            name: interaction.member?.displayName || interaction.user.username,
            iconURL: interaction.member?.displayAvatarURL() || interaction.user.displayAvatarURL()
        })
        .setTitle(options.title)
        .setDescription(options.description)
        .setThumbnail(options.thumbnail)
        .setImage(options.image)
        .addFields(options.fields)
        .setFooter({
            text: options.footer.text || null,
            iconURL: options.footer.iconURL || null
        })
        .setTimestamp()
}
export const defaultUserEmbed = defaultUserEmbedFunc;

export const errorEmbed = (interaction, description) => defaultUserEmbedFunc(interaction, {
    title: '오류',
    description,
    color: 0xff0000
});

export const getCommandMention = commandName => {
    const commands = (global.debug ? client.guilds.cache.get(process.argv[3]).commands : client.application.commands).cache;
    const command = commands.find(c => c.name === commandName);

    if (!command) return null;

    return `</${commandName}:${command.id}>`;
}

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export const getAllUrlInString = str => {
    const regex = /(https?:\/\/\S+)/g;
    return str.match(regex) || [];
}

export const parseUrl = str => {
    try {
        if (str.includes('/')
            && str.split('/')[0].includes('.')
            && !str.startsWith('http')
            && str.length > 1) str = `https://${str}`;

        const url = new URL(str);
        return {
            domain: url.hostname,
            url: url.pathname.substring(1)
        }
    } catch (e) {
        return {
            url: str
        }
    }
}

export const formatUrl = (domain, str) => {
    return new URL(str, Domain.find(d => d.domain === domain)?.base ?? 'https://unknown').href;
}

export const validateCustomUrl = (str, isAdmin = false) => !((str !== '/' && str.startsWith('/'))
    || str.includes('//')
    || str.includes('.')
    || str.startsWith('_')
    || str.endsWith('/info')
    || str.startsWith('@')
    || (!isAdmin && str.includes(':'))
    || str.split('/').some(a => a === ':' || a.slice(1).includes(':')));

export const objectFormatter = obj => {
    if (typeof obj !== 'object') return obj.toString();

    if (obj instanceof Array) return obj.map(a => objectFormatter(a)).join(', ');
    else return JSON.stringify(obj);
}


export const formatVariable = (str, variables, prefix = '') => {
    for (let key in variables) {
        const value = variables[key];

        if (typeof value === 'object') {
            str = str.replaceAll(`{${prefix}${key}}`, objectFormatter(value));
            str = formatVariable(str, value, `${prefix}${key}.`);
        }
        else str = str.replaceAll(`{${prefix}${key}}`, value);
    }
    return str;
}

export const findWildcardPage = (domain, url) => {
    const urlParts = url.split('/');

    outer: for (let wildcardPage of Object.values(global.wildcardPages)) {
        if (wildcardPage.domain !== domain) continue;

        const parts = wildcardPage.url.split('/');
        const wildcardVars = {};

        if (parts.length !== urlParts.length) continue;

        for (let i in parts) {
            const thisPart = parts[i];
            const urlPart = urlParts[i];

            if (thisPart.startsWith(':')) {
                wildcardVars[thisPart.slice(1)] = urlPart;
                continue;
            }
            if (thisPart !== urlPart) continue outer;
        }

        return {
            page: wildcardPage,
            vars: wildcardVars
        }
    }
}