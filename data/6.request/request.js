const faker = require('faker')
const ObjectId = require('mongodb').ObjectId

module.exports = [
	{
        _id: new ObjectId('5aa1c2c95ef7a4e988660011'),
        requestedBy: { id: '00u5fqd0k0o2YtjGc5d7', name: 'Jhon Doe' },
        approvedBy: '',
        approvals: [
            {
                user: {
                    id: new ObjectId('5aa1c2c95ef7a4e97b5e9999'),
                    name: 'Jhon Doe',
                },
                resource: {
                    id: new ObjectId('625aadea2a06b09dc2fd2111'),
                    name: 'Sydney Studio 1',
                },
                approvalTimestamp: '2022-11-28T20:56:39.879+00:00',
                approvalType: 'automatic',
                status: 'approved',
                note: 'auto approved due to in approval time range',
            },
        ],
        resourceId: new ObjectId('5aa1c2c95ef7a4e97b229922'),
        requestType: 'live',
        status: 'pending',
        requestDateTime: new Date('2022-06-15T08:03:52.373Z'),
        startDateTime: new Date('2022-06-15T08:00:52.373Z'),
        endDateTime: new Date('2022-06-15T10:00:52.373Z'),
        details: 'This is Test Details',
		ocurrenceOptions: {  
			eventType: "single",   
			pattern: "daily", 
			patternValue: 1,    
			recurrenceValue: null,    
			requestEndCriteria: "date",    
			occurrenceTurns: 1  
		},
        channel: new ObjectId('6263ad08d38d1176c5156b21'),
        name: 'James',
        deleted: false,
        deletedAt: null,
		participants: [],
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
    },
]