const express = require('express');

const main = require('../../main');
const flow = require('../../flow');

const Page = require('../../schemas/page');

const app = express.Router();

app.get('/', (req, res) => {
    res.redirect(main.getInviteURL());
});

app.get('/:url', async (req, res) => {
    const page = await Page.findOne({
        url: req.params.url
    });
    if(!page) return res.status(404).end();

    let loopCount = 0;
    for(let i = 0; i < page.flows.length; i++) {
        if(res.headersSent) return;
        if(++loopCount > 500) return res.status(508).end();

        const f = page.flows[i];

        const condition = flow.getCondition(f.condition.id);
        const action = flow.getAction(f.action.id);

        const conditionResult = await condition.conditionCheck(f.condition.data, req, res);
        if(!conditionResult) continue;

        if(action.id === 'JUMP') {
            const targetIndex = f.action.data.index - 1;
            if(targetIndex < 0 || targetIndex >= page.flows.length) return res.status(406).end();
            i = targetIndex - 1;
            continue;
        }

        await action.action(f.action.data, req, res);
    }

    res.status(406).end();
});

module.exports = app;