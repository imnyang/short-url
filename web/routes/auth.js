const express = require('express');
const passport = require('passport');

const app = express.Router();

app.get('/login', (req, res, next) => {
    if(req.query.redirect_url) req.session.redirect_url = req.query.redirect_url;
    next();
}, passport.authenticate('discord', {
    prompt: 'none',
    failureRedirect: '/loginfail',
    failureMessage: true,
    keepSessionInfo: true
}), (req, res) => {
    res.redirect(req.session.redirect_url || '/');
});

app.get('/logout', (req, res, next) => {
    req.logout(err => {
        if(err) return next(err);
        // res.redirect('/');
        res.send('logout ok');
    });
});

app.get('/loginfail', (req, res) => {
    res.send(req.session.messages || 'Login failed');
});

module.exports = app;