import mongoose from 'mongoose';

const { Schema } = mongoose;
const newSchema = new Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    selectedDomain: {
        type: String
    },
    allowedDomains: {
        type: [String],
        default: []
    }
}, {
    strict: false
});

export default mongoose.model('User', newSchema);