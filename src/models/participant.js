const mongoose = require('mongoose');
const validator = require('validator');
const mongoosePaginate = require('mongoose-paginate-v2');
const softDeletePlugin = require('mongoose-delete');
const ObjectId = require('mongodb').ObjectId;

const ParticipantSchema = new mongoose.Schema(
    {
        type: { type: String, enum: ['host', 'guest'], required: true },
        name: { type: String, required: true },
        studio: { type: ObjectId, ref: 'Resource', required: true },
        request: { type: ObjectId, ref: 'Request', required: true },
    },
    {
        collection: 'channel',
        versionKey: false,
        timestamps: true,
    }
);

ParticipantSchema.plugin(softDeletePlugin, { deletedAt : true, overrideMethods: true, deletedBy: true, deletedByType: String } );
ParticipantSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Participant', ParticipantSchema);
