const express = require('express');

const app = express.Router();

const main = require('../../main');

app.get('/debug/device', (req, res) => {
    res.type('text');
    res.send(JSON.stringify(req.useragent, null, 2));
});

app.get('/debug/locale', (req, res) => {
    res.send(req.get('Accept-Language')?.substring(0, 2) || 'en');
});

app.get('/debug/error/:code', (req, res) => {
    res.status(parseInt(req.params.code)).end();
});

app.get('/debug/user', async (req, res) => {
    if(!req.isAuthenticated()) return res.redirect(`/login?redirect_url=${encodeURIComponent(req.originalUrl)}`);

    if(!main.getOwnerID().includes(req.user.id)) return res.status(403).end();

    res.send(JSON.stringify(req.user, null, 2));
});

module.exports = app;