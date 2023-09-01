const nodemailer = require('nodemailer')
const mg = require('nodemailer-mailgun-transport')
const Email = require('email-templates');
const Request = require('../../models/request');
const requestUsers = require('../request/request_users');
const moment = require('moment-timezone');
const User = require('../../models/user');
const request = require('../../models/request');
const getTransporter=function(){
	const options = {
    port: process.env.EMAIL_PORT,
    host: process.env.EMAIL_HOST,
    auth: {
      user: process.env.EMAIL_FROM_ADDRESS,
      pass: process.env.EMAIL_FROM_PASS,
    },
    secure: true,
  };
  return nodemailer.createTransport(options);
};
/**
 * Sends email
 * @param {Object} data - data
 * @param {boolean} callback - callback
 */
const sendEmail = async (data = {}, callback) => {
	const mailOptions = {
		from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
		to: `${data.user.name} <${data.user.email}>`,
		subject: data.subject,
		html: data.htmlMessage
	}
	const transporter = getTransporter();
	transporter.sendMail(mailOptions, (err, info) => {
		if (err) {
			// console.log('Mailer error: ', err);
			return callback(false, info)
		}
		// console.log('Mailer success: ', info);
		return callback(true, info)
	})
}
sendRequestNotification = async(request_id,subject,callback)=>{
	const r = await Request.findById(request_id);
	const request = await Request.findById(r.id)
	.lean()
	.populate('resourceId', 'name')
	.populate('requestedBy', 'name')
	.populate('shootType', 'name')
	.populate('controlRoom', 'name')
	.populate('channel', 'name')
	.populate({
		path: 'participants.studio',
		select: 'name',
		strictPopulate: false,
	});
	request['resourcesList'] = await r.getResources();
	request['isRecurring'] = request?.ocurrenceOptions?.eventType =='recurring';
	let usersList = await requestUsers.usersToNotify(request);
	request['requestDate'] = moment(request.requestDateTime).tz("Australia/Sydney").format('DD-MM-YYYY');
	let bookingDateTime = moment(request.startDateTime).tz("Australia/Sydney");
	let bookingTimeZoneText = getTimeZoneText(bookingDateTime);
	request['requestTimeSlot'] = bookingDateTime.format('HH:mm') + ' '+ bookingTimeZoneText +' - ' +moment(request.endDateTime).tz("Australia/Sydney").format('HH:mm')+' '+bookingTimeZoneText;
	return sendEmailWithTemplate(subject,usersList.map((u)=>u.username),request,'request_template',callback);
}



isDaylightSavingTime=(date)=>
{
	const year = date.year();
	const daylightSavingStart = moment.tz([year, 9, 1], 'Australia/Sydney');
	const daylightSavingEnd = moment.tz([year, 2, 31], 'Australia/Sydney').endOf('month');
	return date.isBetween(daylightSavingStart, daylightSavingEnd);
}
getTimeZoneText=(date)=>{
	if(isDaylightSavingTime(date) ){
		return 'AEDT';
	}
	return 'AEST';
}
sendEmailWithTemplate = async(subject,recipients=[], data={},template,callback)=>{
	data['subject']= subject;
	data['emailLogo'] = process.env.FRONTEND_URL ? process.env.FRONTEND_URL+"/assets/images/sky-news.png":'https://skynews.resources365.org/assets/images/sky-news.png';
	let requestUrl = "/home?type=pending&request_id="+data._id;
	data['viewRequestLink'] = process.env.FRONTEND_URL ? process.env.FRONTEND_URL+requestUrl:'https://skynews.resources365.org'+requestUrl;
	const user = await User.findById(data.requestedBy.id);
	if(user){
		data.requestedBy['email'] = user.username;
		data.requestedBy['emailLink'] = "mailto:"+user.username;
	}

	const email = new Email({
	juice: true,
	preview:false,
	juiceSettings: {
		tableElements: ['TABLE']
	  },
	  juiceResources: {
		applyStyleTags: true, 
	  },
	message: {
		from:  `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`
	},
	send: true,
	transport: getTransporter()
	});
	email
	.send({
		template: template,
		message: {
		to: recipients.join(",")
		},
		locals: data
	})
	.then((err,info)=>{
		return callback(true,info);
	})
	.catch((err,info)=>{
		console.log("ERROR",err);
		console.log("INFO",info);
		return callback(false,info);
	});
}

module.exports = { sendEmail , sendEmailWithTemplate, sendRequestNotification}
