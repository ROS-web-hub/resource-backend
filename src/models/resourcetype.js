const mongoose = require("mongoose");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");
const softDeletePlugin = require("mongoose-delete");
const ObjectId = require("mongodb").ObjectId;

const ResourceTypeSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, default: "" },
    name: { type: String, required: true, default: "" },
    deleted: { type: Boolean, required: true, default: false },
    deletedAt: { type: Date, default: null },
    owner: { type: ObjectId, ref: "User", required: true },
    recordingType: { type: ObjectId, ref: "RecordingType", required: true },
    status: { type: Number, default: 1 },
  },
  {
    collection: "resourcetype",
    versionKey: false,
    timestamps: true,
  }
);

ResourceTypeSchema.plugin(softDeletePlugin, {
  deletedAt: true,
  overrideMethods: true,
  deletedBy: true,
  deletedByType: String,
});
ResourceTypeSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("ResourceType", ResourceTypeSchema);
