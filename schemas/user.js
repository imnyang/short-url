const mongoose = require('mongoose');

const { Schema } = mongoose;
const newSchema = new Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    selectedDomain: {
        type: String
    },
    allowedDomains: {
        type: Array,
        required: true,
        default: []
    }
});

module.exports = mongoose.model('User', newSchema);