const DiscordStrategy = require('passport-discord').Strategy;

const setting = require('../../setting.json');

module.exports = passport => {
    passport.use(new DiscordStrategy({
        clientID: setting.DISCORD_CLIENT_ID,
        clientSecret: setting.DISCORD_CLIENT_SECRET,
        scope: ['identify', 'guilds'],
        callbackURL: '/login'
    }, async(accessToken, refreshToken, profile, done) => {
        return done(null, profile);
    }));
}