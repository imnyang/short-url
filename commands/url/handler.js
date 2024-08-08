const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const parseDuration = require('parse-duration');

const utils = require('../../utils');
const flow = require('../../flow');

const Page = require('../../schemas/page');

const resolvePage = async pageInfo => {
    let page;
    if(typeof pageInfo === 'string') page = await Page.findOne({ id: pageInfo });
    else if(typeof pageInfo === 'object') page = pageInfo;

    return page;
}

const formatVariable = (flow, data) => {
    let str = flow.format;

    if(flow.data?.length) for(let key of flow.data.map(a => a.name)) {
        const flowData = flow.data.find(a => a.name === key);
        const value = flowData?.format?.(data[key]) || data[key] || '?';
        str = str.replaceAll(`{${key}}`, value);
    }
    return str;
}

const getMessage = async (pageInfo, selectedFlowIndex) => {
    const page = await resolvePage(pageInfo);
    if(!page) return;

    selectedFlowIndex ??= page.flows.length - 1;

    const selectedFlow = page.flows[selectedFlowIndex];
    const selectedCondition = flow.getCondition(selectedFlow.condition.id);
    const selectedAction = flow.getAction(selectedFlow.action.id);

    return {
        fetchReply: true,
        content: '',
        embeds: [
            new EmbedBuilder()
                .setColor(0x349eeb)
                .setTitle('URL 수정')
                .setDescription('아래에서 작업을 추가하고, 수정하거나 삭제하세요.')
                .addFields([
                    {
                        name: 'URL',
                        value: utils.formatUrl(page.domain, page.url),
                        inline: true
                    },
                    {
                        name: '만료일',
                        value: page.expiresAt ? `<t:${Math.round(page.expiresAt / 1000)}:R>` : '없음',
                        inline: true
                    },
                    {
                        name: '생성자',
                        value: `<@${page.creator}>`,
                        inline: true
                    }
                ])
        ],
        components: [
            new ActionRowBuilder()
                .addComponents([
                    new ButtonBuilder()
                        .setCustomId('save')
                        .setStyle(ButtonStyle.Primary)
                        .setLabel('저장')
                        .setEmoji('💾'),
                    new ButtonBuilder()
                        .setCustomId('addFlow')
                        .setStyle(ButtonStyle.Success)
                        .setLabel('흐름 만들기')
                        .setEmoji('🛠️'),
                    new ButtonBuilder()
                        .setCustomId('editPage')
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel('수정')
                        .setEmoji('✏️'),
                    new ButtonBuilder()
                        .setCustomId('deletePage')
                        .setStyle(ButtonStyle.Danger)
                        .setLabel('URL 삭제')
                        .setEmoji('🗑️')
                ]),
            new ActionRowBuilder()
                .addComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId('condition')
                        .setOptions(flow.conditions.map(a => ({
                            label: a.name,
                            description: a.description,
                            value: a.id,
                            default: a.id === selectedCondition.id,
                            emoji: a.emoji
                        })))
                ]),
            new ActionRowBuilder()
                .addComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId('action')
                        .setOptions(flow.actions.map(a => ({
                            label: a.name,
                            description: a.description,
                            value: a.id,
                            default: a.id === selectedAction.id,
                            emoji: a.emoji
                        })))
                ]),
            new ActionRowBuilder()
                .addComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId('flow')
                        .addOptions(page.flows.map((a, i) => ({
                            label: `#${i + 1}. ${formatVariable(flow.getCondition(a.condition.id), a.condition.data)} ${formatVariable(flow.getAction(a.action.id), a.action.data)}`,
                            description: a.action.data ? Object.values(a.action.data)[0]?.toString().slice(0, 100) : undefined,
                            value: i.toString(),
                            default: i === selectedFlowIndex,
                            emoji: flow.getConditionEmoji(a.condition)
                        })))
                ]),
            new ActionRowBuilder()
                .addComponents([
                    new ButtonBuilder()
                        .setCustomId('up')
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel('한 칸 올리기')
                        .setEmoji('⬆️')
                        .setDisabled(selectedFlowIndex === 0),
                    new ButtonBuilder()
                        .setCustomId('down')
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel('한 칸 내리기')
                        .setEmoji('⬇️')
                        .setDisabled(selectedFlowIndex >= page.flows.length - 1),
                    new ButtonBuilder()
                        .setCustomId('editCondition')
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel('조건 데이터 수정')
                        .setEmoji('✏️')
                        .setDisabled(!selectedCondition.data?.length),
                    new ButtonBuilder()
                        .setCustomId('editAction')
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel('작업 데이터 수정')
                        .setEmoji('✏️')
                        .setDisabled(!selectedAction.data?.length),
                    new ButtonBuilder()
                        .setCustomId('deleteFlow')
                        .setStyle(ButtonStyle.Danger)
                        .setLabel('흐름 삭제')
                        .setEmoji('🗑️')
                        .setDisabled(page.flows.length <= 1)
                ])
        ]
    }
}
module.exports.getMessage = getMessage;

