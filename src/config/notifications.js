const Pusher = require('pusher')

module.exports = function sendPushNotification(channelName,eventName,data)
{
	try {

		const pusher = new Pusher({
			appId: "1503383",
			key: "015a6069e5c2386ddd87",
			secret: "c4963f46560a1e6cb1c7",
			cluster: "ap4",
			useTLS: true
		});
		pusher.trigger(channelName,eventName, {
			data:data
		});
	} catch (error) {
		console.log(error);
	}
}