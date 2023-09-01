const faker = require('faker')
const ObjectId = require('mongodb').ObjectId

module.exports = [
  {
    _id: new ObjectId('6263acf8d38d1176c5156b20'),
    name: "channel One",
    deleted: false,
		deletedAt: null,
  },
  {
    _id: new ObjectId('6263ad08d38d1176c5156b21'),
    name: "channel Two",
    deleted: false,
		deletedAt: null,
  },
]