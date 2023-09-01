// app.js
const Sentry = require("@sentry/node");
require("@sentry/tracing");
const FileSystem = require("./utils/Filesystem");
var fs = require("fs");
require("dotenv").config();
const { ENV, ORG_OKTA_URL, CLIENT_ID, API_TOKEN } = process.env;

// const serverUrl =
//     ENV == 'prod'
//         ? 'https://skynews.rapidstack.com.au'
//         : 'http://localhost:3333';
//
// console.log('Server URL: ', serverUrl);

const path = require("path");
const express = require("express");
const { engine } = require("express-handlebars");
const axios = require("axios").default;

const helmet = require("helmet");

const initMongo = require("./config/mongo");
// const initMongo = require('./config/cosmos');

const bodyParser = require("body-parser");
const multer = require("multer");
var moment = require("moment");
var createError = require("http-errors");

var request = require("request");
var uuid4 = require("uuid4");
const jwt = require("jsonwebtoken");

const dashboard = require("./controllers/dashboard.controller");
const home = require("./controllers/home.controller");
const schedule = require("./controllers/schedule.controller");
const requestController = require("./controllers/request.controller");
const resources = require("./controllers/resource.controller");
const channels = require("./controllers/channel.controller");
const shootTypes = require("./controllers/shootType.controller");
const users = require("./controllers/user.controller");
const User = require("./models/user");

const azureStorage = new FileSystem();

const upload = multer({
  storage: azureStorage,
});
const userUpload = multer({
  storage: azureStorage,
});
const app = express();

app.use(helmet());
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: true,
});
app.use(
  Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      return true;
      if (error.status === 500) {
        return true;
      }
      return false;
    },
  })
);
// Setup express server port from ENV, default: 3333
app.set("port", process.env.PORT || 3333);

