const mongoose = require('mongoose');
const validator = require('validator');
const mongoosePaginate = require('mongoose-paginate-v2');
const softDeletePlugin = require('mongoose-delete');
const { requestIdsToArray } = require('../utils/HelperMethods');
const ObjectId = require('mongodb').ObjectId;
const User = require('./user');
const Resource = require('./resource');

const RequestSchema = new mongoose.Schema(
    {
        requestedBy: { type: Object, required: true },
        approvals: [
            {
                _id: false,
                user: {
                    _id: false,
                    id: { type: ObjectId, ref: 'User' },
                    name: { type: String },
                },
                resource: { 
                    _id: false,
                    id: { type: ObjectId, ref: 'Resource' },
                    name: { type: String },
                 },
                approvalTimestamp: { type: Date },
                approvalType: {
                    type: String,
                    enum: ['automatic', 'manual'],
                },
                status: {
                    type: String,
                    enum: ['approved', 'rejected', 'pending'],
                },
                note: { type: String },
            },
        ],
        resourceId: { type: ObjectId, ref: 'Resource' },
        controlRoom: { type: ObjectId, ref: 'Resource' },
        requestType: {
            type: String,
            enum: ['live', 'prerecorded', 'remote', 'cameraman'],
            required: true,
        },

        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'cancelled'],
            default: 'pending',
        },
        requestDateTime: { type: Date, required: true,index:true },
        startDateTime: { type: Date, required: true },
        endDateTime: { type: Date, required: true },
        details: { type: String },

        channel: { type: ObjectId, ref: 'Channel' },
        name: {
            type: String,
        } /** This contains value for individual field in remote request type as well */,
        attachment: { type: String },

        program: { type: String },
        shootType: { type: ObjectId, ref: 'ShootType' },
        contactInformation: { type: String },
        participants: [
            {
                _id: false,
                name: { type: String, required: true },
                type: { type: String, enum: ['guest', 'host'] },
                studio: { type: ObjectId, ref: 'Resource', required: true },
            },
        ],

        /**
         * This id is used to bind together all the request objects that are part of the same
         * recurring event.
         * It will be null for single event type
         */
        parentRequestId: { type: ObjectId },

        /**
         * It is the end date of the event.
         * For recurring event, it will be requested from user
         * For single event, it will be calculated from endDateTime
         */
        requestEndDatetime: { type: Date },

        /**
         * Options for the request occurence, they are kept in every occurence of
         * a recurring request, and some of them will be set for the single request type as well
         * such as eventType, pattern, requestEndCriteria
         */
        ocurrenceOptions: {
            _id: false,
            /**
             * Type of the event created, from here we determine if the request is single or recurring
             */
            eventType: { type: String, enum: ['single', 'recurring'] },
            /**
             * The frequency pattern of the recurring event
             * daily means it will happen on daily basis
             * weekly means it will occur on the weekly frequency
             * monthly means it will occur on the monthly frequency
             * yearly means it will happen once a year
             */
            pattern: {
                type: String,
                enum: ['daily', 'weekly', 'monthly', 'yearly'],
            },
            /**
             * This is the amount of the pattern counted as one turn
             * We may have events that will occur every two weeks on mondays or every three months on 15th date and so on
             * this is ignored for daily pattern
             * if value of {pattern} is weekly then it means every {patternValue} week(s)
             * if value of {pattern} is monthly then it means every {patternValue} month(s)
             * if value of {pattern} is yearly then it means every {patternValue} year(s)
             */
            patternValue: { type: Number },
            /**
             * this denotes the days of week if pattern is week or dates of a month if pattern is month
             * or dates of a year if pattern selected as yearly
             * It is ignored for daily occurence as it will use the start and end times
             */
            recurrenceValue: [
                {
                    _id: false,
                    type: Number,
                },
            ],
            /**
             * This denotes the recurring event termination criteria
             * if date selected the requestEndDatetime will be checked to denote the ending of a reccurring request
             * if occurrence is selected then the occurrenceTurns will be checked for ending of a recurring request
             */
            requestEndCriteria: { type: String, enum: ['date', 'occurrence'] },
            /**
             * occurrenceTurns is the number of turns a request will occurr before it is terminated
             * It is used when the requestEndCriteria is selected as occurrence
             */
            occurrenceTurns: { type: Number },
        },
    },
    {
        collection: 'request',
        versionKey: false,
        timestamps: true,
    }
,{autoIndex:false});
RequestSchema.index({requestDateTime:-1});
RequestSchema.plugin(softDeletePlugin, { deletedAt : true, overrideMethods: true, deletedBy: true, deletedByType: String });
RequestSchema.plugin(mongoosePaginate);
RequestSchema.methods.getAllResourceIds = function(){
    request = this;
    const requestResourceIds = []; // get the IDs of all the involved resources in this request

    if (request.controlRoom) {
        requestResourceIds.push(request.controlRoom);
    }

    if (request.resourceId) {
        requestResourceIds.push(request.resourceId);
    }

    if (request.participants?.length) {
        for (let i = 0; i < request.participants?.length; i++) {
            requestResourceIds.push(request.participants[i].studio);
        }
    }
    return requestResourceIds;
}

RequestSchema.methods.getApprovers = function(){
    return User.getUsersByResourceOwnership(this.getAllResourceIds());
}
RequestSchema.methods.getResources = async function(){
    let resources= await Resource.find({
        _id: {
            $in: this.getAllResourceIds(),
        },
    });
    results = [];
        for(let i=0;i<resources.length;i++){
            let r = resources[i];
            let approvers = await User.getUsersByResourceOwnership([resources[i]._id]);
            let result ={
                _id:r._id,
                name:r.name,
                type:r.type,
                approvers: approvers.map((u)=>{ return {username:u.username,name:u.name};})
            }
           results.push(result);
        }
    return results;
}

module.exports = mongoose.model('Request', RequestSchema);
