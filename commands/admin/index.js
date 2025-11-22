import { ApplicationCommandOptionType as Options } from 'discord.js';

import * as utils from '../../utils.js';

import User from '../../schemas/user.js';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Domain = require('../../domain.json');

const choices = Domain.map(a => ({
    name: a.domain,
    value: a.domain
}));

export const info = {
    name: 'admin',
    description: '관리자용 명령어입니다.',
    options: [
        {
            name: 'set',
            description: 'null',
            type: Options.SubcommandGroup,
            options: [
                {
                    name: 'user',
                    description: '유저의 DB를 수정합니다.',
                    type: Options.Subcommand,
                    options: [
                        {
                            name: 'user',
                            description: 'DB를 수정할 유저입니다.',
                            type: Options.User,
                            required: true
                        },
                        {
                            name: 'key',
                            description: '수정할 키입니다.',
                            type: Options.String,
                            required: true,
                            choices: Object.keys(User.schema.obj).slice(0, 25).map(k => ({
                                name: k,
                                value: k
                            }))
                        },
                        {
                            name: 'value',
                            description: '수정할 값입니다.',
                            type: Options.String,
                            required: true
                        }
                    ]
                }
            ]
        },
        {
            name: 'get',
            description: 'null',
            type: Options.SubcommandGroup,
            options: [
                {
                    name: 'user',
                    description: '유저의 DB를 확인합니다.',
                    type: Options.Subcommand,
                    options: [
                        {
                            name: 'user',
                            description: 'DB를 확인할 유저입니다.',
                            type: Options.User,
                            required: true
                        }
                    ]
                }
            ]
        },
        {
            name: 'permission',
            description: 'null',
            type: Options.SubcommandGroup,
            options: [
                {
                    name: 'add',
                    description: '유저에게 도메인 관리 권한을 추가합니다.',
                    type: Options.Subcommand,
                    options: [
                        {
                            name: 'user',
                            description: '도메인 관리 권한을 추가할 유저입니다.',
                            type: Options.User,
                            required: true
                        },
                        {
                            name: 'domain',
                            description: '권한을 부여할 도메인입니다.',
                            type: Options.String,
                            required: true,
                            choices
                        }
                    ]
                },
                {
                    name: 'remove',
                    description: '유저에게 도메인 관리 권한을 제거합니다.',
                    type: Options.Subcommand,
                    options: [
                        {
                            name: 'user',
                            description: '도메인 관리 권한을 제거할 유저입니다.',
                            type: Options.User,
                            required: true
                        },
                        {
                            name: 'domain',
                            description: '권한을 제거할 도메인입니다.',
                            type: Options.String,
                            required: true,
                            choices
                        }
                    ]
                }
            ]
        }
    ]
};

export const checkPermission = utils.teamOwnerOnlyHandler;

export const handler = utils.subCommandHandler('admin');