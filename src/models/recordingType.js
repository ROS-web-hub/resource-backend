const mongoose = require('mongoose')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')
const softDeletePlugin = require('mongoose-delete')
const ObjectId = require('mongodb').ObjectId

const RecordingTypeSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, default: '' },
    resourceTypes: { type: [String], default: [] },
    deleted: { type: Boolean, required: true, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    collection: 'recordingtype',
    versionKey: false,
    timestamps: true,
  }
)

RecordingTypeSchema.plugin(softDeletePlugin, {
  deletedAt: true,
  overrideMethods: true,
  deletedBy: true,
  deletedByType: String,
})
RecordingTypeSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('RecordingType', RecordingTypeSchema)
