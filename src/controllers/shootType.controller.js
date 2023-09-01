const Schedule = require("../models/schedule");
const Request = require("../models/request");
const ShootType = require("../models/shoottype");
var ObjectId = require("mongoose").Types.ObjectId;

const getPagination = (page, size) => {
  const limit = size ? +size : 3;
  const offset = page ? page * limit : 0;
  return { limit, offset };
};

module.exports = function shoot(app, upload) {
  app.get("/shoot-types", async (req, res, next) => {
    try {
      const shootTypes = await ShootType.find({}).lean();
      return res.json(shootTypes);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.put("/shoot-type", async (req, res, next) => {
    try {
      const checkExist = await ShootType.findOne({
        name: req?.body?.name ?? "",
      });
      if (checkExist) {
        return res.json({ message: "Already exists" });
      }
      const shootType = await ShootType.create(req?.body);
      return res.json(shootType);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.get("/shoot-type-used", async (req, res, next) => {
    try {
      const usedShootTypes = await Schedule.distinct("type", {});
      return res.json(usedShootTypes);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.get("/shoot-type/list", (req, res, next) => {
    try {
      const { page, size } = req.query;
      const { limit, offset } = getPagination(page, size);

      ShootType.paginate(
        { deleted: { $ne: true }, status: { $ne: 0 } },
        { offset, limit }
      ).then((result) => {
        res.json(result);
      });
    } catch (error) {
      console.log(error);
    }
  });

  app.post("/shoot-type/:id", async (req, res, next) => {
    try {
      const id = req.params.id;
      const data = req.body;

      const shootType = await ShootType.findByIdAndUpdate(
        id,
        {
          name: data.name,
        },
        { new: true }
      );

      return res.json(shootType);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.delete("/shoot-type/:id", async (req, res, next) => {
    try {
      const id = req.params.id;

      const shoot = await ShootType.delete({ _id: id });

      res.json(true);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.get("/shoot-type_active/:id", async (req, res, next) => {
    try {
      const id = req.params.id;
      const shoot = await ShootType.findByIdAndUpdate(
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

  app.get("/shoots/check-availability", async (req, res, next) => {
    try {
      const startDateTime = new Date(req.query.startDateTime);
      const endDateTime = new Date(req.query.endDateTime);
      const resourceId = req.query.resourceId;
      const shootId = req.query.shootId;

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

      let shoots = await Shoot.find({
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

      if (shootId) {
        shoots = shoots.filter((sch) => sch._id != shootId);
      }

      const result = {
        resources: data,
        shoots: shoots,
      };
      res.json(result);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.get("/shoots_lookup", (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit); // Make sure to parse the limit to number
      const skip = parseInt(req.query.skip); // Make sure to parse the skip to number

      Shoot.find()
        .populate("resourceId", "name")
        .populate("type", "name")
        .sort({
          _id: -1,
        }) // Use this to sort documents by newest first
        .skip(skip * limit) // Always apply 'skip' before 'limit'
        .limit(limit) // This is your 'page size'
        .exec((err, shoots) => {
          if (err) {
            return res.json(err);
          }
          Shoot.countDocuments().exec((count_error, count) => {
            if (err) {
              return res.json(count_error);
            }
            return res.json({
              total: count,
              page: skip,
              pageSize: shoots.length,
              shoots: shoots,
            });
          });
        });
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });
};
