const Channel = require("../models/channel");

const getPagination = (page, size) => {
  const limit = size ? +size : 3;
  const offset = page ? page * limit : 0;
  return { limit, offset };
};

module.exports = function channels(app) {
  app.get("/channels_lookup", async (req, res, next) => {
    const channels = await Channel.find({
      deleted: { $ne: true },
      status: { $ne: 0 },
    });
    res.json(channels);
  });

  app.get("/channels/list", (req, res, next) => {
    try {
      const { page, size } = req.query;
      const { limit, offset } = getPagination(page, size);

      Channel.paginate(
        { deleted: { $ne: true }, status: { $ne: 0 } },
        { offset, limit }
      ).then((result) => {
        res.json(result);
      });
    } catch (error) {
      console.log(error);
    }
  });

  app.get("/channels/:id", async (req, res, next) => {
    const id = req.params.id;
    try {
      const channel = await Channel.findById(id);
      return res.json(channel);
    } catch (e) {
      return res.status(500).json(e);
    }
  });

  app.put("/channels", async (req, res, next) => {
    try {
      const data = req.body;
      const response = await Channel.create({
        name: data.name,
      });
      res.json(response);
    } catch (error) {
      console.log("Error saving channel: ", error);
      return res.status(500);
    }
  });

  app.post("/channels/:id", async (req, res, next) => {
    try {
      const id = req.params.id;
      const data = req.body;

      const channel = await Channel.findByIdAndUpdate(
        id,
        {
          name: data.name,
        },
        { new: true }
      );

      res.json(channel);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.delete("/channels/:id", async (req, res, next) => {
    try {
      const id = req.params.id;

      const channel = await Channel.delete({ _id: id });

      res.json(true);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.get("/channels_active/:id", async (req, res, next) => {
    try {
      const id = req.params.id;
      const channel = await Channel.findByIdAndUpdate(
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
};
