const {
    Client,
    Team,
    GatewayIntentBits,
    Partials,
    InteractionType,
    OAuth2Scopes
} = require('discord.js');
const fs = require('fs');
const {
    Jejudo,
    SummaryCommand,
    EvaluateCommand,
    ShellCommand,
    DocsCommand
} = require('jejudo');
const path = require('path');
const awaitModalSubmit = require('await-modal-submit');

const setting = require('./setting.json');
const utils = require('./utils');

const Page = require('./schemas/page');

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

module.exports.getInviteURL = () => client.generateInvite({
    scopes: [
        OAuth2Scopes.Bot,
        OAuth2Scopes.ApplicationsCommands
    ]
});

let JejudoHandler;

let application
let owners = [];
let ownerID = [];
let teamOwner;
module.exports.getOwners = () => owners;
module.exports.getOwnerID = () => ownerID;
module.exports.getTeamOwner = () => teamOwner;

utils.setup(client);
awaitModalSubmit(client);

const connect = require('./schemas');
connect();

let permissionHandler = {};
let commandHandler = {};
let autoCompleteHandler = {};
let selectHandler = {};
let buttonHandler = {};
let commands = [];

const debug = process.argv[2] === '--debug';
if(debug && !process.argv[3]) {
    console.log('Debug guild missing');
    process.exit(1);
}

const loadOwners = async () => {
    application = await client.application.fetch();
    owners = application.owner instanceof Team ? application.owner.members.map(a => a.user) : [application.owner];
    ownerID = owners.map(a => a.id);
    teamOwner = debug && process.argv[4] ? process.argv[4] : (application.owner instanceof Team ? application.owner.ownerId : application.owner.id);
}

const loadJejudo = () => {
    const globalVariables = {
        client,
        permissionHandler,
        commandHandler,
        autoCompleteHandler,
        selectHandler,
        buttonHandler,
        commands,
        main: module.exports,
        utils,
        Discord: require('discord.js'),
        Page
    }

    JejudoHandler = new Jejudo(client, {
        command: 'j',
        textCommand: [
            'jeju',
            'jejudo',
            'j',
            'dok',
            'dokdo'
        ],
        prefix: `<@${client.user.id}> `,
        owners: teamOwner,
        registerDefaultCommands: false,
        secrets: [
            setting.MONGODB_HOST,
            setting.MONGODB_PORT,
            setting.MONGODB_USER,
            setting.MONGODB_PASSWORD
        ],
        globalVariables,
        noPermission: i => {
            return i.reply(utils.missingPermissionMessage(i, 'jejudo'));
        }
    });

    const editedEvaluateCommand = new EvaluateCommand(JejudoHandler);
    editedEvaluateCommand.data.name = 'js';

    const editedShellCommand = new ShellCommand(JejudoHandler);
    editedShellCommand.data.name = 'sh';

    JejudoHandler.registerCommand(new SummaryCommand(JejudoHandler));
    JejudoHandler.registerCommand(editedEvaluateCommand);
    JejudoHandler.registerCommand(editedShellCommand);
    JejudoHandler.registerCommand(new DocsCommand(JejudoHandler));

    module.exports.getGlobalVariable = () => globalVariables;
}

const loadCommands = () => {
    permissionHandler = {};
    commandHandler = {};
    autoCompleteHandler = {};
    commands = [];

    commands.push(JejudoHandler.commandJSON);

    const registerLoop = (c, sub) => {
        c.forEach(c => {
            if(!c.endsWith('.js') && !fs.existsSync(path.join('./commands', c, 'index.js'))) return registerLoop(fs.readdirSync(path.join('./commands', c)), c);
            const file = require.resolve('./' + path.join('commands', sub || '', c));
            delete require.cache[file];
            const module = require(file);
            if(module.checkPermission) permissionHandler[module.info.name] = module.checkPermission;
            commandHandler[module.info.name] = module.handler;
            if(module.autoCompleteHandler) autoCompleteHandler[module.info.name] = module.autoCompleteHandler;
            if(module.setup) module.setup(client);

            commands.push(module.info);
        });
    }

    registerLoop(fs.readdirSync('./commands'));
}

const loadSelectHandler = () => {
    selectHandler = {};
    fs.readdirSync('./selectHandler').forEach(c => {
        const file = require.resolve(`./selectHandler/${c}`);
        delete require.cache[file];
        selectHandler[c.replace('.js', '')] = require(`./selectHandler/${c}`);
    });
}

const loadButtonHandler = () => {
    buttonHandler = {};
    fs.readdirSync('./buttonHandler').forEach(c => {
        const file = require.resolve(`./buttonHandler/${c}`);
        delete require.cache[file];
        buttonHandler[c.replace('.js', '')] = require(`./buttonHandler/${c}`);
    });
}

const registerCommands = async () => {
    if(debug) await client.guilds.cache.get(process.argv[3]).commands.set(commands);
    else await client.application.commands.set(commands);
    console.log('registered commands.');
}

const loadHandler = () => {
    fs.readdirSync('./handler').forEach(f => {
        const file = require.resolve(`./handler/${f}`);
        delete require.cache[file];
        require(file)(client);

        console.log(`loaded handler ${f}`);
    });
}

module.exports.loadOwners = loadOwners;
module.exports.loadJejudo = loadJejudo;
module.exports.loadCommands = loadCommands;
module.exports.loadSelectHandler = loadSelectHandler;
module.exports.loadButtonHandler = loadButtonHandler;
module.exports.registerCommands = registerCommands;
module.exports.loadHandler = loadHandler;

client.once('ready', async () => {
    console.log(`Logined as ${client.user.tag}`);

    await loadOwners();
    loadJejudo();
    loadCommands();
    // loadSelectHandler();
    loadButtonHandler();
    // if(debug) client.guilds.cache.get(process.argv[3] || Server.guild).commands.fetch();
    registerCommands();
    // loadHandler();
});

client.on('interactionCreate', async interaction => {
    if(debug) delete require.cache[require.resolve('./commands/url/handler')];

    if(JejudoHandler) JejudoHandler.handleInteraction(interaction);

    if(interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
        if(!interaction.commandName) return;

        if(commandHandler[interaction.commandName]) {
            const checkPermission = permissionHandler[interaction.commandName];
            if(checkPermission) {
                const check = await permissionHandler[interaction.commandName](interaction);
                if(!check) return;
            }
            commandHandler[interaction.commandName](interaction);
        }
    }

    if(interaction.isSelectMenu()) {
        const params = interaction.values[0].split('_');
        const handler = selectHandler[params[0]];
        if(handler) handler(interaction);
    }

    if(interaction.isButton()) {
        const params = interaction.customId.split('_');
        const handler = buttonHandler[params[0]];
        if(handler) handler(interaction);
    }

    if(interaction.type === InteractionType.ApplicationCommandAutocomplete) {
        if(!interaction.commandName) return;

        if(autoCompleteHandler[interaction.commandName]) autoCompleteHandler[interaction.commandName](interaction);
    }
});

client.on('messageCreate', async message => {
    if(message.author.bot) return;

    if(JejudoHandler) JejudoHandler.handleMessage(message);
});

client.on('debug', d => {
    if(debug) console.log(d);
});

require('./web');
client.login(setting.BOT_TOKEN);

setInterval(async () => {
    await Page.deleteMany({
        expiresAt: {
            $lte: Date.now(),
            $gt: 0
        }
    });
}, 60000);