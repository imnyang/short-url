module.exports.conditions = [
    {
        id: 'EVERYONE',
        name: '모든 유저',
        description: '모두가 해당하는 조건입니다.',
        emoji: '👥',
        format: '모든 유저에게',
        conditionCheck: () => true
    },
    {
        id: 'LOCALE',
        name: '언어 확인',
        description: '사용자의 언어 설정을 확인합니다.',
        emoji: '🌐',
        format: '언어가 {locale}이라면',
        conditionCheck: (data, req) => data.locale.split(',').includes(req.get('Accept-Language')?.substring(0, 2) || 'en'),
        data: [
            {
                name: 'locale',
                label: '언어 코드',
                required: true,
                maxLength: 2
            }
        ]
    },
    {
        id: 'DEVICE',
        name: '기기 확인',
        description: '사용자의 기기를 확인합니다.',
        emoji: '🖥️',
        format: '기기가 목록에 포함되어 있다면',
        conditionCheck: (data, req) => {
            const devices = data.device.split(',');
            if(devices.includes('DESKTOP') && req.useragent.isDesktop) return true;
            if(devices.includes('MOBILE') && req.useragent.isMobile && !req.useragent.isTablet) return true;
            if(devices.includes('TABLET') && req.useragent.isTablet && !req.useragent.isMobile) return true;
            if(devices.includes('WINDOWS') && req.useragent.isWindows) return true;
            if(devices.includes('MAC') && req.useragent.isMac) return true;
            if(devices.includes('LINUX') && req.useragent.isLinux && !req.useragent.isAndroid) return true;
            if(devices.includes('ANDROID') && req.useragent.isAndroid) return true;
            if(devices.includes('IPHONE') && req.useragent.isiPhone) return true;

            return false;
        },
        data: [
            {
                name: 'device',
                label: '기기',
                required: true,
                choices: [
                    {
                        name: 'DESKTOP',
                        label: 'PC',
                        emoji: '🖥️'
                    },
                    {
                        name: 'MOBILE',
                        label: '모바일',
                        emoji: '📱'
                    },
                    {
                        name: 'TABLET',
                        label: '태블릿',
                        emoji: '📱'
                    },
                    {
                        name: 'WINDOWS',
                        label: 'Windows',
                        emoji: '🪟'
                    },
                    {
                        name: 'MAC',
                        label: 'Mac',
                        emoji: '🍎'
                    },
                    {
                        name: 'LINUX',
                        label: 'Linux',
                        emoji: '🐧'
                    },
                    {
                        name: 'ANDROID',
                        label: 'Android',
                        emoji: '🤖'
                    },
                    {
                        name: 'IPHONE',
                        label: 'iPhone',
                        emoji: '📱'
                    }
                ],
                allowMultiple: true
            }
        ]
    },
    {
        id: 'DISCORD_USER',
        name: '디스코드 사용자 확인',
        description: '특정 디스코드 계정만 접근할 수 있도록 합니다.',
        emoji: '🔒',
        format: '디스코드 계정이 목록에 있다면',
        conditionCheck: (data, req, res) => {
            if(!req.isAuthenticated()) {
                res.redirect(`/login?redirect_url=${encodeURIComponent(req.originalUrl)}`);
                return false;
            }

            return data.user.split(',').includes(req.user?.id) || /[a-zA_Z]/.test(data.user);
        },
        data: [
            {
                name: 'user',
                label: '디스코드 계정',
                required: true
            }
        ]
    },
    {
        id: 'DATE',
        name: '날짜 및 시간 확인',
        description: '특정 날짜 이후인지 확인합니다.',
        emoji: '🗓️',
        format: '{date} 이후라면',
        conditionCheck: data => {
            const date = new Date(data.date);
            return date.getTime() <= Date.now();
        },
        data: [
            {
                name: 'date',
                label: '날짜',
                placeholder: 'YYYY-MM-DD HH:mm:ss',
                required: true,
                validate: a => !isNaN(new Date(a)),
                format: a => isNaN(new Date(a)) ? '?' : new Date(a).toLocaleString()
            }
        ]
    }
]

module.exports.getCondition = id => module.exports.conditions.find(condition => condition.id === id);

module.exports.actions = [
    {
        id: 'JUMP',
        name: '명령으로 이동',
        description: '특정 번호의 명령으로 이동합니다.',
        emoji: '🔀',
        format: '#{index}번으로 이동',
        action: null,
        data: [
            {
                name: 'index',
                label: '명령 번호',
                required: true,
                validate: a => !isNaN(a)
            }
        ]
    },
    {
        id: 'REDIRECT',
        name: 'URL로 리다이렉트',
        description: 'URL로 리다이렉트합니다.',
        emoji: '🔗',
        format: 'URL로 리다이렉트',
        action: (data, req, res) => {
            res.redirect(data.url);
        },
        data: [
            {
                name: 'url',
                label: 'URL',
                required: true
            }
        ]
    },
    {
        id: 'HTML_RESPONSE',
        name: 'HTML 전송',
        description: 'HTML을 전송합니다.',
        emoji: '📄',
        format: 'HTML 전송',
        action: (data, req, res) => {
            let html = data.html;
            for(let key in req.user) {
                html = html.replaceAll(`{user.${key}}`, req.user[key]);
            }
            res.send(html);
        },
        data: [
            {
                name: 'html',
                label: 'HTML',
                required: true,
                multiline: true
            }
        ]
    },
    {
        id: 'REJECT',
        name: '접근 거부',
        description: '접근을 거부합니다.',
        emoji: '🚫',
        format: '접근 거부',
        action: (data, req, res) => {
            res.status(403).end();
        }
    }
]

module.exports.getAction = id => module.exports.actions.find(action => action.id === id);