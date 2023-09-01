const mongoose = require('mongoose');
const validator = require('validator');
const mongoosePaginate = require('mongoose-paginate-v2');
const ObjectId = require('mongodb').ObjectId;
const softDeletePlugin = require('mongoose-delete');

const ScheduleSchema = new mongoose.Schema(
    {
        userId: { type: Object, required: true }, // person id who enters this record
        date: { type: Date, required: true },
        startDateTime: { type: Date, required: true,index:true },
        endDateTime: { type: Date, required: true },
        status: {
            type: String,
            enum: ['Active', 'Inactive','Complete'],
            default: 'Active',
        },
        details: { type: String, required: true },

        type: { type: ObjectId, ref: 'ScheduleType', required: true },
        resourceId: { type: ObjectId, ref: 'Resource', required: true },
    },
    {
        collection: 'schedule',
        versionKey: false,
        timestamps: true,
    }
,{autoIndex:true});
ScheduleSchema.index({startDateTime:-1});
ScheduleSchema.plugin(softDeletePlugin, { deletedAt : true, overrideMethods: true, deletedBy: true, deletedByType: String } );
ScheduleSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Schedule', ScheduleSchema);
