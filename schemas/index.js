import mongoose from 'mongoose';
import fs from 'fs';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const setting = require('../setting.json');

import Page from './page.js';

export default () => {
    const connect = async () => {
        try {
            await mongoose.connect(`mongodb://${setting.MONGODB_USER}:${setting.MONGODB_PASSWORD}@${setting.MONGODB_HOST}:${setting.MONGODB_PORT}/admin`, {
                dbName: setting.DBNAME
            });
            console.log(`MongoDB connected.`);

            const pages = await Page.find({
                url: {
                    $regex: /:/
                }
            }).lean();

            for (let page of pages) {
                global.wildcardPages[page._id] = page;
            }
        } catch (e) {
            console.error(e);
        }
    }
    connect();
    mongoose.connection.on('error', e => {
        console.error(e);
    });
    mongoose.connection.on('disconnected', () => {
        console.error('MongoDB disconnected. reconnecting...');
        connect();
    });

    console.log('Loading schemas...');
    fs.readdirSync('./schemas').forEach(async file => {
        if (file !== 'index.js') {
            await import(`./${file}`);
            console.log(`${file.trim()} schema loaded.`);
        }
    });
    console.log('All schemas loaded.');
}