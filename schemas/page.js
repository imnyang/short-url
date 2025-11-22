import mongoose from 'mongoose';

const { Schema } = mongoose;
const newSchema = new Schema({
    domain: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    flows: {
        type: [{
            condition: {
                id: String,
                data: Object
            },
            action: {
                id: String,
                data: Object
            }
        }],
        default: []
    },
    creator: {
        type: String,
        required: true
    }
}, {
    strict: false
});

export default mongoose.model('Page', newSchema);