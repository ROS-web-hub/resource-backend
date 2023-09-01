const User = require('../../models/user');
const Request = require('../../models/request');

 const getResourceOwnersOfRequest = async(requestId) => {
	const requestResourceIds = []; // get the IDs of all the involved resources in this request

	const request = await Request.findOne({
		_id: requestId,
	});

	if (request.controlRoom) {
		requestResourceIds.push(request.controlRoom._id);
	}

	if (request.resourceId) {
		requestResourceIds.push(request.resourceId._id);
	}

	if (request.participants.length) {
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

module.exports = { getResourceOwnersOfRequest }
