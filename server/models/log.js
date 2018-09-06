let mongoose = require('mongoose')

//define o corpo dos objetos que serão armazenados dentro da coleção
let Log = mongoose.model('Log', {
	portariaID: {
		type: String,
		minlength: 3,
		maxlength:3,
		required: true
	},
	createdAt: {
		type: Number,
		default: null,	//<---  validator
		required: true
	},
	mode: {
		type: String,
		default: 'LigaGiroled',	//que é o giroled
		required: true
	}
})

module.exports = {Log}