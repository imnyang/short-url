const { ApplicationCommandOptionType: Options } = require('discord.js');

const utils = require('../../utils');

module.exports = {
    info: {
        name: 'url',
        description: 'URL 관리 명령어입니다.',
        options: [
            {
                name: 'create',
                description: '새 URL을 생성합니다.',
                type: Options.Subcommand,
                options: [
                    {
                        name: 'customurl',
                        description: `커스텀 URL입니다. ${utils.formatUrl('custom')} 형식으로 표시됩니다.`.substring(0, 100),
                        type: Options.String
                    },
                    {
                        name: 'dest',
                        description: 'URL이 이동할 대상입니다.',
                        type: Options.String
                    }
                ]
            },
            {
                name: 'edit',
                description: 'URL을 수정합니다.',
                type: Options.Subcommand,
                options: [
                    {
                        name: 'url',
                        description: '수정할 URL입니다.',
                        type: Options.String,
                        required: true
                    }
                ]
            },
            {
                name: 'delete',
                description: 'URL을 삭제합니다.',
                type: Options.Subcommand,
                options: [
                    {
                        name: 'url',
                        description: '삭제할 URL입니다.',
                        type: Options.String,
                        required: true
                    }
                ]
            }
        ]
    },
    checkPermission: utils.teamOnlyHandler,
    handler: utils.subCommandHandler('url'),
    autoCompleteHandler: utils.autoCompleteHandler('url')
}