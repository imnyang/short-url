const mongoose = require('mongoose');
const randomstring = require('randomstring');
const uniqueString = require('unique-string');

const { Schema } = mongoose;
const newSchema = new Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: uniqueString
    },
    domain: {
        type: String,
        required: true,
        index: true
    },
    url: {
        type: String,
        required: true,
        index: true,
        default: () => randomstring.generate(8)
    },
    flows: {
        type: Array,
        required: true,
        default: []
    },
    expiresAt: {
        type: Number,
        required: true,
        default: 0
    },
    creator: {
        type: String,
        required: true
    }
});

newSchema.index({
    domain: 1,
    url: 1
}, {
    unique: true
});

module.exports = mongoose.model('Page', newSchema);