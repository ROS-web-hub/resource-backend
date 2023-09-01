const faker = require('faker')
const ObjectId = require('mongodb').ObjectId

module.exports = [
	{
		_id: new ObjectId('5aa1c2c95ef7a4e97b5e9999'),
		id: '00u5fqd0k0o2YtjGc5d7',
		name: 'Jhon Doe',
		username: 'jhondoe@gmail.com',
		deleted: false,
		deletedAt: null,
		permissions: ['ADMIN', 'APPROVE_REJECT_REQUEST', 'CREATE_SCHEDULE', 'CREATE_REQUEST'],
		resources: [],
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent(),
	},
	{
		_id: new ObjectId('5aa1c2c95ef7a4e97b5e8888'),
		id: '00u5iz609v2Gv1ilW5d7',
		name: 'Bob Maven',
		username: 'bob@oktatest.com', // Admin User
		deleted: false,
		deletedAt: null,
		permissions: ['ADMIN', 'APPROVE_REJECT_REQUEST', 'CREATE_SCHEDULE'],
		resources: [],
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent(),
	},
	{
		_id: new ObjectId('5aa1c2c95ef7a4e97b5e7777'),
		id: '00u5iz8xvmDPhZUO35d7',
		name: 'Jane Doe',
		username: 'jane@oktatest.com', // resource owner that can create schedule
		deleted: false,
		deletedAt: null,
		permissions: ['APPROVE_REJECT_REQUEST', 'CREATE_SCHEDULE'],
		resources: [],
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent(),
	},
	{
		_id: new ObjectId('5aa1c2c95ef7a4e97b5e6666'),
		id: '00u5izdgxdQaIYPUZ5d7',
		name: 'Mark Austin',
		username: 'mark@oktatest.com', // normal user
		deleted: false,
		deletedAt: null,
		permissions: [],
		resources: [],
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent(),
	},

]
