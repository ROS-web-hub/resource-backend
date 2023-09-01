const User = require("../models/user");
const Resource = require("../models/resource");
const PERMISSIONS = require("../config/permissions");

const getPagination = (page, size) => {
  const limit = size ? +size : 3;
  const offset = page ? page * limit : 0;
  return { limit, offset };
};

module.exports = function users(app, upload) {
  app.get("/users/profile", async (req, res, next) => {
    try {
      const id = req._user._id;
      const user = await User.findById(id);
      res.json(user);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.post(
    "/users/profile-image",
    upload.single("image"),
    async (req, res, next) => {
      const fileName = req.body.attachment;
      const id = req.query.id;
      const user = await User.findByIdAndUpdate(
        id,
        {
          image: fileName,
        },
        { new: true }
      );

      return res.json(user);
    }
  );

  app.get("/users", async (req, res, next) => {
    try {
      const resources = await Resource.find().lean();
      res.json({
        authenticated: true,
        user: req._user,
        permissions: PERMISSIONS,
        resources: resources,
      });
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.get("/users/list", (req, res, next) => {
    try {
      const { page, size } = req.query;
      const { limit, offset } = getPagination(page, size);

      User.paginate({ deleted: { $ne: true } }, { offset, limit }).then(
        (result) => {
          console.log("%c Line:64 🌰 result", "color:#ed9ec7", result);
          res.json(result);
        }
      );
    } catch (error) {
      console.log(error);
    }
  });

  app.get("/users/all", (req, res, next) => {
    try {
      User.find().then((result) => {
        res.json(result);
      });
    } catch (error) {
      console.log(error);
    }
  });

  app.post("/users/:id", async (req, res, next) => {
    try {
      const id = req.params.id;
      const data = req.body;

      const user = await User.findByIdAndUpdate(
        id,
        {
          permissions: data.permissions || [],
          resources: data.resources || [],
        },
        { new: true }
      );

      res.json(user);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.get("/users/permissions", async (req, res, next) => {
    try {
      res.json(PERMISSIONS);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.get("/users/one", async (req, res, next) => {
    const username = req._user?._id;
    try {
      const user = await User.findOne({ _id: req._user?._id });
      return res.json(user);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.post("/users/update/preferences", async (req, res, next) => {
    const username = req._user?._id ?? "";
    const data = req.body.data;
    const updateField = req.body.updateField;
    try {
      const user = await User.findOne({ _id: username });
      const newPreferences = { ...user.preferences, [updateField]: data };
      const updatedUser = await User.findByIdAndUpdate(
        username,
        {
          preferences: newPreferences,
        },
        { new: true }
      );
      res.json(updatedUser);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.get("/users/:id", async (req, res, next) => {
    const id = req.params.id;
    try {
      const user = await User.findOne({ _id: id });
      return res.json(user);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });

  app.post("/users/preferences/filters", async (req, res, next) => {
    try {
      const data = req.body;
      const loginUserId = req._user._id;

      const user = await User.findOne({ _id: loginUserId });
      const preferences = { ...user.preferences, resourceFilters: data || [] };
      const updatedUser = await User.findByIdAndUpdate(
        loginUserId,
        { preferences },
        { new: true }
      );

      res.json(updatedUser);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  });
};
