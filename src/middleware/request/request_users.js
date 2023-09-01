//This is used to get all users who will receive notifications related to a request
const User = require('../../models/user');
const Resource = require('../../models/resource');
const Request = require('../../models/request');

 const getRequestUsers = async(requestId) => {
	let requestResourceIds = await getRequestResourceIds(requestId);
	const users = await User.find({
		resources: {
			$in: requestResourceIds,
		},
	});
	return users;
}

const getRequestResourceIds = async(requestId) => {
	let requestResourceIds = []; 

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
    return requestResourceIds;
}
const usersToNotify= async(request)=>{
   
    let requestParticipants = await getRequestUsers(request);
   
    requestParticipants = requestParticipants.map((u)=>{
        return u._id
    })
    requestParticipants.push( request.requestedBy.id);
    let resourceIds  = await getRequestResourceIds(request._id);
    let watchers     = await getWatchersByResourceIds(resourceIds);
    let userIds      = requestParticipants.concat(watchers);
    return await User.find({
		_id: {
			$in: userIds,
		},
	});
}

const getWatchersByResourceIds = async(resourceIds)=>{
    const resources = await Resource.find({
		_id: {
			$in: resourceIds,
		},
	});
    const watcherIds = resources.reduce((r, resource)=>{

            if(resource.watchers && resource.watchers.length > 0)
            {
     
                for(let w of resource.watchers){
                    r.push(w._id);
                }
            }
            return r;
    },[]);

    const users = await User.find({
		_id: {
			$in: watcherIds,
		},
	});
    return users.map((user)=>user._id);
}

module.exports = { usersToNotify }
