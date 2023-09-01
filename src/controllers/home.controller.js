const Request = require("../models/request");
const User = require("../models/user");
const axios = require("axios").default;
const ObjectId = require("mongodb").ObjectId;
require("dotenv").config();
const { ORG_URL, API_TOKEN } = process.env;

module.exports = function home(app) {
  app.get("/home", async (req, res, next) => {
    const user = await User.findById(req._user._id);
    const date = new Date();

    const aggregatorOpts = [
      {
        $match: {
          $and: [
            {
              requestDateTime: {
                $gte: date,
              },
            },
            {
              $or: [
                {
                  "requestedBy.id": {
                    $eq: user._id,
                  },
                },
                {
                  resourceId: {
                    // $match doesnt parse the variables to its correct type that is why you have to do it yourself
                    $in: user.resources.map((r) => new ObjectId(r)),
                  },
                },
                {
                  controlRoom: {
                    // $match doesnt parse the variables to its correct type that is why you have to do it yourself
                    $in: user.resources.map((r) => new ObjectId(r)),
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
            },
          ],
        },
      },
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

    res.json({
      pending: data.filter((d) => d._id == "pending")[0]?.count,
      request: data.filter((d) => d._id == "approved")[0]?.count,
      rejected: data.filter((d) => d._id == "rejected")[0]?.count,
      authenticated: true,
      user: req.user,
    });
  });
};
