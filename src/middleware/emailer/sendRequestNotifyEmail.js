const { prepareToSendEmail } = require('./prepareToSendEmail')
const { getResourceOwnersOfRequest } = require('./../request/getResourceOwnersOfRequest');
const { usersToNotify } = require('./../request/request_users');
// var moment = require('moment');
const moment = require('moment-timezone');
const Request = require('../../models/request');

/**
 * Sends request notify email
 * @param {string} locale - locale
 * @param {Object} user - user object
 */
const sendRequestNotifyEmail = async (request = {}, subject = 'Request Update', htmlMsg = '') => {
	if(process.env.EMAIL_NOTIFY == 'true') {
		let htmlMessage = htmlMsg;
		if(htmlMsg?.length == 0) {
			htmlMessage += await getEmailTemplatByRequestType(request);
		}

		let users = [];
		if(request._id) {
			users = await getResourceOwnersOfRequest(request._id);
		}

		prepareToSendEmail(users, subject, htmlMessage)
	}
}

const sendEmailByTemplate = async (request = {}, template) => {
	if(process.env.EMAIL_NOTIFY == 'true') {
		let users = [];
		if(request._id) {
			users = await usersToNotify(request);
		}
		sendEmailByTemplate()
	}
}

const getEmailTemplatByRequestType = async (r = {}) => {
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
	// console.log("Request: ", request);
	// console.log("Request Participants: ", request?.participants);

	let htmlMessage = `<p>Request Type: <strong>${request?.requestType}</strong></p>
		<p>Status: ${request?.status}</p>
		<p>Request Date: ${moment(request?.requestDateTime).tz("Australia/Sydney").format('YYYY-MM-DD')}</p>
		<p>Time slot: ${moment(request?.startDateTime).tz("Australia/Sydney").format('HH:mm z')} - ${moment(request?.endDateTime).tz("Australia/Sydney").format('HH:mm z')}</p>
		<p>Requested By: ${request?.requestedBy?.name}</p>`

	if(request?.requestType == 'live') {
		htmlMessage += `<br>
			<p>Channel: ${request?.channel.name}</p>
			<p>Studio: ${request?.resourceId?.name}</p>
			<p>Name: ${request?.name}</p>
			<p>Details: ${request?.details}</p>
			<p>Thank you.</p>`

	} else if(request?.requestType == 'prerecorded') {
		htmlMessage += `<br>
			<p>Control Room: ${request?.controlRoom?.name}</p>
			<p>Participants:</p>`
			for (let i = 0; i < request?.participants.length; i++) {
				htmlMessage += `<p> - Name: ${request?.participants[i]?.name},  Studio: ${request?.participants[i]?.studio?.name}, Type: ${request?.participants[i]?.type}</p>`
			}
			htmlMessage += `<p>Details: ${request?.details}</p>
			<p>Thank you.</p>`
	} else if(request?.requestType == 'cameraman') {
		htmlMessage = `<br>
			<p>Program: ${request?.program}</p>
			<p>Shoot Type: ${request?.shootType.name}</p>
			<p>Contact Information: ${request?.contactInformation}</p>
			<p>Details: ${request?.details}</p>
			<p>Thank you.</p>`
	}

	return htmlMessage;
}

module.exports = { sendRequestNotifyEmail }
