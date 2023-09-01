# Booking-MIS-API

Nodejs: >=16 Version  
npm: >=8.0 Version  
ExpressJs: 4.17.3 Version  
MongoDB: >=4.8 Version  
Mongoose: 6.5 Version  


## Okta Configuration
### Create Application Integration
Applications> Applications> Create App Integration  
Select OIDC - OpenID Connect  
Select Single-Page Application  

App integration name: SkyNewsSPA  
Application type: Single Page App (SPA)  
Grant type: Authorization Code, Refresh Token   
Sign-in redirect URIs: ttp://localhost:4200/login/callback, https://skynews.rapidstack.com.au/login/callback  
Sign-out redirect URIs: http://localhost:4200, https://skynews.rapidstack.com.au/   
Initiate login URI: http://localhost:4200/login   


Copy the Client ID to env file

### Assign Users to Application
Applications> Applications> Assign Users to App  
select users that should be able to access the application  

### Create API Token
security> API> Tokens> Create Token  

copy the Token ID to API_TOKEN in env file  


### Allow CORS in Okta Admin
security> API> Trusted Origins  
Add the application URL so sign-out and redirection will work  



### Required Env variables to set in application
ORG_OKTA_URL  
CLIENT_ID  
API_TOKEN  

MONGO_URI  

<!-- Send Email -->
EMAIL_NOTIFY=true
EMAIL_FROM_NAME=SkyNews Booking
EMAIL_FROM_ADDRESS=info@skynews.com.au
EMAIL_FROM_PASS=
EMAIL_PORT=465
EMAIL_HOST=mail.skynews.com.au
ENV=prod

# Update DB structure

You can run these commands on the query of Navigate or MongoShell

db.getCollection("recordingtype").insert({
    _id: ObjectId("648fa37faeaf2e9a4ec967ff"),
    type: "live",
    resourceTypes: [],
    updatedAt: ISODate("2023-06-26T17:32:26.522Z")
});
db.getCollection("recordingtype").insert({
    _id: ObjectId("648fa3a3aeaf2e9a4ec96801"),
    type: "prerecorded",
    resourceTypes: [],
    updatedAt: ISODate("2023-06-26T14:25:41.716Z")
});


db.getCollection("resourcetype").insert({
    deleted: false,
    owner: ObjectId("63dd24562e7fde4af002db5b"),
    createdAt: ISODate("2023-06-09T14:25:22.377Z"),
    updatedAt: ISODate("2023-06-09T15:22:44.433Z"),
    type: "STUDIO",
    recordingType: ObjectId("648fa37faeaf2e9a4ec967ff"),
    name: "Studio"
});


db.getCollection("resourcetype").insert({
    deleted: false,
    owner: ObjectId("63dd24562e7fde4af002db5b"),
    createdAt: ISODate("2023-06-09T14:25:22.377Z"),
    updatedAt: ISODate("2023-06-09T15:22:44.433Z"),
    type: "CONTROL_ROOM",
    recordingType: ObjectId("648fa3a3aeaf2e9a4ec96801"),
    name: "Control Room"
});

var resourcetypes = db.getCollection("resourcetype").find()


var a = db.getCollection("resource").find()

for (var i = 0; i < a.length(); i++) {
    var restype = ObjectId("1111111111")
    for (var j = 0; j < resourcetypes.length(); j++) {
        if (resourcetypes[j]["type"] == a[i]["type"]) {
            restype = resourcetypes[j]["_id"]
        }
    }
    
    db.getCollection("resource").findOneAndUpdate({
        _id: a[i]["_id"]
    }, {
        $set: {
            type: restype
        }
    })
}