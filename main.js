import {
    Client,
    Team,
    GatewayIntentBits,
    Partials,
    InteractionType,
    OAuth2Scopes,
    ApplicationIntegrationType
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import awaitModalSubmit from 'await-modal-submit';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const setting = require('./setting.json');
import * as utils from './utils.js';

import User from './schemas/user.js';
import Page from './schemas/page.js';

const Domain = require('./domain.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel
    ]
});
global.client = client;

global.wildcardPages = {};

export const getInviteURL = () => client.generateInvite({
    scopes: [
        OAuth2Scopes.Bot,
        OAuth2Scopes.ApplicationsCommands
    ]
});

let application
let owners = [];
let ownerID = [];
let teamOwner;
export const getOwners = () => owners;
export const getOwnerID = () => ownerID;
export const getTeamOwner = () => teamOwner;

utils.setup(client);
awaitModalSubmit(client);

import connect from './schemas/index.js';
connect();

let permissionHandler = {};
let commandHandler = {};
let autoCompleteHandler = {};
let selectHandler = {};
let buttonHandler = {};
let commands = [];

const debug = process.argv[2] === '--debug';
if (debug && !process.argv[3]) {
    console.log('Debug guild missing');
    process.exit(1);
}

const loadOwners = async () => {
    application = await client.application.fetch();
    owners = application.owner instanceof Team ? application.owner.members.map(a => a.user) : [application.owner];
    ownerID = owners.map(a => a.id);
    teamOwner = debug && process.argv[4] ? process.argv[4] : (application.owner instanceof Team ? application.owner.ownerId : application.owner.id);
}

export const getGlobalVariable = () => globalVariables;

const loadCommands = async () => {
    permissionHandler = {};
    commandHandler = {};
    autoCompleteHandler = {};
    commands = [];

    const registerLoop = async (c, sub) => {
        for (let file of c) {
            if (!file.endsWith('.js') && !fs.existsSync(path.join('./commands', file, 'index.js'))) {
                await registerLoop(fs.readdirSync(path.join('./commands', file)), file);
                continue;
            }

            const filePath = './' + path.join('commands', sub || '', file);
            const module = await import(filePath);

            if (module.checkPermission) permissionHandler[module.info.name] = module.checkPermission;
            commandHandler[module.info.name] = module.handler;
            if (module.autoCompleteHandler) autoCompleteHandler[module.info.name] = module.autoCompleteHandler;
            if (module.setup) module.setup(client);

            commands.push(module.info);
        }
    }

    await registerLoop(fs.readdirSync('./commands'));
}

const loadSelectHandler = async () => {
    selectHandler = {};
    const files = fs.readdirSync('./selectHandler');
    for (let c of files) {
        const module = await import(`./selectHandler/${c}`);
        selectHandler[c.replace('.js', '')] = module.default || module;
    }
}

const loadButtonHandler = async () => {
    buttonHandler = {};
    const files = fs.readdirSync('./buttonHandler');
    for (let c of files) {
        const module = await import(`./buttonHandler/${c}`);
        buttonHandler[c.replace('.js', '')] = module.default || module;
    }
}

const registerCommands = async () => {
    if (debug) await client.guilds.cache.get(process.argv[3]).commands.set(commands);
    else await client.application.commands.set(commands.map(a => ({
        ...a,
        integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall]
    })));
    console.log('registered commands.');
}

const loadHandler = async () => {
    const files = fs.readdirSync('./handler');
    for (let f of files) {
        const module = await import(`./handler/${f}`);
        (module.default || module)(client);

        console.log(`loaded handler ${f}`);
    }
}


client.once('ready', async () => {
    console.log(`Logined as ${client.user.tag}`);

    await loadOwners();
    await loadCommands();
    // await loadSelectHandler();
    await loadButtonHandler();
    // if(debug) client.guilds.cache.get(process.argv[3] || Server.guild).commands.fetch();
    await registerCommands();
    // await loadHandler();
});

client.on('interactionCreate', async interaction => {
    // if (debug) delete require.cache[require.resolve('./commands/url/handler')];

    let user = await User.findOne({
        id: interaction.user.id
    });
    if (!user) {
        user = new User({
            id: interaction.user.id
        });
        await user.save();
    }

    interaction.dbUser = user;

    interaction.teamOwner = teamOwner === interaction.user.id;

    if (!user.selectedDomain || !Domain.some(d => d.domain === user.selectedDomain) || (!interaction.teamOwner && !user.allowedDomains.includes(user.selectedDomain)))
        user.selectedDomain = user.allowedDomains[0] || Domain[0].domain;

    interaction.resolvePage = async query => {
        let result;

        if (query.url.startsWith('id/')) {
            query.id = query.url.slice(3);
            delete query.url;
        }

        if (!query.domain) delete query.domain;

        const pages = await Page.find(query);
        if (!pages.length) return null;
        if (pages.length === 1) result = pages[0];
        else {
            const sameDomain = pages.find(a => a.domain === user.selectedDomain);
            if (sameDomain) result = sameDomain;
        }

        if (result && (teamOwner === interaction.user.id || user.allowedDomains.includes(result.domain))) return result;

        return null;
    }

    if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
        if (!interaction.commandName) return;

        if (commandHandler[interaction.commandName]) {
            const checkPermission = permissionHandler[interaction.commandName];
            if (checkPermission) {
                const check = await permissionHandler[interaction.commandName](interaction);
                if (!check) return;
            }
            commandHandler[interaction.commandName](interaction);
        }
    }

    if (interaction.isStringSelectMenu()) {
        const params = interaction.values[0].split('_');
        const handler = selectHandler[params[0]];
        if (handler) handler(interaction);
    }

    if (interaction.isButton()) {
        const params = interaction.customId.split('_');
        const handler = buttonHandler[params[0]];
        if (handler) handler(interaction);
    }

    if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
        if (!interaction.commandName) return;

        if (autoCompleteHandler[interaction.commandName]) autoCompleteHandler[interaction.commandName](interaction);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
});

client.on('debug', d => {
    if (debug) console.log(d);
});

import './web/index.js';
client.login(setting.BOT_TOKEN);

setInterval(async () => {
    await Page.deleteMany({
        expiresAt: {
            $lte: Date.now(),
            $gt: 0
        }
    });
}, 60000);