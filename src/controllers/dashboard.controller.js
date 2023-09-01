const Request = require("../models/request");
const Schedule = require("../models/schedule");
const resource = require("./resource.controller");
const User = require("../models/user");
const prepareEvents = require("../middleware/request/prepareEvents");
module.exports = function dashboards(app) {
  app.get("/dashboard/events", async (req, res, next) => {
    try {
      const andOptions = [];
      let scheduleAndOptions = [];
      // This set the request filters based on the ownership, i.e all requests or only user's.
      const myRequestsOnly = req.query.myRequestsOnly === "true";

      const user = await User.findById(req._user._id);
      const userResources = user.resources;

      let options = {};
      const xStart = req.query.start;
      const stemp = new Date(xStart);
      const start = new Date(
        stemp.setTime(stemp.getTime() - 24 * 60 * 60 * 1000)
      );

      const xEnd = req.query.end;
      const etemp = new Date(xEnd);
      const end = new Date(etemp.setTime(etemp.getTime() + 24 * 60 * 60 * 1000));

      const statusesString = req.query.statuses;
      const resourcesString = req.query.resources;
      let statuses = [];
      let resources = [];
      let ownedResources = [];
      let filteredResources = [];

      if (start) {
        andOptions.push({
          startDateTime: {
            $gte: start,
          },
        });
      }

      if (end) {
        andOptions.push({
          endDateTime: {
            $lte: end,
          },
        });
      }

      // Return requests that are related to these resources
      resources = resourcesString ? resourcesString.split(",") : [];

      // Filter the resources of the user where he is owner or requested by
      filteredResources = resources.filter((r) => !userResources.includes(r));
      ownedResources = resources.filter((r) => userResources.includes(r));

      scheduleAndOptions = JSON.parse(JSON.stringify(andOptions));

      if (myRequestsOnly) {
        andOptions.push({
          $or: [
            {
              "requestedBy.id": {
                $eq: user._id,
              },
            },
            {
              resourceId: {
                $in: ownedResources,
              },
            },
            {
              controlRoom: {
                $in: ownedResources,
              },
            },
            {
              participants: {
                $elemMatch: {
                  studio: {
                    $in: ownedResources,
                  },
                },
              },
            },
          ],
        });
      } else {
        andOptions.push({
          $or: [
            {
              resourceId: {
                $in: resources,
              },
            },
            {
              controlRoom: {
                $in: resources,
              },
            },
            {
              "participants.studio": { $in: resources },
            },
          ],
        });
      }

      if (statusesString) {
        statuses = statusesString.split(",");
        andOptions.push({
          status: {
            $in: statuses,
          },
        });
      }

      scheduleAndOptions.push({
        status: {
          $in: ["Active", "Complete"],
        },
      });

      scheduleAndOptions.push({
        $or: [
          {
            resourceId: {
              $in: resources,
            },
          },
        ],
      });

      if (andOptions.length) {
        options = {
          $and: andOptions,
        };
      }

      const requestData = await Request.find(options)
        .populate("requestedBy", "name")
        .populate("channel", "name")
        .populate("shootType", "name")
        .populate("resourceId", "name")
        .populate("controlRoom", "name")
        .sort({
          requestDateTime: -1,
        });

      const scheduleData = await Schedule.find({
        $and: scheduleAndOptions,
      })
        .populate("userId", "name")
        .populate("type", "name")
        .populate("resourceId", "name")
        .sort({
          startDateTime: -1,
        });

      const requests = prepareEvents.getEvents(requestData, resources);
      const schedules = prepareEvents.getScheduleEvents(scheduleData);

      const data = [...requests, ...schedules];

      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json(e);
    }
  });
};
