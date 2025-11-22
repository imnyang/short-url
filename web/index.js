import { Elysia } from 'elysia';
import fs from 'fs';
import { createRequire } from 'module';
import Session from '../schemas/session.js';
import useragent from 'express-useragent';


const require = createRequire(import.meta.url);
const setting = require('../setting.json');

const app = new Elysia();

// Middleware: Session & UserAgent
app.derive(async ({ request, cookie: { sessionId } }) => {
    const userAgentString = request.headers.get('user-agent') || '';
    const userAgent = useragent.parse(userAgentString);

    let session = null;
    if (sessionId && sessionId.value) {
        session = await Session.findOne({ sessionId: sessionId.value });
        if (session && session.expiresAt < new Date()) {
            await Session.deleteOne({ sessionId: sessionId.value });
            session = null;
        }
    }

    const user = session?.data?.passport?.user || null;

    return {
        userAgent,
        session,
        user,
        // Helper to set session
        setSession: async (data) => {
            const sid = crypto.randomUUID();
            const newSession = await Session.create({
                sessionId: sid,
                data,
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7 days
            });
            sessionId.value = sid;
            sessionId.path = '/';
            sessionId.httpOnly = true;
            sessionId.secure = process.env.NODE_ENV === 'production';
            return newSession;
        },
        destroySession: async () => {
            if (sessionId && sessionId.value) {
                await Session.deleteOne({ sessionId: sessionId.value });
                sessionId.remove();
            }
        }
    };
});

// Load Routes
const routes = fs.readdirSync('./web/routes');
for (let f of routes) {
    const module = await import(`./routes/${f}`);
    app.use(module.default);
    console.log(`Loaded route ${f}`);
}
console.log(`Loaded ${routes.length} routes`);

app.listen(setting.PORT, () => {
    console.log(`Server listening on ${setting.PORT}`);
});

export default app;