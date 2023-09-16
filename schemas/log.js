const mongoose = require('mongoose');

const { Schema } = mongoose;
const newSchema = new Schema({
    timestamp: {
        type: Number,
        required: true,
        default: Date.now
    },
    url: {
        type: String,
        required: true
    },
    urlId: {
        type: String,
        required: true
    },
    ip: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: true
    },
    locale: {
        type: String
    }
});

module.exports = mongoose.model('Log', newSchema);