const Email = require("email-templates");
const { ObjectId } = require("mongodb");
const Request = require("../models/request");
const Resource = require("../models/resource");
const Schedule = require("../models/schedule");
const ShootType = require("../models/shoottype");
const User = require("../models/user");
const sendPushNotification = require("../config/notifications");
const prepareEvents = require("../middleware/request/prepareEvents");
const Mailer = require("../middleware/emailer/sendEmail");
const moment = require("moment");
const mongoose = require("mongoose");
const conn = mongoose.connection;
const fileSystem = require("../utils/Filesystem");
const stream = require("stream");
const HelperMethods = require("../utils/HelperMethods");
const express = require("express");
const resourcetype = require("../models/resourcetype");
require("dotenv").config({
  path: ".env",
});
const { WORKING_START_TIME, WORKING_END_TIME } = process.env;
module.exports = function request(app, upload) {
  app.get("/requests/one", async (req, res, next) => {
    const id = req.query.id;

    const request = await Request.findById(id)
      .lean()
      .populate("resourceId", "name")
      .populate("requestedBy", "name")
      .populate("controlRoom", "name")
      .populate({
        path: "participants.studio",
        select: "name",
        strictPopulate: false,
      });

    const timeslot =
      getAMPMFormat(request.startDateTime) +
      " To " +
      getAMPMFormat(request.endDateTime);

    request.timeslot = timeslot;
    request.participants = request.participants;

    request.isresourceowner = "false";
    request.decisionrequired = "false";

    const userPermissions = req.user?.permissions || [];
    if (userPermissions.includes("APPROVE_REJECT_REQUEST")) {
      if (request.status == "pending") {
        request.decisionrequired = "true";
      }
    }

    res.render("request/request_view", {
      request: request,
      layout: false,
      user: req.user,
    });
  });

  // Return json data instead of template. Refer to /requests/one
  app.get("/requests/_one", async (req, res, next) => {
    const id = req.query.id;
    const userId = req._user._id;
    try {
      const user = await User.findById(userId);
      const tempRequest = await Request.findById(id);
      const participants = tempRequest.participants;
      const requestType = tempRequest.requestType;

      const approvals = tempRequest.approvals;
      const userApprovals = approvals.filter(
        (item) => item.user.id.toString() == user._id.toString()
      );
      const expiredApprovals = userApprovals.filter(
        (item) => !user.resources.includes(item.resource.id.toString())
      );

      const userIds = expiredApprovals.map((item) => item.user.id);
      const resourceIds = expiredApprovals.map((item) => item.resource.id);

      if (expiredApprovals.length > 0) {
        await Request.findByIdAndUpdate(id, {
          $pull: {
            approvals: {
              $and: [
                { "user.id": { $in: userIds } },
                { "resource.id": { $in: resourceIds } },
              ],
            },
          },
        });
      }

      let rsIds = [];

      if (requestType === "prerecorded") {
        rsIds.push(tempRequest.controlRoom);
      }
      if (requestType === "live" || requestType === "cameraman") {
        rsIds.push(tempRequest.resourceId);
      }
      if (participants.length > 0) {
        rsIds = [...rsIds, ...participants.map((item) => item.studio)];
      }

      const filteredRsIds = rsIds.filter((item) =>
        user.resources.includes(item.toString())
      );
      const userApprovalIds = userApprovals.map((item) =>
        item.resource.id.toString()
      );
      const unsetApprovalIds = filteredRsIds.filter(
        (item) => !userApprovalIds.includes(item.toString())
      );
      const getApprovalStatus = (value) => {
        return approvals.find((item) => item.resource.id.toString() == value);
      };

      const toSetApprovals = await Promise.all(
        unsetApprovalIds.map(async (item) => {
          const resource = await Resource.findById(item);

          const existingApproval = getApprovalStatus(item);

          const data = {
            user: { id: user._id, name: user.name },
            resource: { id: item, name: resource.name },
            approvalTimestamp: null,
            approvalType: existingApproval?.approvalType || "manual",
            status: existingApproval?.status || "pending",
            note: "",
          };
          return data;
        })
      );

      await Request.findByIdAndUpdate(
        id,
        {
          $push: {
            approvals: { $each: toSetApprovals },
          },
        },
        { new: true }
      );
    } catch (error) {
      console.log(error);
      res.status(500);
    }

    const request = await Request.findById(id)
      .lean()
      .populate("resourceId", "name guestLimit")
      .populate("requestedBy", "name")
      .populate("channel", "name")
      .populate("controlRoom", "name")
      .populate("shootType", "name")
      .populate({
        path: "participants.studio",
        select: "name",
        strictPopulate: false,
      });

    const timeslot =
      getAMPMFormat(request.startDateTime) +
      " To " +
      getAMPMFormat(request.endDateTime);

    request.timeslot = timeslot;
    request.participants = request.participants;

    request.isresourceowner = "false";
    request.decisionrequired = "false";
    const resourceId =
      request.requestType === "prerecorded"
        ? request.controlRoom._id
        : request.resourceId._id;
    const resource = await Resource.findById(resourceId).populate("type");
    const resourceTypeData = await resourcetype.find({
      name: `${resource.type.name}`
    });

    const resourceTypeId = resourceTypeData[0]?._id;
    const userPermissions = req.user?.permissions || [];
    if (userPermissions.includes("APPROVE_REJECT_REQUEST")) {
      if (request.status == "pending") {
        request.decisionrequired = "true";
      }
    }

    res.json({
      request: { ...request, resourceType: resource.type.name, resourceTypeId: resourceTypeId, guestLimit: resource.guestLimit },
      user: req.user,
    });
  });

  app.get("/requests/pending", async (req, res, next) => {
    const limit = parseInt(req.query.size); // Make sure to parse the limit to number
    const skip = parseInt(req.query.page); // Make sure to parse the skip to number
    let reqType = req.query.type;
    let validReqType = true;

    const user = await User.findById(req._user?._id);

    const date = moment().startOf("day");

    const requestTypes = ["pending", "approved", "rejected"];

    if (!reqType || !requestTypes.includes(reqType.toLowerCase())) {
      validReqType = false; // request type is not valid
      // fall back to default (pending) request type
      reqType = "pending";
    }

    Request.find({
      status: {
        $eq: reqType,
      },
      requestDateTime: {
        $gte: date,
      },
      $or: [
        {
          "requestedBy.id": {
            $eq: user._id,
          },
        },
        {
          resourceId: {
            $in: user.resources,
          },
        },
        {
          controlRoom: {
            $in: user.resources,
          },
        },
        {
          participants: {
            $elemMatch: {
              studio: {
                $in: user.resources,
              },
            },
          },
        },
      ],
    })
      .populate("resourceId", "name")
      .populate("requestedBy", "name")
      .populate("controlRoom", "name")
      .sort({
        requestDateTime: 1,
      }) // Use this to sort documents by newest first
      .skip(skip * limit) // Always apply 'skip' before 'limit'
      .limit(limit) // This is your 'page size'
      .exec((err, requests) => {
        if (err) {
          return res.json(err);
        }
        Request.countDocuments({
          status: {
            $eq: reqType,
          },
          requestDateTime: {
            $gte: date,
          },
          $or: [
            {
              "requestedBy.id": {
                $eq: user._id,
              },
            },
            {
              resourceId: {
                $in: user.resources,
              },
            },
            {
              controlRoom: {
                $in: user.resources,
              },
            },
            {
              participants: {
                $elemMatch: {
                  studio: {
                    $in: user.resources,
                  },
                },
              },
            },
          ],
        }).exec((count_error, count) => {
          if (err) {
            return res.json(count_error);
          }
          return res.json({
            total: count,
            page: skip,
            totalPages: Math.ceil(count / limit),
            pageSize: requests.length,
            requests: requests,
          });
        });
      });
  });

  app.post("/requests/home", async (req, res, next) => {
    const { limit, skip, search, filter, sortBy } = req.body;

    let rangeFilter = false;
    let isAppending = false;
    if (["daily", "weekly", "latest"].includes(filter.timeFilter)) {
      rangeFilter = true;
      if (filter.timeFilter == "latest") {
        isAppending = true;
      }
    }

    const user = await User.findById(req._user?._id);
    const date = moment().startOf("day");
    const resources = await Resource.find({ deleted: false });

    Request.find({
      status: {
        $eq: filter.requestStatus,
      },
      requestDateTime: rangeFilter
        ? isAppending
          ? {
            $gte: filter.timeRange[0],
          }
          : {
            $gte: filter.timeRange[0],
            $lte: filter.timeRange[1],
          }
        : {
          $gte: date,
        },

      $or: [
        {
          "requestedBy.id": {
            $eq: user._id,
          },
        },
        {
          resourceId: {
            $in: user.resources,
          },
        },
        {
          controlRoom: {
            $in: user.resources,
          },
        },
        {
          participants: {
            $elemMatch: {
              studio: {
                $in: user.resources,
              },
            },
          },
        },
      ],
      $and: [
        filter.resources.length > 0
          ? {
            $or: [
              { resourceId: { $in: filter.resources } },
              { controlRoom: { $in: filter.resources } },
            ],
          }
          : {},
        { requestType: { $in: filter.requestTypes } },
        {
          details: {
            $regex: search.status ? search.searchKey : "",
            $options: "i",
          },
        },
      ],
    })
      .populate("resourceId", "name")
      .populate("requestedBy", "name")
      .populate("controlRoom", "name")
      // .populate("participants.studio", "name")
      .sort(
        sortBy === "asc"
          ? { requestDateTime: 1 }
          : sortBy === "desc"
            ? { requestDateTime: -1 }
            : {}
      ) // Use this to sort documents by newest first
      .skip(skip * limit) // Always apply 'skip' before 'limit'
      .limit(limit) // This is your 'page size'
      .exec((err, requests) => {
        if (err) {
          return res.json(err);
        }
        Request.countDocuments({
          status: {
            $eq: filter.requestStatus,
          },
          requestDateTime: rangeFilter
            ? isAppending
              ? {
                $gte: filter.timeRange[0],
              }
              : {
                $gte: filter.timeRange[0],
                $lte: filter.timeRange[1],
              }
            : {
              $gte: date,
            },
          $or: [
            {
              "requestedBy.id": {
                $eq: user._id,
              },
            },
            {
              resourceId: {
                $in: user.resources,
              },
            },
            {
              controlRoom: {
                $in: user.resources,
              },
            },
            {
              participants: {
                $elemMatch: {
                  studio: {
                    $in: user.resources,
                  },
                },
              },
            },
          ],
          $and: [
            filter.resources.length > 0
              ? {
                $or: [
                  { resourceId: { $in: filter.resources } },
                  { controlRoom: { $in: filter.resources } },
                ],
              }
              : {},
            { requestType: { $in: filter.requestTypes } },
            {
              details: {
                $regex: search.status ? search.searchKey : "",
                $options: "i",
              },
            },
          ],
        }).exec((count_error, count) => {
          if (err) {
            return res.json(count_error);
          }
          const newRequests = [];

          requests.reduce((total, currentItem, currentItemIndex) => {
            let hostId =
              currentItem.requestType === "prerecorded"
                ? currentItem.controlRoom._id
                : currentItem.resourceId._id;

            let allExist = true;
            if (currentItem.participants.length > 0) {
              allExist = currentItem.participants.every((item) =>
                user.resources.includes(item.studio)
              );
            }

            let nopermission = currentItem.participants.filter(
              (item) => !user.resources.includes(item.studio.toString())
            );

            // let nops = [];
            // if (nopermission.length) {
            //   let stds = nopermission.map((item) => item.studio);
            //   nops = await _gets(stds);
            // }
            let nops = [];
            if (nopermission.length) {
              let stds = nopermission.map((item) => item.studio.toString());
              nops = stds.map((item) => {
                let i;
                for (i = 0; i < resources.length; i++) {
                  if (resources[i]._id == item) {
                    break;
                  }
                }
                return resources[i].name;
              });
            }

            const _request = {
              ...currentItem._doc,
              isFullyAuthorized: allExist && user.resources.includes(hostId),
              nopermission: nops,
            };

            newRequests.push(_request);
            total = currentItemIndex;
            return total;
          }, 0);
          return res.json({
            total: count,
            page: skip,
            totalPages: Math.ceil(count / limit),
            pageSize: requests.length,
            requests: newRequests,
          });
        });
      });
  });

  app.get("/requests/appointments", async (req, res, next) => {
    const interval = req.query.interval; // upcoming, history
    const limit = parseInt(req.query.limit); // Make sure to parse the limit to number
    const skip = parseInt(req.query.skip); // Make sure to parse the skip to number
    let SORT_ORDER = -1;
    const user = await User.findById(req._user?._id);

    const currentDate = new Date();
    let options = {};
    if (interval == "upcoming") {
      SORT_ORDER = 1;
      options = {
        startDateTime: {
          $gte: currentDate,
        },
        $or: [
          {
            "requestedBy.id": {
              $eq: user._id,
            },
          },
          {
            resourceId: {
              $in: user.resources,
            },
          },
          {
            controlRoom: {
              $in: user.resources,
            },
          },
          {
            participants: {
              $elemMatch: {
                studio: {
                  $in: user.resources,
                },
              },
            },
          },
        ],
      };
    } else if (interval == "history") {
      // SORT_ORDER = 1;
      options = {
        startDateTime: {
          $lte: currentDate,
        },
        $or: [
          {
            "requestedBy.id": {
              $eq: user._id,
            },
          },
          {
            resourceId: {
              $in: user.resources,
            },
          },
          {
            controlRoom: {
              $in: user.resources,
            },
          },
          {
            participants: {
              $elemMatch: {
                studio: {
                  $in: user.resources,
                },
              },
            },
          },
        ],
      };
    }

    const data = await Request.find(options)
      .sort({
        requestDateTime: SORT_ORDER,
      })
      .populate("requestedBy", "name")
      .populate("resourceId", "name")
      .populate("controlRoom", "name")
      .populate("channel", "name")
      .skip(skip)
      .limit(limit);
    return res.status(200).json(await getEvents(req, data));
  });

  app.get("/requests/all", async (req, res, next) => {
    try {
      const andOptions = [];
      let options = {};
      const start = req.query.start;
      const end = req.query.end;
      const statusesString = req.query.statuses;
      const resourcesString = req.query.resources;
      let statuses = [];
      let resources = [];

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

      if (statusesString) {
        statuses = statusesString.split(",");
        andOptions.push({
          status: {
            $in: statuses,
          },
        });
      }

      // Return requests that are related to these resources
      resources = resourcesString ? resourcesString.split(",") : [];

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
        ],
      });

      if (andOptions.length) {
        options = {
          $and: andOptions,
        };
      }

      const data = await Request.find(options)
        .populate("requestedBy", "name")
        .populate("channel", "name")
        .populate("shootType", "name")
        .populate("resourceId", "name")
        .populate("controlRoom", "name")
        .sort({
          requestDateTime: -1,
        });

      return res.status(200).json(getEvents(req, data));
    } catch (e) {
      return res.status(500).json(e);
    }
  });

  app.post("/requests/new", upload.single("file"), async (req, res, next) => {
    try {
      const data = req.body;

      const eventType = req.query.type;
      const allSavedRequests = [];
      // The resourceIds is the array of resources that are selected in the request form
      const resourceIds = HelperMethods.requestIdsToArray(
        req.body?.resourceIds
      );

      // Cast the participants to JSON from string
      if (data.participants) {
        data.participants = JSON.parse(data.participants);
      }

      /**
       * This is used to combine together the recurring events
       */
      const parentRequestId = new ObjectId();

      const requestTimeSlots = JSON.parse(data.requestTimeSlots);
      data.ocurrenceOptions = JSON.parse(data.ocurrenceOptions);
      if (eventType == "recurring") {
        data.parentRequestId = parentRequestId;
      }

      const session = await conn.startSession();
      session.startTransaction();
      for (let i = 0; i < requestTimeSlots.length; i++) {
        const isTimeSlotAvailable =
          data.requestType === "cameraman"
            ? { isAvailable: true }
            : await checAvailability(requestTimeSlots[i], resourceIds);
        if (isTimeSlotAvailable.isAvailable) {
          const savedRequest = await saveRequest(
            req,
            data,
            requestTimeSlots[i]
          );
          allSavedRequests.push(savedRequest);
        } else {
          await session.abortTransaction();

          return res.status(409).json({
            message: "The requested time slot is not available",
            data: requestTimeSlots[i],
          });
        }
      }
      await session.commitTransaction();
      await session.endSession();

      sendPushNotification(
        "skynews",
        "new-booking",
        await getEvents(req, allSavedRequests)
      );
      Mailer.sendRequestNotification(
        allSavedRequests[0].id,
        "New Booking",
        () => { }
      );
      res.json(allSavedRequests);
    } catch (error) {
      console.log("Error saving request: ", error);
      return res.status(500);
    }
  });

  async function saveRequest(req, data, timeSlot) {
    if (!data.attachment) {
      data.attachment = null;
    }

    // Add resourceId to the requestTypes [cameraman, remote] that has no resourceId
    // This ID must be for the no resource type while adding it to resource list
    // 111111111111111111111111
    // A json record is present in the
    // if (data.requestType == "remote" || data.requestType == "cameraman") {
    // let cameramanResource = await Resource.findOne({ name: "Crew" });
    // if (cameramanResource && cameramanResource._id) {
    //   data.resourceId = cameramanResource._id;
    // } else {
    //   data.resourceId = "111111111111111111111111";
    // }
    //   data.resourceId = data.resourceName;
    //   console.log("\n\n\n\n\n\n\n\nn\n\n\n\n\n\ndrgrgrgrg", data);
    // }

    if (data.requestType == "cameraman") {
      // This is new shootType, save it and re-set it to the data

      if (data.shootType == "11111") {
        const shootType = await ShootType.create({
          name: data.shootTypeName,
        });
        data.shootType = shootType._id;
      }
    }

    // Add user to the request

    const user = await User.findOne({
      username: req._user?.username,
    });

    data.requestedBy = {
      id: user?._id,
      name: user?.name,
    };

    data.requestDateTime = timeSlot.startDateTime;
    data.startDateTime = timeSlot.startDateTime;
    data.endDateTime = timeSlot.endDateTime;

    const approvals = await getApprovals(req, data);
    data.approvals = approvals;

    // If the status_to_change is 'approved' then check if all the owners has approved it
    // and if that is the case then set the status to 'approved' else set it to pending

    // If there are no resource owners for a resource then the request should be put to the pending status
    if (approvals.length == 0) {
      data.status = "pending";
    } else {
      let hasAllAprroved = true;
      for (let i = 0; i < approvals.length; i++) {
        if (approvals[i].status != "approved") {
          hasAllAprroved = false;
          break;
        }
      }

      if (hasAllAprroved) {
        data.status = "approved";
      } else {
        data.status = "pending";
      }
    }

    let rst = await Request.create(data);
    // rst = await rst.populate('channel', 'name').populate('shootType', 'name').populate('resourceId', 'name').populate('controlRoom', 'name').execPopulate();

    return rst;
  }

  /**
   * Returns the approvals array for the current request
   * If for a specific resource the request is in auto approval range and auto approval is on
   * then it is approved automatically, else it is set to pending.
   * @param {req object} req
   * @param {event request object} data
   */
  async function getApprovals(req, data) {
    let approvals = [];
    const resourceIds = await getResourceIdsOfRequest(data);
    for (let i = 0; i < resourceIds.length; i++) {
      const resource = await Resource.findById(resourceIds[i]);

      if (resource) {
        if (
          approvals.filter((appr) => appr.resource.id.equals(resource._id))
            .length
        ) {
          // Ignore if a resource is added once
          continue;
        }

        // Get all the owners of this particular resource
        const users = await User.find({
          resources: {
            $in: [resourceIds[i]],
          },
        });

        let resourceApprovalStatus = "pending";

        if (resource.autoApproval) {
          const startTime = resource.startTime.split(":");
          const endTime = resource.endTime.split(":");

          const reqStartDateTime = moment(data.startDateTime);
          const reqEndDateTime = moment(data.endDateTime);

          const resStartDateTime = moment(data.startDateTime).tz(
            "Australia/Sydney"
          );
          const resEndDateTime = moment(data.endDateTime).tz(
            "Australia/Sydney"
          );

          resStartDateTime.set({
            hour: startTime[0],
            minute: startTime[1],
            second: 0,
          });
          resEndDateTime.set({
            hour: endTime[0],
            minute: endTime[1],
            second: 0,
          });
          if (
            reqStartDateTime.isSameOrAfter(resStartDateTime) &&
            reqEndDateTime.isSameOrBefore(resEndDateTime)
          ) {
            resourceApprovalStatus = "approved";
            let user = await User.findOne({ permissions: "ADMIN" });
            approvals.push({
              user: {
                id: user._id,
                name: "Auto Approve",
              },
              status: resourceApprovalStatus, // default
              resource: {
                id: resource._id,
                name: resource.name,
              },
              approvalTimestamp:
                resourceApprovalStatus == "approved" ? new Date() : null,
              approvalType:
                resourceApprovalStatus == "approved" ? "automatic" : "manual",
              note:
                resourceApprovalStatus == "approved" ? "AUTO APPROVED" : null,
            });
          }
          for (let j = 0; j < users.length; j++) {
            approvals.push({
              user: {
                id: users[j]._id,
                name: users[j].name,
              },
              status: resourceApprovalStatus, // default
              resource: {
                id: resource._id,
                name: resource.name,
              },
              approvalTimestamp:
                resourceApprovalStatus == "approved" ? new Date() : null,
              approvalType:
                resourceApprovalStatus == "approved" ? "automatic" : "manual",
              note:
                resourceApprovalStatus == "approved" ? "AUTO APPROVED" : null,
            });
          }
        } else {
          // If the auto approval is on and the request is in the time range the approve it otherwise put it to pending

          for (let j = 0; j < users.length; j++) {
            approvals.push({
              user: {
                id: users[j]._id,
                name: users[j].name,
              },
              status: resourceApprovalStatus, // default
              resource: {
                id: resource._id,
                name: resource.name,
              },
              approvalTimestamp:
                resourceApprovalStatus == "approved" ? new Date() : null,
              approvalType:
                resourceApprovalStatus == "approved" ? "automatic" : "manual",
              note:
                resourceApprovalStatus == "approved" ? "AUTO APPROVED" : null,
            });
          }
        }
      }
    }

    return approvals;
  }

  async function getEvents(req, requests) {
    const user = await User.findById(req._user?._id);
    return prepareEvents.getEvents(
      requests,
      user?.preferences?.resourceFilters
    );
  }

  /**
   * Update the already created request
   * This will set the status of request back to pending
   * and will remove all the approvals and will need the resource owners to re approve it
   */
  app.post(
    "/requests/update",
    upload.single("file"),
    async (req, res, next) => {
      try {
        const data = req.body;
        const requestId = req.query.requestId;

        // Cast the participants to JSON from string
        if (data.participants) {
          data.participants = JSON.parse(data.participants);
        }

        if (data.fileRemoved == "true") {
          data.attachment = null;
        }

        if (
          !(data.requestType == "prerecorded" || data.requestType == "live")
        ) {
          data.participants = [];
        }

        // Reset the approvals
        const approvals = await getApprovals(req, data);
        data.approvals = approvals;

        // If the status_to_change is 'approved' then check if all the owners has approved it
        // and if that is the case then set the status to 'approved' else set it to pending
        let hasAllAprroved = true;
        for (let i = 0; i < approvals.length; i++) {
          if (approvals[i].status != "approved") {
            hasAllAprroved = false;
            break;
          }
        }

        if (hasAllAprroved) {
          data.status = "approved";
        } else {
          data.status = "pending";
        }

        /**
         * Control values if request type changed
         */
        if (data.requestType == "live") {
          data.controlRoom = null;
          data.program = null;
          data.shootType = null;
          data.contactInformation = null;
        }

        if (data.requestType == "prerecorded") {
          data.resourceId = null;
          data.channel = null;
          data.name = null;
          data.channel = null;
          data.program = null;
          data.shootType = null;
          data.contactInformation = null;
        }

        if (data.requestType == "remote") {
          data.resourceId = null;
          data.channel = null;
          data.participants = [];
          data.controlRoom = null;
          data.program = null;
          data.shootType = null;
          data.participants = [];
          data.contactInformation = null;
        }

        if (data.requestType == "cameraman") {
          // data.resourceId = null;
          data.channel = null;
          data.name = null;
          data.participants = [];
          data.controlRoom = null;
          data.contactInformation = null;
        }

        // Add resourceId to the requestTypes [cameraman, remote] that has no resourceId
        // This ID must be for the no resource type while adding it to resource list
        // 111111111111111111111111
        // A json record is present in the
        // if (data.requestType == "remote" || data.requestType == "cameraman") {
        //   let cameramanResource = await Resource.findOne({ name: "Crew" });

        //   if (cameramanResource && cameramanResource._id) {
        //     data.resourceId = cameramanResource._id;
        //   } else {
        //     data.resourceId = "111111111111111111111111";
        //   }
        // }

        const response = await Request.findByIdAndUpdate(requestId, data)
          .populate("channel", "name")
          .populate("resourceId", "name")
          .populate("shootType", "name")
          .populate("requestedBy", "name");
        sendPushNotification(
          "skynews",
          "update-booking",
          await getEvents(req, [response])
        );
        Mailer.sendRequestNotification(requestId, "Booking Updated", () => { });
        res.json(response);
      } catch (error) {
        console.log("Error saving request: ", error);
        return res.status(500);
      }
    }
  );

  app.get("/requests/resource-owners", async (req, res, next) => {
    const requestId = req.query.request_id;

    const request = await Request.findOne({
      _id: requestId,
    });

    const users = await getResourceOwnersOfRequest(request);

    res.send(users);
  });

  async function getResourceOwnersOfRequest(request) {
    const requestResourceIds = []; // get the IDs of all the involved resources in this request

    if (request?.controlRoom) {
      requestResourceIds.push(request.controlRoom._id);
    }

    if (request?.resourceId) {
      requestResourceIds.push(request.resourceId._id);
    }

    if (request?.participants.length) {
      for (let i = 0; i < request.participants.length; i++) {
        requestResourceIds.push(request.participants[i].studio);
      }
    }

    const users = await User.find({
      resources: {
        $in: requestResourceIds,
      },
    });

    return users;
  }

  async function getResourceIdsOfRequest(request) {
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

  app.post("/requests/check-availability", async (req, res, next) => {
    const resourceIds = HelperMethods.requestIdsToArray(req.query?.resourceIds);
    const requests = req.body;
    // This will be present if the check-availability is called for an update request
    const requestId = req.query.requestId;

    const fullResult = [];

    for (let i = 0; i < requests.length; i++) {
      fullResult.push(
        await checAvailability(requests[i], resourceIds, requestId)
      );
    }
    res.json(fullResult);
  });

  async function checAvailability(userRequest, resourceIds, requestId = null) {
    const startDateTime = new Date(userRequest.startDateTime);
    const endDateTime = new Date(userRequest.endDateTime);
    let isAvailable = true;

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

    let data = await Request.find({
      $and: [
        timeFilter,
        {
          status: {
            $nin: ["rejected", "cancelled"],
          },
        },
        {
          $or: [
            {
              resourceId: {
                $in: resourceIds,
              },
            },
            {
              controlRoom: {
                $in: resourceIds,
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

    const schedule = await Schedule.find({
      $and: [
        timeFilter,
        {
          resourceId: {
            $in: resourceIds,
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

    if (requestId) {
      data = data.filter((d) => {
        // remove the request itself when checking the avalable slots
        if (d._id != requestId) {
          return d;
        }
      });
    }

    if (data.length || schedule.length) {
      isAvailable = false;
    }
    const result = {
      id: userRequest.id,
      request: userRequest,
      isAvailable: isAvailable,
      requests: data,
      schedules: schedule,
    };

    return result;
  }

  app.put("/requests/change-status", async (req, res, next) => {
    const requestId = req.query.request_id;
    const requestedStatusChange = req.query.status_to_change;
    const userId = req.query.user_id;
    const note = req.query.note;
    const resourceIds = req.query.resource_ids.split(",");

    const filter = {
      _id: requestId,
    };

    const request = await Request.findOne(filter);
    const approvals = request.approvals;
    const hostId =
      request.requestType === "prerecorded"
        ? request.controlRoom
        : request.resourceId;

    for (let i = 0; i < approvals.length; i++) {
      if (resourceIds.includes(approvals[i].resource.id.toString())) {
        approvals[i].status = requestedStatusChange;
        approvals[i].approvalTimestamp = new Date();
        if (approvals[i].user.id == userId) {
          approvals[i].note = "Approved manually";
        } else {
          approvals[i].note = "Approved by mutual approval";
        }
        if (requestedStatusChange == "rejected") {
          approvals[i].note = note;
        }
      }
    }

    let update = {};
    update.approvals = approvals;

    update.status = "pending";
    const hostApproveStatus = approvals.find(
      (item) => item.resource.id.toString() == hostId.toString()
    ).status;

    if (hostApproveStatus == "approved") {
      if (!(approvals.filter((item) => item.status == "pending").length > 0)) {
        update.status = "approved";
      }
    }
    if (hostApproveStatus == "rejected") {
      update.status = "rejected";
    }

    const updatedRequest = await Request.findOneAndUpdate(filter, update, {
      new: true,
    })
      .populate("channel", "name")
      .populate("resourceId", "name")
      .populate("shootType", "name")
      .populate("requestedBy", "name");

    Mailer.sendRequestNotification(
      updatedRequest.id,
      "REQUEST " + updatedRequest.status.toUpperCase(),
      () => { }
    );
    sendPushNotification(
      "skynews",
      "update-booking",
      await getEvents(req, [updatedRequest])
    );
    res.json(updatedRequest);
  });

  app.put("/requests/multi-change-status", async (req, res, next) => {
    const userId = req._user._id;
    const { requestIds, requestedStatusChange } = req.body;
    const filter = {
      _id: { $in: requestIds },
    };
    const requests = await Request.find(filter);

    const updates = requests.map((item) => {
      const approvals = item.approvals;
      for (let i = 0; i < approvals.length; i++) {
        approvals[i].status = requestedStatusChange;
        approvals[i].approvalTimestamp = new Date();
        if (approvals[i].user.id == userId) {
          approvals[i].note = "Approved manually";
        } else {
          approvals[i].note = "Approved by mutual approval";
        }
        if (requestedStatusChange == "rejected") {
          approvals[i].note = "Rejected";
        }
      }

      let update = {};
      update.approvals = approvals;
      update.status = requestedStatusChange;

      return {
        filter: { _id: item._id },
        update,
        options: { new: true },
      };
    });

    const updatedRequests = await Promise.all(
      updates.map(async (item) => {
        const updatedRequest = await Request.findOneAndUpdate(
          item.filter,
          item.update,
          item.options
        )
          .populate("channel", "name")
          .populate("resourceId", "name")
          .populate("shootType", "name")
          .populate("requestedBy", "name");

        return updatedRequest;
      })
    );
    updatedRequests.map(async (updatedRequest) => {
      Mailer.sendRequestNotification(
        updatedRequest._id,
        "REQUEST " + updatedRequest.status.toUpperCase(),
        () => { }
      );
      sendPushNotification(
        "skynews",
        "update-booking",
        await getEvents(req, [updatedRequest])
      );
    });

    res.json(updatedRequests);
  });

  app.put("/requests/delete", async (req, res, next) => {
    const requestId = req.query.request_id;

    Mailer.sendRequestNotification(requestId, "REQUEST DELETED", () => { });
    sendPushNotification("skynews", "delete-booking", requestId);

    const username = req._user.username;

    const filter = {
      _id: requestId,
    };

    const request = await Request.delete(filter, username); // the new set to true will return the updated object

    res.json(request);
  });

  app.put("/requests/mass-delete", async (req, res, next) => {
    const username = req._user.username;

    const filter = {
      _id: { $in: req.body },
    };

    const updatedRequests = await Request.find(filter);

    const requests = await Request.delete(filter, username); // the new set to true will return the updated object
    updatedRequests.map(async (updatedRequest) => {
      Mailer.sendRequestNotification(
        updatedRequest.id,
        "REQUEST DELETED",
        () => { }
      );
      sendPushNotification("skynews", "delete-booking", updatedRequest._id);
    });
    res.json(requests);
  });

  app.get("/requests/count-by-status", async (req, res, next) => {
    const aggregatorOpts = [
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1,
          },
        },
      },
    ];
    const data = await Request.aggregate(aggregatorOpts);

    res.json(data);
  });
  app.get("/downloadFile", function (req, res) {
    const fileName = req?.query.name;
    let fs = new fileSystem();
    fs.download(fileName).then(
      (file) => {
        var fileContents = Buffer.from(file.buffer, "base64");
        var readStream = new stream.PassThrough();
        readStream.end(fileContents);
        res.set("Content-disposition", "attachment; filename=" + fileName);
        res.set("Content-Type", file.contentType);
        readStream.pipe(res);
      },
      (err) => {
        res.statusCode = 404;
        res.json({ message: "File not found" });
      }
    );
  });

  app.get("/uploadFile", function (req, res) {
    const fileName = req?.query.name;
    let fs = new fileSystem();
    fs.upload(fileName, "abc").then(
      (file) => { },
      (err) => {
        res.json(err);
      }
    );
  });
  function getAMPMFormat(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : "12"; // hour '0' should be '12'
    hours = _pad(hours);
    minutes = _pad(minutes);

    return `${hours}:${minutes} ${ampm}`;
  }

  function _pad(num) {
    let norm = Math.floor(Math.abs(num));
    return (norm < 10 ? "0" : "") + norm;
  }
};
