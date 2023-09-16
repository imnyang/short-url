const express = require('express');
const passport = require('passport');
const session = require('express-session');
const fs = require('fs');
const useragent = require('express-useragent');

const setting = require('../setting.json');

const app = express();

app.set('trust proxy', setting.TRUST_PROXY);

passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((obj, done) => {
    done(null, obj);
});

app.use(session({
    secret: setting.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(useragent.express());

for(let f of fs.readdirSync('./web/login')) {
    require(`./login/${f}`)(passport);
}

const routes = fs.readdirSync('./web/routes');
for(let f of routes) {
    app.use(require(`./routes/${f}`));
    console.log(`Loaded route ${f}`);
}
console.log(`Loaded ${routes.length} routes`);

app.listen(setting.PORT, () => {
    console.log(`Server listening on ${setting.PORT}`);
});