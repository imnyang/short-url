import { Elysia } from 'elysia';
import * as main from '../../main.js';
import * as utils from '../../utils.js';
import * as flow from '../../flow.js';
import User from '../../schemas/user.js';
import Page from '../../schemas/page.js';
import Log from '../../schemas/log.js';

const app = new Elysia();

app.get('/*', async ({ request, user, set, userAgent, redirect }) => {
    const urlObj = new URL(request.url);
    const path = urlObj.pathname;
    const hostname = urlObj.hostname;

    // Handle /info
    if (path.endsWith('/info')) {
        if (!user) return set.redirect = `/login?redirect_url=${encodeURIComponent(request.url)}`;

        const dbUser = await User.findOne({ id: user.id });
        if (!main.getOwnerID().includes(user.id) && !dbUser.allowedDomains.includes(hostname)) {
            set.status = 403;
            return '';
        }

        let url = path.slice(1).split('/').slice(0, -1).join('/');
        if (url === '@root') url = '/';

        let page;
        const wildcardPage = utils.findWildcardPage(hostname, url);

        if (wildcardPage) page = wildcardPage.page;
        else page = await Page.findOne({ domain: hostname, url }).lean();

        if (!page) {
            set.status = 404;
            return '';
        }

        const pageLogs = await Log.find({ urlId: page.id });
        page.usedCount = pageLogs.length;

        return JSON.stringify(page, null, 2);
    }

    // Handle Short URL
    const url = path.slice(1) || '/';

    const vars = {
        headers: request.headers
    };

    let page;
    const wildcardPage = utils.findWildcardPage(hostname, url);

    if (wildcardPage) {
        page = wildcardPage.page;
        for (let key in wildcardPage.vars) vars[key] = wildcardPage.vars[key];
    } else {
        page = await Page.findOne({ domain: hostname, url });
    }

    if (!page) {
        set.status = 404;
        return '';
    }

    if (user) vars.user = user;

    Log.create({
        url: page.url,
        urlId: page.id,
        ip: app.server?.requestIP(request)?.address || 'unknown', // Elysia IP check
        userAgent: request.headers.get('user-agent'),
        locale: request.headers.get('accept-language'),
        user: user?.id
    }).then();

    let loopCount = 0;

    // Shim req/res for flow.js
    const reqShim = {
        user,
        isAuthenticated: () => !!user,
        get: (header) => request.headers.get(header),
        useragent: userAgent,
        originalUrl: request.url,
        ip: app.server?.requestIP(request)?.address || 'unknown'
    };

    let responseRedirect = null;
    let responseBody = null;
    let responseStatus = null;

    const resShim = {
        redirect: (url) => { responseRedirect = url; },
        send: (body) => { responseBody = body; },
        status: (code) => {
            responseStatus = code;
            return {
                end: () => { }
            };
        },
        end: () => { }
    };

    for (let i = 0; i < page.flows.length; i++) {
        if (responseRedirect || responseBody || responseStatus) break;
        if (++loopCount > 500) {
            set.status = 508;
            return '';
        }

        const f = page.flows[i];

        const condition = flow.getCondition(f.condition.id);
        const action = flow.getAction(f.action.id);

        const conditionResult = await condition.conditionCheck(f.condition.data, reqShim, resShim);
        if (!conditionResult) continue;

        if (action.id === 'JUMP') {
            const targetIndex = f.action.data.index - 1;
            if (targetIndex < 0 || targetIndex >= page.flows.length) {
                set.status = 406;
                return '';
            }
            i = targetIndex - 1;
            continue;
        }

        await action.action(f.action.data, vars, reqShim, resShim);
    }

    if (responseRedirect) return redirect(responseRedirect);
    if (responseBody) return responseBody;
    if (responseStatus) {
        set.status = responseStatus;
        return '';
    }

    set.status = 406;
    return '';
});

export default app;