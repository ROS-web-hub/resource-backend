const Resource = require("../models/resource");
const User = require("../models/user");
const ResourceType = require("../models/resourcetype");
const RecordingType = require("../models/recordingType");
const Request = require("../models/request");
const Schedule = require("../models/schedule");
const _ = require("lodash");
const { default: mongoose } = require("mongoose");

const getPagination = (page, size) => {
  const limit = size ? +size : 3;
  const offset = page ? page * limit : 0;
  return { limit, offset };
};

const checkIsUsed = async (resourceId) => {
  let isUsed = false;
  try {
    const usedRequest = await Request.findOne({
      $or: [
        {
          resourceId: resourceId,
        },
        { controlRoom: resourceId },
        { participants: { $elemMatch: { studio: resourceId } } },
      ],
    });
    const usedSchedule = await Schedule.findOne({
      resourceId: resourceId,
    });

    if (usedRequest?._id || usedSchedule?._id) isUsed = true;
  } catch (error) {
    return isUsed;
  }
  return isUsed;
};

const getId = (data) => {
  return `${data.toUpperCase().replace(" ", "_")}`;
};

const getResources = async function getResources(type = undefined) {
  if (type) {
    return await Resource.find({ deleted: { $ne: true }, status: { $ne: 0 } })
      .where("type")
      .equals(type.toUpperCase())
      .lean();
  }
  return await Resource.find({
    deleted: { $ne: true },
    status: { $ne: 0 },
  }).lean();
};
module.exports = getResources;

