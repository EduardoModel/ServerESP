let mongoose = require('mongoose')

//define o corpo dos objetos que serão armazenados dentro da coleção
let Portaria = mongoose.model('Portaria', {
	portariaID: {
		type: String,
		required: true
	},
	subordinados: [{
		type: String
	}]
	
	/*
	estado: {
		type: String,
		minlength: 2,
		maxlength: 2,
		required: true
	},
	cidade: {
		type: String,
		required: true
	},
	bairro: {
		type: String,
		required: true
	},
	portaria: {
		nome: {
			type: String,
			required: true
		},
		numero:{
			type: Number,
			required: true
		},
		ID:{
			type: String,
			minlength: 3,
			maxlength: 3,
			required: true
		}
	},
	latitude: {
		type: Number,
		required: true
	},
	longitude: {
		type: Number,
		required: true
	}
	*/
})

module.exports = {Portaria}