import { Elysia } from 'elysia';
import { createRequire } from 'module';
import axios from 'axios';

const require = createRequire(import.meta.url);
const setting = require('../../setting.json');

const app = new Elysia();

const DISCORD_API = 'https://discord.com/api/v10';

app.get('/login', async ({ query, setSession, session, set, redirect }) => {
    if (query.code) {
        // Handle Callback
        try {
            const tokenResponse = await axios.post(`${DISCORD_API}/oauth2/token`, new URLSearchParams({
                client_id: setting.DISCORD_CLIENT_ID,
                client_secret: setting.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: query.code,
                redirect_uri: `${setting.DOMAIN || 'http://localhost:' + setting.PORT}/login` // Adjust based on config
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const { access_token, refresh_token } = tokenResponse.data;

            const userResponse = await axios.get(`${DISCORD_API}/users/@me`, {
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            });

            const user = userResponse.data;

            // Create Session
            const newSession = await setSession({
                passport: { user }, // Keep passport structure for compatibility if needed, or just user
                redirect_url: session?.data?.redirect_url
            });

            const redirectUrl = session?.data?.redirect_url || '/';
            return redirect(redirectUrl);

        } catch (error) {
            console.error('Login failed:', error.response?.data || error.message);
            return redirect('/loginfail');
        }
    } else {
        // Redirect to Discord
        if (query.redirect_url) {
            // We need to store redirect_url. 
            // Since we don't have a session yet, we might need to create a temp one or pass it in state.
            // For simplicity, let's assume we can create a session just for this?
            // Or use the 'state' parameter in OAuth2 which is the standard way.
            // But if we want to use the session store we built:
            await setSession({ redirect_url: query.redirect_url });
        }

        const params = new URLSearchParams({
            client_id: setting.DISCORD_CLIENT_ID,
            redirect_uri: `${setting.DOMAIN || 'http://localhost:' + setting.PORT}/login`,
            response_type: 'code',
            scope: 'identify guilds'
        });

        return redirect(`${DISCORD_API}/oauth2/authorize?${params}`);
    }
});

app.get('/logout', async ({ destroySession, redirect }) => {
    await destroySession();
    return 'logout ok';
});

app.get('/loginfail', ({ session }) => {
    return 'Login failed';
});

export default app;