module.exports = function resources(app, upload) {
  app.get("/resources/list", async (req, res, next) => {
    const { page, size } = req.query;
    const { limit, offset } = getPagination(page, size);

    const resources = JSON.parse(
      JSON.stringify(
        await Resource.paginate(
          { deleted: { $ne: true } },
          {
            offset,
            limit,
          }
        )
      )
    );

    for (let i = 0; i < resources.docs.length; i++) {
      const users = await User.find(
        {
          resources: {
            $in: [resources.docs[i]._id],
          },
        },
        {
          name: 1,
          username: 1,
        }
      );

      resources.docs[i].owners = users;
    }

    res.json(resources);
  });

  app.get("/resources/update-type-123", async (req, res, next) => {
    const query = await Resource.updateMany(
      { type: "64811b69e35af6a4459cd0f1" },
      { type: "648a50392535bb2eb706fbc3" }
    );
    return;
    query._conditions = {};
    const resources = await query.exec();
    const resourceIds = resources.map((item) => item._id);

    resources.forEach((element) => {
      ResourceType.findOne({ type: element.type }).then((result) => {
        if (result) {
          const query1 = Resource.updateOne(
            { _id: element._id },
            { type: result._id },
            { new: true }
          ).then((result1) => { });
        }
      });
    });
    return res.status(200);
    await Promise.all(
      resources.map(async (item) => {
        const types = await ResourceType.findOne({
          type: item.type,
        });

        if (types?._id) {
          const resouadfadf = await Resource.updateOne(
            { _id: item._id },
            {
              type: types._id,
            },
            { runValidators: false, new: true }
          );
          //   item._id,

          // )
        }

        return true;
      })
    );
  });

  app.post("/resources/filtered-list", async (req, res, next) => {
    const { page, size, filterData, sortBy } = req.body;
    const { limit, offset } = getPagination(page, size);

    let requiredResourceTypes = [];
    if (filterData.resourceTypes.length > 0) {
      try {
        const filteredResourceTypes = await ResourceType.find({
          _id: { $in: filterData.resourceTypes },
        });
        requiredResourceTypes = filteredResourceTypes.map((item) => item._id);
      } catch (error) {
        return res.status(500).json({ error: "ResourceType collection issue" });
      }
    }
    const resources = JSON.parse(
      JSON.stringify(
        await Resource.paginate(
          {
            deleted: { $ne: true },
            ...(filterData.resources.length > 0
              ? { _id: { $in: filterData.resources } }
              : {}),
            ...(requiredResourceTypes.length > 0
              ? { type: { $in: requiredResourceTypes } }
              : {}),
            ...(filterData.locations.length > 0
              ? { location: { $in: filterData.locations } }
              : {}),
          },
          {
            offset,
            limit,
            sort:
              sortBy === "asc"
                ? { name: 1 }
                : sortBy === "desc"
                  ? { name: -1 }
                  : {},
          }
        )
      )
    );

    for (let i = 0; i < resources.docs.length; i++) {
      const users = await User.find(
        {
          resources: {
            $in: [resources.docs[i]._id],
          },
        },
        {
          name: 1,
          username: 1,
        }
      );
      const isUsed = await checkIsUsed(resources.docs[i]._id);
      resources.docs[i].owners = users;
      resources.docs[i].isUsed = isUsed;
    }

    res.json(resources);
  });

  app.post("/resources/all", async (req, res, next) => {
    const { filterData, sortBy } = req.body;

    let requiredResourceTypes = [];
    if (filterData.resourceTypes.length > 0) {
      try {
        const filteredResourceTypes = await ResourceType.find({
          _id: { $in: filterData.resourceTypes },
        });
        requiredResourceTypes = filteredResourceTypes.map((item) => item._id);
      } catch (error) {
        return res.status(500).json({ error: "ResourceType collection issue" });
      }
    }
    if (filterData.locations.includes(" ")) filterData.locations.push("");
    let resources = await Resource.find({
      status: { $ne: 0 },
      deleted: { $ne: true },
      ...(filterData.resources.length > 0
        ? { _id: { $in: filterData.resources } }
        : {}),
      ...(requiredResourceTypes.length > 0
        ? { type: { $in: requiredResourceTypes } }
        : {}),
      ...(filterData.locations.length > 0
        ? { location: { $in: filterData.locations } }
        : {}),
    }).sort(
      sortBy === "asc" ? { name: 1 } : sortBy === "desc" ? { name: -1 } : {}
    );

    for (let i = 0; i < resources.length; i++) {
      const users = await User.find(
        {
          resources: {
            $in: [resources[i]._id],
          },
        },
        {
          name: 1,
          username: 1,
        }
      );
      const isUsed = await checkIsUsed(resources[i]._id);
      resources[i].owners = users;
      resources[i].isUsed = isUsed;
      resources[i] = { ...resources[i]._doc, owners: users, isUsed };
    }

    res.json(resources);
  });

  app.post("/resources/update-order", async (req, res, next) => {
    try {
      const orders = req.body;
      const updates = orders.map((item) => ({
        filter: { _id: item.id },
        update: { $set: { orderId: item.itemIndex } },
      }));

      const bulkOps = updates.map((update) => ({
        updateOne: {
          filter: update.filter,
          update: update.update,
        },
      }));
      const result = await Resource.bulkWrite(bulkOps);
      res.json(result);
    } catch (error) {
      return res.status(500);
    }
  });

  app.post("/resources/new", upload.single("file"), async (req, res, next) => {
    try {
      const data = req.body;

      if (!data.attachment) {
        data.attachment = null;
      }

      if (!data.autoApproval) {
        data.startTime = "";
        data.endTime = "";
      }

      const existingData = await Resource.find();
      const updates = existingData.map((item) => ({
        filter: { _id: item._id },
        update: { $set: { orderId: item.orderId + 1 } },
      }));

      const bulkOps = updates.map((update) => ({
        updateOne: {
          filter: update.filter,
          update: update.update,
        },
      }));
      await Resource.bulkWrite(bulkOps);

      const response = await Resource.create(data);
      const id = response._id.toJSON();

      const loginUserId = req._user._id;

      const user = await User.findOne({ _id: loginUserId });
      let olddata = user.preferences.resourceFilters;
      olddata.push(id);
      let olddata2 = user.preferences.adminResourcesFilter;
      olddata2.resources.push(id);
      let preferences = {
        ...user.preferences,
        resourceFilters: olddata || [],
        adminResourcesFilter: olddata2 || [],
      };
      const updatedUser = await User.findByIdAndUpdate(
        loginUserId,
        { preferences },
        { new: true }
      );

      res.json(response);
    } catch (error) {
      return res.status(500);
    }
  });
  app.get("/recording-type", async (req, res, next) => {
    try {
      const { _id = "" } = req.query;
      if (_id) {
        const result = await RecordingType.findById(_id);
        return res.status(200).json(result);
      }
      const result = await RecordingType.find();
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: "RecordingType Collection error" });
    }
  });

  app.put("/recording-type", async (req, res, next) => {
    try {
      const data = req.body;
      const result = await RecordingType.findByIdAndUpdate(
        data.recordingTypes,
        { resourceTypes: data.resourceTypes },
        { new: true, upsert: true }
      );

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: "RecordingType Collection error" });
    }
  });

  app.get("/resource-type", async (req, res, next) => {
    try {
      const userId = req._user._id;
      const recordingType = req.query?.recordingType ?? "";

      if (recordingType === "all") {
        const result = await ResourceType.find({});
        return res.status(200).json(result);
      }

      const recordingTypes = await RecordingType.find({
        type: recordingType,
      });

      let resourceTypeIds = [];
      recordingTypes.map((item) => {
        resourceTypeIds = [...resourceTypeIds, ...item.resourceTypes];
      });

      const result = await ResourceType.find({
        _id: { $in: resourceTypeIds.map((id) => mongoose.Types.ObjectId(id)) },
        status: { $ne: 0 },
      });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: "ResourceType Collection error" });
    }
  });

  app.get("/resource-types", async (req, res, next) => {
    try {
      const { page, size } = req.query;
      const { limit, offset } = getPagination(page, size);

      const data = await ResourceType.paginate(
        { deleted: { $ne: true }, status: { $ne: 0 } },
        { offset, limit }
      );

      const resourceTypeIds = await Resource.distinct("type");

      ResourceType.find()
        .skip(offset)
        .limit(limit)
        .populate("recordingType", "type")
        .then((result) => {
          const updatedData = [];
          result.map((item) => {
            const a = resourceTypeIds.filter(
              (subItem) => subItem.toString() === item._id.toString()
            );

            if (a.length > 0) {
              updatedData.push({
                ...item._doc,
                isUsed: true,
              });
            } else {
              updatedData.push({
                ...item._doc,
                isUsed: false,
              });
            }
          });

          return res.status(200).json(data);
        });
    } catch (error) {
      return res.status(500).json({ error: "ResourceType Collection error" });
    }
  });

  app.post("/resource-types/:id", async (req, res, next) => {
    try {
      const resourceTypeId = req.params.id;
      const { recordingTypes, name } = req.body;
      const value = await ResourceType.findById(resourceTypeId);
      const updatedValue = await ResourceType.findByIdAndUpdate(
        resourceTypeId,
        { name: name },
        { new: true }
      );
      res.json(updatedValue);
    } catch (error) {
      return res.status(500).json({ error: "ResourceType Collection error" });
    }
  });

  app.delete("/resource-type/:id", async (req, res, next) => {
    try {
      const id = req.params.id;

      const resourcetype = await ResourceType.delete({ _id: id });

      res.json(true);
    } catch (error) {

      return res.status(500);
    }
  });

  app.get("/resource-type_active/:id", async (req, res, next) => {
    try {
      const id = req.params.id;
      const resourcetype = await ResourceType.findByIdAndUpdate(
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

  app.post("/resource-type/new", async (req, res, next) => {
    const userId = req._user._id;
    const data = req.body;
    const resourceType = getId(data.resourceType);

    ResourceType.findOne({
      owner: userId,
      type: resourceType,
      recordingType: data.recordingType,
    })
      .then(async (result) => {
        if (result?.type) {
          return res.status(409).json({ error: "ResourceType Already exists" });
        }
        try {
          const response = await ResourceType.create({
            type: resourceType,
            name: data.resourceType,
            owner: userId,
            recordingType: data.recordingType,
          });
          await RecordingType.findByIdAndUpdate(
            data.recordingType,
            {
              $push: {
                resourceTypes: response._id,
              },
            },
            { upsert: true, new: true }
          );
          return res.json(response);
        } catch (error) {
          return res
            .status(500)
            .json({ error: "ResourceType Collection error" });
        }
      })
      .catch((err) => {
        return res.status(500).json({ error: "ResourceType Collection error" });
      });
  });

  app.get("/resources_lookup", async (req, res, next) => {
    let resourceType = "";
    if (req?.query?.type) {
      const oneResourceType = await ResourceType.findOne({
        type: req?.query?.type,
      });
      resourceType = oneResourceType?._id.toString();
    }
    const resources = await getResources(resourceType);

    const orderedResources = _.orderBy(resources, ["orderId"], ["asc"]);
    res.json(orderedResources);
  });

  app.get("/resources-location", async (req, res, next) => {
    try {
      const locations = await Resource.distinct("location", {});
      const data = locations
        .filter((item) => item !== "")
        .map((item) => ({ location: item }));
      res.json(data);
    } catch (err) {
      res.status(500);
    }
  });

  app.get("/resources/:id", async (req, res, next) => {
    const id = req.params.id;
    try {
      const resource = await Resource.findById(id).populate("watchers");
      const users = await User.find(
        {
          resources: {
            $in: [resource._id],
          },
        },
        {
          name: 1,
          username: 1,
        }
      );

      let result = resource.toObject();
      result.owners = users;

      return res.json(result);
    } catch (e) {
      return res.status(500).json(e);
    }
  });

  app.get("/resources-by-type", async (req, res, next) => {
    let type = req?.query?.type ?? "";
    let resource;

    try {
      if (type) {
        console.log("%c Line:574 🍺 type", "color:#3f7cff", type);
        resource = await Resource.find({ type: mongoose.Types.ObjectId(type), status: { $ne: 0 } }).lean().exec();
        console.log("%c Line:575 🍋 resource", "color:#465975", resource);
      } else {
        resource = await Resource.find({ status: { $ne: 0 } }).lean().exec();
        console.log("%c Line:578 🍆 resource", "color:#fca650", resource);
      }
      resource = _.orderBy(resource, ["orderId"], ["asc"]);
      console.log("%c Line:581 🧀 resource", "color:#4fff4B", resource);
      return res.json(resource);
    } catch (e) {
      console.log("%c Line:586 🍭 e", "color:#33a5ff", e);
      return res.status(500).json(e);
    }
  });

  app.post("/resources/:id", async (req, res, next) => {
    try {
      const id = req.params.id;
      const data = req.body;

      if (!data.autoApproval) {
        data.startTime = "";
        data.endTime = "";
      }

      const resource = await Resource.findByIdAndUpdate(
        id,
        {
          name: data.name,
          type: data.type,
          location: data.location,
          guestLimit: data.guestLimit,
          autoApproval: data.autoApproval,
          startTime: data.startTime,
          endTime: data.endTime,
          watchers: data.watchers,
        },
        { new: true }
      );

      res.json(resource);
    } catch (error) {
      return res.status(500);
    }
  });

  app.delete("/resources/:id", async (req, res, next) => {
    try {
      const id = req.params.id;
      const resource = await Resource.delete({ _id: id });
      await User.updateMany(
        { resources: { $in: [`${id}`] } },
        { $pull: { resources: id } }
      );
      res.json(true);
    } catch (error) {
      return res.status(500);
    }
  });

  app.get("/resources_active/:id", async (req, res, next) => {
    try {
      const id = req.params.id;
      const resource = await Resource.findByIdAndUpdate(
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

  app.post("/update_calendar_type", async (req, res, next) => {
    const username = req._user?._id ?? "";
    const { filterData, viewType } = req.body;
    try {
      const user = await User.findOne({ _id: username });
      user.preferences["dashboardFilters"].calendarType = filterData.calendarType;
      const newPreferences = user.preferences;

      const updatedUser = await User.findByIdAndUpdate(
        username,
        {
          preferences: newPreferences,
        },
        { new: true }
      );

      res.json(updatedUser);


    } catch (error) {

      return res.status(500);

    }
  });

  app.get("/get_calendar_type", async (req, res, next) => {
    try {
      const username = req._user?._id ?? "";
      const user = await User.findOne({ _id: username });
      res.json(user.preferences?.dashboardFilters?.calendarType[0]);
    } catch (error) {
      res.json(500);
    }
  });

  app.post("/update_timeslot", async (req, res, next) => {
    const username = req._user?._id ?? "";
    const { timeslot } = req.body;
    try {
      let user = await User.findOne({ _id: username });

      user.preferences.dashboardFilters.timeslot = timeslot;
      let newPreferences = user.preferences;
      const updatedUser = await User.findByIdAndUpdate(
        username,
        {
          preferences: newPreferences
        },
        { new: true }
      );

      res.json(updatedUser);

    } catch (error) {
      return res.status(500);
    }
  });
  app.get("/get_timeslot", async (req, res, next) => {
    try {
      const username = req._user?._id ?? "";
      const user = await User.findOne({ _id: username });
      res.json(user.preferences?.dashboardFilters?.timeslot);
    } catch (error) {
      console.log(error);
    }
  });

  app.post("/set_allresources_toggle", async (req, res, next) => {
    const username = req._user?._id ?? "";
    const { flag } = req.body;
    try {
      const user = await User.findOne({ _id: username });
      user.preferences["dashboardFilters"].allResourceToggled = flag;
      const newPreferences = user.preferences;

      const updatedUser = await User.findByIdAndUpdate(
        username,
        {
          preferences: newPreferences
        },
        { new: true }
      );
      res.json(updatedUser);
    } catch (error) {

      return res.status(500);
    }
  });


  app.get("/getDefaultToggle", async (req, res, next) => {
    const username = req._user?._id ?? "";
    const user = await User.findOne({ _id: username });
    res.json(user.preferences.dashboardFilters.allResourceToggled);
  });
};
