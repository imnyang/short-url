import { Elysia } from 'elysia';
import * as main from '../../main.js';

const app = new Elysia();

app.get('/debug/device', ({ userAgent }) => {
    return JSON.stringify({ userAgent }, null, 2); // Simplified as we don't have full useragent parser yet
});

app.get('/debug/locale', ({ request }) => {
    return request.headers.get('accept-language')?.substring(0, 2) || 'en';
});

app.get('/debug/error/:code', ({ params, set }) => {
    set.status = parseInt(params.code);
    return '';
});

app.get('/debug/user', ({ user, request, redirect, set }) => {
    if (!user) return redirect(`/login?redirect_url=${encodeURIComponent(request.url)}`);

    if (!main.getOwnerID().includes(user.id)) {
        set.status = 403;
        return '';
    }

    return JSON.stringify(user, null, 2);
});

export default app;