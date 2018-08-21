let mongoose = require('mongoose')

//define o corpo dos objetos que serão armazenados dentro da coleção
let Log = mongoose.model('Log', {
	portariaID: {
		type: Number,
		required: true
	},
	createdAt: {
		type: Number,
		default: null,	//<---  validator
		required: true
	}
})

module.exports = {Log}