app.engine(
  "hbs",
  engine({
    defaultLayout: "main",
    extname: ".hbs",
    helpers: {
      ifEquals(arg1, arg2, options) {
        return arg1.toLowerCase() == arg2.toLowerCase()
          ? options.fn(this)
          : options.inverse(this);
      },
      date(arg1, options) {
        const d = new Date(arg1);
        return `${_pad(d.getDate())}/${_pad(
          d.getMonth() + 1
        )}/${d.getFullYear()}`;
      },
      concat(arg1, arg2) {
        return arg1 + arg2;
      },
      inArray: function (array, value) {
        return array.includes(value);
      },
    },
  })
);
app.set("views", path.join(__dirname, "/views"));
app.set("view engine", "hbs");
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// static files
app.use("/static", express.static(path.join(__dirname, "static")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(function (req, res, next) {
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors teams.microsoft.com *.teams.microsoft.com *.skype.com *.rapidstack.com.au *.okta.com *.resources365.org"
  );
  res.setHeader("X-Frame-Options", "ALLOW-FROM https://teams.microsoft.com/."); // IE11
  next();
});

const cors = require("cors");
app.use(cors());

// OKTA JWT Integration
const OktaJwtVerifier = require("@okta/jwt-verifier");
const oktaJwtVerifier = new OktaJwtVerifier({
  issuer: `https://${ORG_OKTA_URL}/oauth2/default`,
  clientId: CLIENT_ID,
  // clientSecret: CLIENT_SECRET,
  // scope: 'openid profile',
});
const audience = "api://default";

// const authenticationRequired = async (req, res, next) => {
//   const authHeader = req.headers.authorization || ''
//   const match = authHeader.match(/Bearer (.+)/)
//   if (!match) {
//     return res.status(401).send()
//   }

//   const fullName = req.headers['full-name'] || ''
//   console.log('Full-Name: ', fullName)
//   if (!fullName) {
//     return res.status(401).send()
//   }

//   try {
//     const accessToken = match[1]
//     if (!accessToken) {
//       console.log('Not authorized: ', accessToken)
//       return res.status(401, 'Not authorized').send()
//     }
//     const jwt = await oktaJwtVerifier.verifyAccessToken(accessToken, audience)

//     let user = await User.findOne({
//       username: jwt?.claims?.sub,
//     })

//     // Means this is a new user from okta
//     if (!user) {
//       // let oktaUserFullName = '';
//       // const oktaUserDetails = await axios.get(`https://${ORG_OKTA_URL}/api/v1/apps/${CLIENT_ID}/users/${jwt?.claims?.uid}`, {
//       //     headers: {
//       //         'Authorization': `SSWS ${API_TOKEN}`
//       //     }
//       // });
//       // if(oktaUserDetails?.status == 200) {
//       //     oktaUserFullName = oktaUserDetails?.data?.profile?.name;
//       // }
//       let oktaUserFullName = fullName

//       const newUserObj = {
//         id: jwt?.claims?.uid,
//         name: jwt?.claims?.sub,
//         username: jwt?.claims?.sub,
//         name: oktaUserFullName,

//         permissions: ['CREATE_REQUEST'],
//       }

//       user = await User.create(newUserObj)
//     }

//     req._user = {
//       _id: user._id,
//       name: user?.name,

//       id: jwt?.claims?.uid,
//       username: jwt?.claims?.sub,
//       token: accessToken,
//     }

//     next()
//   } catch (err) {
//     return res.status(401).send(err.message)
//   }
// }

const authenticationRequired = async (req, res, next) => {
  const fullName = req.headers["full-name"] || "in2networks";
  if (!fullName) {
    return res.status(401).send();
  }

  try {
    req._user = {
      _id: "63dd24562e7fde4af002db5b",
      name: "user?.name",
      id: "00uyefgou36tizRaE0x7",
      username: "in2networks@skynews.com.au",
      token:
        "eyJraWQiOiJ3UTF0ZFF6aWVUcmlYVnp0VzQ0ckVRTWIwOGJiZ0RUWnN5cF82dEthdmswIiwiYWxnIjoiUlMyNTYifQ.eyJ2ZXIiOjEsImp0aSI6IkFULjBfR3d4US1SSG5oRmI3b3puUU16dUpyd0pLcFEyR1RhR3pCY0VQazVJNGsiLCJpc3MiOiJodHRwczovL25ld3Njb3JwLm9rdGEuY29tL29hdXRoMi9kZWZhdWx0IiwiYXVkIjoiYXBpOi8vZGVmYXVsdCIsImlhdCI6MTY4NjI3Njg4NSwiZXhwIjoxNjg2MjgwNDg1LCJjaWQiOiIwb2F5ZGxwYWVlTEI4cTVEcjB4NyIsInVpZCI6IjAwdXllZmdvdTM2dGl6UmFFMHg3Iiwic2NwIjpbIm9wZW5pZCIsInByb2ZpbGUiLCJlbWFpbCJdLCJhdXRoX3RpbWUiOjE2ODYyNzY4ODMsInN1YiI6ImluMm5ldHdvcmtzQHNreW5ld3MuY29tLmF1In0.wIIXJtAuT9Wkk-LlME2cIqUcFlvnOU0KI5VVmzrbcFl0wKRkWFOWuggrLd0e6k0WY6b63AL_04oTF19J6ZiZhtC1cx7gguNfvNNjSe147MU_yOmgQsUynoJ-6m3xfK7dhU8GKFtJ94NphuUi10e3F9Chpmrn6E6Vccrv4Qib3mEHO-v1VdV8IynTu_3_qT8cQUGR1612MlihZeuicpR_dS38cguDjkOCCfQWkCs35ieMu4TlbK369pYo-pkji4OO_gJ9TqPEab3gfVBdASOLYLnVlPX1vewD1aCHaLl0Sjpl85S8M2nkZ_vlEG3Wk5MeFxl-g4qw0tg0i6OY1BzavA",
    };

    next();
  } catch (err) {
    return res.status(401).send(err.message);
  }
};

app.listen(app.get("port"), (err) => {
  if (err) {
    throw err;
  } else {
    console.log(`
Server running on port: http://localhost:${app.get("port")}
        `);

    // Init MongoDB
    initMongo();
  }
});

app.all("*", authenticationRequired); // Require authentication for all routes

app.get("/config", async (req, res, next) => {
  const user = await User.findById(req._user._id);
  res.status(200).json({
    message: "Login was successful",
    user: {
      id: user._id,
      firstName: user.name.split(" ")[0],
      lastName: user.name.split(" ")[1],
      username: user.username,
      image: user.image,
    },
    authorities: user?.permissions || [],
    token: req.token,
  });
});

dashboard(app);
home(app);
schedule(app, upload);
requestController(app, upload);
resources(app, upload);
channels(app);
shootTypes(app);
users(app, userUpload);

// List all registered routes
// app._router.stack.forEach(function (r) {
//   if (r.route && r.route.path) {
//     console.log(Object.keys(r.route.methods) + ' : ' + r.route.path)
//   }
// })

function _pad(num) {
  let norm = Math.floor(Math.abs(num));
  return (norm < 10 ? "0" : "") + norm;
}

app.get("/", (req, res, next) => {
  res.redirect("/home?type=pending");
});

app.get("/logout", (req, res) => {
  req.logout();
  req.session.destroy();
  res.redirect("/error");
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  console.log("Error 404: ");
  next(createError(404));
});
