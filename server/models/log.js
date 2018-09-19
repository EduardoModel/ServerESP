let mongoose = require('mongoose')

//define o corpo dos objetos que serão armazenados dentro da coleção
let Log = mongoose.model('Log', {
	portariaID: {
		type: String,
		minlength: 3,
		maxlength: 3,
		required: true
	},
	createdAt: {
		type: Number,
		default: null,	//<---  validator
		required: true
	},
	tipo:{
		type: String,
		default: 'S',
		required: true
	},
	mode: {
		type: String,
		default: 'L',	//que é o giroled
		required: true
	}
})

module.exports = {Log}

//suspeita -> antigo logs /suspeitas/giroleds -> pra avisar se ligou ou desligou (ack)
//