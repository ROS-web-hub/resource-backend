const mongoose = require("mongoose");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");
const ObjectId = require("mongodb").ObjectId;
const softDeletePlugin = require("mongoose-delete");

const ScheduleTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    status: { type: Number, default: 1 },
  },
  {
    collection: "schedule_type",
    versionKey: false,
    timestamps: true,
  }
);

ScheduleTypeSchema.plugin(softDeletePlugin, {
  deletedAt: true,
  overrideMethods: true,
  deletedBy: true,
  deletedByType: String,
});
ScheduleTypeSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("ScheduleType", ScheduleTypeSchema);
