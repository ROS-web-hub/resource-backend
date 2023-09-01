const faker = require('faker')
const ObjectId = require('mongodb').ObjectId

/**
 * The first record with ID 111111111111111111111111 is for no resource type
 * DO NOT change the ID
 */
module.exports = [
	{
		_id: new ObjectId('111111111111111111111111'),
		name: 'No Resource',
		image: '',
		type: 'STUDIO',
		location: 'Sydney',
		deleted: false,
		deletedAt: null,
		createdAt: '2022-06-28T19:07:35.794+00:00',
		updatedAt: '2022-06-28T19:07:35.794+00:00'
	}, {
		_id: new ObjectId('5aa1c2c95ef7a4e97b229922'),
		name: 'Control Room A',
		image: '',
		type: 'CONTROL_ROOM',
		location: 'Sydney',
		deleted: false,
		deletedAt: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent()
	}, {
		_id: new ObjectId('5aa1c2c95ef7a4e97b229933'),
		name: 'Control Room B',
		image: '',
		type: 'CONTROL_ROOM',
		location: 'Sydney',
		deleted: false,
		deletedAt: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent()
	}, {
		_id: new ObjectId('5aa1c2c95ef7a4e97b229944'),
		name: 'Control Room C',
		image: '',
		type: 'CONTROL_ROOM',
		location: 'Sydney',
		deleted: false,
		deletedAt: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent()
	}, {
		_id: new ObjectId('5aa1c2c95ef7a4e97b229955'),
		name: 'Control Room D',
		image: '',
		type: 'CONTROL_ROOM',
		location: 'Sydney',
		deleted: false,
		deletedAt: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent()
	}, {
		_id: new ObjectId('625aadea2a06b09dc2fd2111'),
		name: 'Sydney Studio 1',
		image: '',
		type: 'STUDIO',
		location: 'Sydney',
		deleted: false,
		deletedAt: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent()
	}, {
		_id: new ObjectId('625aadea2a06b09dc2fd2222'),
		name: 'Sydney Studio 2',
		image: '',
		type: 'STUDIO',
		location: 'Sydney',
		deleted: false,
		deletedAt: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent()
	}, {
		_id: new ObjectId('625aadea2a06b09dc2fd2333'),
		name: 'Sydney Studio 3',
		image: '',
		type: 'STUDIO',
		location: 'Sydney',
		deleted: false,
		deletedAt: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent()
	}, {
		_id: new ObjectId('625aadea2a06b09dc2fd2444'),
		name: 'Sydney Studio 4',
		image: '',
		type: 'STUDIO',
		location: 'Sydney',
		deleted: false,
		deletedAt: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent()
	}, {
		_id: new ObjectId('625aadea2a06b09dc2fd3111'),
		name: 'Canberra Studio 1',
		image: '',
		type: 'STUDIO',
		location: 'Canberra',
		deleted: false,
		deletedAt: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent()
	}, {
		_id: new ObjectId('625aadea2a06b09dc2fd3222'),
		name: 'Canberra Studio 2',
		image: '',
		type: 'STUDIO',
		location: 'Canberra',
		deleted: false,
		deletedAt: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent()
	}, {
		_id: new ObjectId('625aadea2a06b09dc2fd3333'),
		name: 'Canberra Studio 3',
		image: '',
		type: 'STUDIO',
		location: 'Canberra',
		deleted: false,
		deletedAt: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent()
	}, {
		_id: new ObjectId('625aadea2a06b09dc2fd3444'),
		name: 'Canberra Studio 4',
		image: '',
		type: 'STUDIO',
		location: 'Canberra',
		deleted: false,
		deletedAt: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent()
	}, {
		_id: new ObjectId('625aadea2a06b09dc2fd4111'),
		name: 'Melbourne Studio 1',
		image: '',
		type: 'STUDIO',
		location: 'Melbourne',
		deleted: false,
		deletedAt: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent()
	}, {
		_id: new ObjectId('625aadea2a06b09dc2fd4222'),
		name: 'Melbourne Studio 2',
		image: '',
		type: 'STUDIO',
		location: 'Melbourne',
		deleted: false,
		deletedAt: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent()
	}, {
		_id: new ObjectId('625aadea2a06b09dc2fd4333'),
		name: 'Melbourne Studio 3',
		image: '',
		type: 'STUDIO',
		location: 'Melbourne',
		deleted: false,
		deletedAt: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent()
	}, {
		_id: new ObjectId('625aadea2a06b09dc2fd4444'),
		name: 'Melbourne Studio 4',
		image: '',
		type: 'STUDIO',
		location: 'Melbourne',
		deleted: false,
		deletedAt: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.recent()
	}
]
