const express = require('express');

const app = express.Router();

app.get('/device', (req, res) => {
    res.type('text');
    res.send(JSON.stringify(req.useragent, null, 2));
});

app.get('/locale', (req, res) => {
    res.send(req.get('Accept-Language')?.substring(0, 2) || 'en');
});

app.get('/error/:code', (req, res) => {
    res.status(parseInt(req.params.code)).end();
});

module.exports = app;