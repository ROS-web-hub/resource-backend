const mongoose = require("mongoose");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");
const softDeletePlugin = require("mongoose-delete");
const ObjectId = require("mongodb").ObjectId;

const ChannelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    deleted: { type: Boolean, required: true, default: false },
    deletedAt: { type: Date, default: null },
    status: { type: Number, default: 1 },
  },
  {
    collection: "channel",
    versionKey: false,
    timestamps: true,
  }
);

ChannelSchema.plugin(softDeletePlugin, {
  deletedAt: true,
  overrideMethods: true,
  deletedBy: true,
  deletedByType: String,
});
ChannelSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("Channel", ChannelSchema);
