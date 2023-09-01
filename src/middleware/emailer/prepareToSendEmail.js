const { sendEmail } = require('./sendEmail')

/**
 * Prepares to send email
 * @param {string} users - users object
 * @param {string} subject - subject
 * @param {string} htmlMessage - html message
 */
const prepareToSendEmail = (users = [], subject = '', htmlMessage = '') => {
	users.map(u => {
		const user = {
			name: u.name,
			email: u.username,
		}
		const data = {
			user,
			subject,
			htmlMessage
		}
		sendEmail(data, (messageSent, obj) => {
			console.log(messageSent)
			messageSent? console.log(`Email SENT to: ${obj?.envelope?.from}`): console.log(`Email FAILED to: ${obj?.envelope?.from}`)
		}
		
		)
		if (process.env.ENV === 'prod') {

		} else if (process.env.ENV === 'dev') {
		}
	});
}

module.exports = { prepareToSendEmail }
