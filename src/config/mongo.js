const mongoose = require('mongoose')
const DB_URL = process.env.MONGO_URI
const loadModels = require('../models')

module.exports = () => {
	const connect = () => {
        console.log(DB_URL)
		mongoose.Promise = global.Promise
		mongoose.connect(
			DB_URL,
			{
				keepAlive: true,
				useNewUrlParser: true,
				useUnifiedTopology: true
			},
			(err) => {
				let dbStatus = ''
				if (err) {
					dbStatus = `*    Error connecting to DB: ${err}\n****************************\n`
				}
					dbStatus = `*    DB Connection: OK\n****************************\n`
					if (process.env.ENV !== 'test') {
					// Prints initialization
					console.log('****************************')
					console.log('*    Starting Server')
					console.log(`*    Port: ${process.env.PORT || 3000}`)
					console.log(`*    ENV: ${process.env.ENV}`)
					console.log(`*    Database: MongoDB`)
					console.log(dbStatus)

				}
			}
		)
	}
	connect()

	mongoose.connection.on('error', console.log)
	// mongoose.connection.on('disconnected', connect)

	mongoose.set('debug', process.env.ENV =="dev");

	loadModels()
}