const Schedule = require("../models/schedule");
const Request = require("../models/request");
const ScheduleType = require("../models/scheduletype");
var ObjectId = require("mongoose").Types.ObjectId;

const getPagination = (page, size) => {
  const limit = size ? +size : 3;
  const offset = page ? page * limit : 0;
  return { limit, offset };
};

module.exports = function schedule(app, upload) {
  app.get("/schedules/list", (req, res, next) => {
    const { page, size } = req.query;
    const { limit, offset } = getPagination(page, size);

    Schedule.paginate(
      { deleted: { $ne: true } },
      {
        populate: "resourceId type",
        offset,
        limit,
      }
    ).then((result) => {
      res.json(result);
    });
  });

  app.get("/schedules/one/:id", async (req, res, next) => {
    const id = req.params.id;
    if (id && ObjectId.isValid(id)) {
      try {
        const schedule = await Schedule.findById(id);
        if (schedule) {
          res.json(schedule);
        } else {
          res.status(404).json({
            message: "Schedule with this ID not found!",
          });
        }
      } catch (error) {
        console.log("Error getting schedule: ", error);
      }
    } else {
      res.status(404).json({
        message: "Schedule with this ID not found!",
      });
    }
  });

  app.post("/schedules/new", upload.none(), async (req, res, next) => {
    try {
      const data = req.body;
      if (data.newScheduleType) {
        const scheduleType = await ScheduleType.create({
          name: data.type,
        });

        data.type = scheduleType._id;
      }

      // Add user to the request
      data.userId = {
        id: req._user?._id,
        name: `${req._user?.firstName} ${req._user?.lastName}`,
      };

      const response = await Schedule.create(data);

      return res.json(response);
    } catch (error) {
      return res.status(500);
    }
  });

  app.post("/schedules/update", upload.none(), async (req, res, next) => {
    try {
      const data = req.body;
      const id = data.scheduleId;

      if (data.newScheduleType) {
        const scheduleType = await ScheduleType.create({
          name: data.type,
        });

        data.type = scheduleType._id;
      }

      const response = await Schedule.findByIdAndUpdate(id, data, {
        new: true,
      });

      return res.json(response);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.post("/schedules/update-status", async (req, res, next) => {
    const id = req.query.id;
    const scheduleStatus = req.query.status_to_change;

    if (scheduleStatus == "delete") {
      await Schedule.delete({
        _id: id,
      });
      res.send({ message: "Deleted successfully" });
    } else if (scheduleStatus == "Inactive" || scheduleStatus == "Complete") {
      const data = await Schedule.findByIdAndUpdate(
        {
          _id: id,
        },
        {
          status: scheduleStatus,
        }
      );

      res.json(data);
    } else {
      return res.status(404).send("Status is wrong");
    }
  });

  app.get("/schedule-types", async (req, res, next) => {
    try {
      const scheduleTypes = await ScheduleType.find({}).lean();
      return res.json(scheduleTypes);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.put("/schedule-type", async (req, res, next) => {
    try {
      const checkExist = await ScheduleType.findOne({
        name: req?.body?.name ?? "",
      });
      if (checkExist) {
        return res.json({ message: "Already exists" });
      }
      const scheduleType = await ScheduleType.create(req?.body);
      return res.json(scheduleType);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });
  app.get("/schedule-type-used", async (req, res, next) => {
    try {
      const usedScheduleTypes = await Schedule.distinct("type", {});
      return res.json(usedScheduleTypes);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.get("/schedule-type/list", (req, res, next) => {
    try {
      const { page, size } = req.query;
      const { limit, offset } = getPagination(page, size);

      ScheduleType.paginate(
        { deleted: { $ne: true }, status: { $ne: 0 } },
        { offset, limit }
      ).then((result) => {
        res.json(result);
      });
    } catch (error) {
      console.log(error);
    }
  });

  app.post("/schedule-type/:id", async (req, res, next) => {
    try {
      const id = req.params.id;
      const data = req.body;

      const scheduleType = await ScheduleType.findByIdAndUpdate(
        id,
        {
          name: data.name,
        },
        { new: true }
      );

      return res.json(scheduleType);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.delete("/schedule-type/:id", async (req, res, next) => {
    try {
      const id = req.params.id;

      const schedule = await ScheduleType.delete({ _id: id });

      res.json(true);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.get("/schedule-type_active/:id", async (req, res, next) => {
    try {
      const id = req.params.id;
      const schedule = await ScheduleType.findByIdAndUpdate(
        id,
        {
          status: 0,
        },
        { new: true }
      );
      res.json(true);
    } catch (error) {
      return res.status(500);
    }
  });

  app.get("/schedules/check-availability", async (req, res, next) => {
    try {
      const startDateTime = new Date(req.query.startDateTime);
      const endDateTime = new Date(req.query.endDateTime);
      const resourceId = req.query.resourceId;
      const scheduleId = req.query.scheduleId;

      // Updated time filter
      const timeFilter = {
        $and: [
          {
            startDateTime: {
              $lt: endDateTime,
            },
          },
          {
            endDateTime: {
              $gt: startDateTime,
            },
          },
        ],
      };

      let schedules = await Schedule.find({
        $and: [
          timeFilter,
          {
            resourceId: {
              $eq: resourceId,
            },
          },
          {
            status: {
              $eq: "Active",
            },
          },
        ],
      })
        .populate("resourceId", "name")
        .populate("type", "name");

      /**
       * Check if there is no request available in that time slot
       */
      let data = await Request.find({
        $and: [
          timeFilter,
          {
            status: {
              $nin: ["rejected"],
            },
          },
          {
            $or: [
              {
                resourceId: {
                  $eq: resourceId,
                },
              },
              {
                controlRoom: {
                  $eq: resourceId,
                },
              },
              {
                "participants.studio": {
                  $eq: resourceId,
                },
              },
            ],
          },
        ],
      })
        .populate("channel", "name")
        .populate("resourceId", "name")
        .populate("shootType", "name")
        .populate("requestedBy", "name");

      if (scheduleId) {
        schedules = schedules.filter((sch) => sch._id != scheduleId);
      }

      const result = {
        resources: data,
        schedules: schedules,
      };
      res.json(result);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.get("/schedules_lookup", (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit); // Make sure to parse the limit to number
      const skip = parseInt(req.query.skip); // Make sure to parse the skip to number

      Schedule.find()
        .populate("resourceId", "name")
        .populate("type", "name")
        .sort({
          _id: -1,
        }) // Use this to sort documents by newest first
        .skip(skip * limit) // Always apply 'skip' before 'limit'
        .limit(limit) // This is your 'page size'
        .exec((err, schedules) => {
          if (err) {
            return res.json(err);
          }
          Schedule.countDocuments().exec((count_error, count) => {
            if (err) {
              return res.json(count_error);
            }
            return res.json({
              total: count,
              page: skip,
              pageSize: schedules.length,
              schedules: schedules,
            });
          });
        });
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });
};