module.exports.handleMessage = async (pageInfo, message, interaction) => {
    if(!message || !interaction) return;

    const user = interaction.user;

    const page = await resolvePage(pageInfo);
    if(!page) return;

    let selectedFlowIndex = page.flows.length - 1;

    const collector = message.createMessageComponentCollector({
        filter: i => i.user.id === user.id,
        idle: 1000 * 60 * 15
    });

    collector.on('collect', async i => {
        if(i.isButton()) {
            if(i.customId === 'save') {
                for(let f of page.flows) {
                    const condition = flow.getCondition(f.condition.id);
                    const action = flow.getAction(f.action.id);

                    if(condition.data) for(let dataInfo of condition.data) {
                        if(dataInfo.required && !f.condition.data?.[dataInfo.name]) {
                            return i.reply({
                                content: `**${condition.name}**의 **${dataInfo.name}** 데이터가 비어있습니다.`,
                                ephemeral: true
                            });
                        }
                    }

                    if(action.data) for(let dataInfo of action.data) {
                        if(dataInfo.required && !f.action.data?.[dataInfo.name]) {
                            return i.reply({
                                content: `**${action.name}**의 **${dataInfo.label}** 데이터가 비어있습니다.`,
                                ephemeral: true
                            });
                        }
                    }
                }

                const newPage = await Page.findOneAndUpdate({
                    id: page.id
                }, page, {
                    new: true
                });

                if(newPage.url.includes(':')) global.wildcardPages[newPage.id] = newPage.toObject();

                return i.update(await getMessage(page, selectedFlowIndex));
            }

            if(i.customId === 'addFlow') {
                page.flows.splice(selectedFlowIndex + 1, 0, {
                    condition: {
                        id: 'EVERYONE',
                        data: {}
                    },
                    action: {
                        id: 'REJECT',
                        data: {}
                    }
                });
                selectedFlowIndex++;

                return i.update(await getMessage(page, selectedFlowIndex));
            }

            if(i.customId === 'editPage') {
                let response;
                try {
                    response = await i.awaitModalSubmit(
                        new ModalBuilder()
                            .setTitle('URL 수정')
                            .addComponents([
                                new TextInputBuilder()
                                    .setCustomId('url')
                                    .setStyle(TextInputStyle.Short)
                                    .setLabel('URL')
                                    .setPlaceholder(`${utils.formatUrl(page.domain, 'custom')} 형식으로 표시됩니다.`)
                                    .setValue(page.url),
                                new TextInputBuilder()
                                    .setCustomId('expiresAt')
                                    .setStyle(TextInputStyle.Short)
                                    .setLabel('만료일(2022-01-01 13:15:30 or 3h, 10d)')
                                    .setPlaceholder('만료일을 입력하세요. 직접 입력하거나 상대적으로 설정할 수 있습니다.')
                                    .setRequired(false)
                                    .setValue(page.expiresAt
                                        ? new Date(page.expiresAt - (new Date().getTimezoneOffset() * 60000))
                                            .toISOString()
                                            .replace(/T/, ' ')
                                            .replace(/\..+/, '')
                                        : '')
                            ].map(component => new ActionRowBuilder().addComponents([component])))
                    , 1000 * 60 * 5);
                } catch(e) {
                    return;
                }

                const url = response.fields.getTextInputValue('url');

                if(!utils.validateCustomUrl(url, interaction.teamOwner)) return response.reply({
                    content: 'URL로 사용할 수 없는 문자열이 포함돼 수정되지 않았습니다.',
                    ephemeral: true
                });

                let expiresAt;
                const expiresAtStr = response.fields.getTextInputValue('expiresAt');
                if(expiresAtStr) {
                    const expiresAtDate = new Date(expiresAtStr);
                    if(!isNaN(expiresAtDate)) expiresAt = expiresAtDate.getTime();
                    else {
                        expiresAt = parseDuration(expiresAtStr);
                        if(expiresAt) expiresAt += Date.now();
                    }
                }

                if(!expiresAt && expiresAtStr) return response.reply({
                    content: '만료일 형식이 잘못되어 URL이 수정되지 않았습니다.',
                    ephemeral: true
                });

                page.url = url;
                page.expiresAt = expiresAt;

                return response.update(await getMessage(page, selectedFlowIndex));
            }

            if(i.customId === 'deletePage') {
                await Page.deleteOne({
                    id: page.id
                });

                i.message.components = utils.disableComponents(i.message.components);

                return i.update(i.message);
            }

            if(i.customId === 'up') {
                const flow = page.flows[selectedFlowIndex];
                page.flows.splice(selectedFlowIndex, 1);
                page.flows.splice(selectedFlowIndex - 1, 0, flow);
                selectedFlowIndex--;

                return i.update(await getMessage(page, selectedFlowIndex));
            }

            if(i.customId === 'down') {
                const flow = page.flows[selectedFlowIndex];
                page.flows.splice(selectedFlowIndex, 1);
                page.flows.splice(selectedFlowIndex + 1, 0, flow);
                selectedFlowIndex++;

                return i.update(await getMessage(page, selectedFlowIndex));
            }

            if(['editCondition', 'editAction'].includes(i.customId)) {
                const pageFlow = page.flows[selectedFlowIndex];
                const targetFlowObj = pageFlow[i.customId === 'editCondition' ? 'condition' : 'action'];
                targetFlowObj.data ??= {};

                let target;
                if(i.customId === 'editCondition') target = flow.getCondition(pageFlow.condition.id);
                else if(i.customId === 'editAction') target = flow.getAction(pageFlow.action.id);

                const data = target.data;
                if(!data.length) return;

                if(data[0].choices) {
                    const prevValues = targetFlowObj.data[data[0].name]?.split(',') ?? [];

                    await i.update({
                        content: '원하는 옵션을 선택하세요.',
                        components: [
                            new ActionRowBuilder()
                                .addComponents([
                                    new StringSelectMenuBuilder()
                                        .setCustomId('option')
                                        .addOptions(data[0].choices.map(a => ({
                                            label: a.label,
                                            value: a.name,
                                            emoji: a.emoji,
                                            default: prevValues.includes(a.name)
                                        })))
                                        .setMaxValues(data[0].allowMultiple ? data[0].choices.length : 1)
                                ]),
                            new ActionRowBuilder()
                                .addComponents([
                                    new ButtonBuilder()
                                        .setCustomId('cancel')
                                        .setLabel('취소')
                                        .setStyle(ButtonStyle.Danger)
                                ])
                        ]
                    });

                    let response;
                    try {
                        response = await i.message.awaitMessageComponent({
                            filter: i => i.user.id === user.id,
                            time: 1000 * 60 * 5
                        });
                    } catch(e) {
                        return;
                    }

                    if(response.customId === 'cancel') return response.update(await getMessage(page, selectedFlowIndex));

                    targetFlowObj.data[data[0].name] = response.values.join(',');
                    return response.update(await getMessage(page, selectedFlowIndex));
                }
                else {
                    let response;
                    try {
                        response = await i.awaitModalSubmit(
                            new ModalBuilder()
                                .setTitle('데이터 수정')
                                .addComponents(target.data.map(a =>
                                    new TextInputBuilder()
                                        .setCustomId(a.name)
                                        .setStyle(a.multiline ? TextInputStyle.Paragraph : TextInputStyle.Short)
                                        .setLabel(a.label)
                                        .setPlaceholder(a.placeholder || `${a.label}${utils.checkBatchim(a.label) ? '을' : '를'} 입력하세요.`)
                                        .setRequired(a.required ?? false)
                                        .setMaxLength(a.maxLength ?? 4000)
                                        .setValue(targetFlowObj.data[a.name] || '')
                                ).map(component => new ActionRowBuilder().addComponents([component])))
                        , 1000 * 60 * 5);
                    } catch(e) {
                        return;
                    }

                    for(let data of target.data) {
                        const responseData = response.fields.getTextInputValue(data.name);
                        if(data.validate) {
                            const validation = await data.validate(responseData);
                            if(!validation) return response.reply({
                                content: `${data.label}의 형식이 잘못되어 ${i.customId === 'editCondition' ? '조건' : '작업'}이 수정되지 않았습니다.`,
                                ephemeral: true
                            });
                        }
                        targetFlowObj.data[data.name] = responseData;
                    }

                    return response.update(await getMessage(page, selectedFlowIndex));
                }
            }

            if(i.customId === 'deleteFlow') {
                page.flows.splice(selectedFlowIndex, 1);
                if(selectedFlowIndex >= page.flows.length) selectedFlowIndex--;

                return i.update(await getMessage(page, selectedFlowIndex));
            }
        }

        if(i.isStringSelectMenu()) {
            if(i.customId === 'condition') page.flows[selectedFlowIndex].condition = {
                id: i.values[0],
                data: {}
            }

            else if(i.customId === 'action') page.flows[selectedFlowIndex].action = {
                id: i.values[0],
                data: {}
            }

            else if(i.customId === 'flow') selectedFlowIndex = Number(i.values[0]);

            else return;

            return i.update(await getMessage(page, selectedFlowIndex));
        }
    });

    collector.on('end', () => {
        message.components = utils.disableComponents(message.components);

        return message.edit(message);
    });
}