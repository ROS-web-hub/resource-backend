const mongoose = require("mongoose")
const validator = require("validator")
const mongoosePaginate = require("mongoose-paginate-v2")
const ObjectId = require("mongodb").ObjectId
const softDeletePlugin = require("mongoose-delete")

const UserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    username: { type: String, required: true },
    image: { type: String, required: false },
    permissions: {
      type: [],
      default: [],
    },
    resources: [{ type: String }],
    preferences: {
      resourceFilters: {
        type: [],
        default: [],
      },
      homeFilters: {
        requestStatus: { type: String, default: "pending" },
        requestTypes: { type: [String], default: ["live"] },
        resources: { type: [String], default: [] },
        timeFilter: { type: String, default: "none" },
        timeRange: { type: [String], default: [] },
        latestRound: { type: Number, default: 0 },
        isAppendingHistory: { type: Boolean, default: false },
      },
      adminResourcesFilter: {
        resourceTypes: { type: [String], default: [] },
        resources: { type: [String], default: [] },
        locations: { type: [String], default: [] },
      },

      dashboardFilters: {
        calendarType: { type: [String], default: [] },
        timeslot: { type: String, default: "none" },
        allResourceToggled: { type: Boolean, default: true }
      }
    },
  },
  {
    collection: "user_tbl",
    versionKey: false,
    timestamps: true,
  }
)

UserSchema.plugin(softDeletePlugin, {
  deletedAt: true,
  overrideMethods: true,
  deletedBy: true,
  deletedByType: String,
})
UserSchema.plugin(mongoosePaginate)
UserSchema.statics.getUsersByResourceOwnership = function (resourceIds) {
  return this.find({
    resources: {
      $in: resourceIds,
    },
  })
}
module.exports = mongoose.model("User", UserSchema)
