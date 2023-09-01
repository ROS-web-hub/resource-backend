const mongoose = require("mongoose");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");
const softDeletePlugin = require("mongoose-delete");
const User = require("./user");
const ObjectId = require("mongodb").ObjectId;

const ResourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      required: true,
    },
    image: { type: String },
    type: { type: ObjectId, ref: "ResourceType", required: true },
    guestLimit: { type: Number, default: 1 },
    autoApproval: { type: Boolean, default: false },
    startTime: { type: String },
    endTime: { type: String },

    watchers: [{ type: ObjectId, ref: "User" }],
    orderId: { type: Number, default: 0 },
    location: { type: String },
    status: { type: Number, default: 1 },
    deleted: { type: Boolean, required: true, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    collection: "resource",
    versionKey: false,
    timestamps: true,
  }
);

ResourceSchema.plugin(softDeletePlugin, {
  deletedAt: true,
  overrideMethods: true,
  deletedBy: true,
  deletedByType: String,
});
ResourceSchema.plugin(mongoosePaginate);

ResourceSchema.method.getApprovers = function () {
  return User.getUsersByResourceOwnership([this._id]);
};
module.exports = mongoose.model("Resource", ResourceSchema);
