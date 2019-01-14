const mongoose = require('mongoose')
const validator = require('validator')
const jwt = require('jsonwebtoken')
const _ = require('lodash')
const bcrypt = require('bcryptjs')

//define o corpo dos objetos que serão armazenados dentro da coleção
let PortariaSchema = mongoose.Schema({
	portariaID: {
		type: String,
		minlength: 3,
		maxlength: 3,
		required: true
	},
	senha: {
		type: String,
		required: true,
		minlength: 6
	},
	subordinados: [{
		portariaID:{
			type: String,
			minlength: 3,
			maxlength: 3
		},
		posicao: {
			type: String,
			minlength: 1,
			maxlength: 1
		}
	}],
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
	rua:{
		type: String,
		required: true
	},
	numero: {
		type: String,
		required: true
	},
	telefone: {
		type: String
	},
	tokens: [{	//existe apenas no mongoose(NoSQL)
		access: {
			type: String,
			required: true
		},
		token: {
			type: String,
			required: true
		}
	}],
	latitude: {
		type: Number,
		required: true
	},
	longitude: {
		type: Number,
		required: true
	}
})

PortariaSchema.methods.toJSON = function() {
	let portaria = this
	let portariaObject = portaria.toObject()
	//Reduz a resposta a apenas o id e o email do usuário!
	return _.pick(portariaObject, ['portariaID', 'senha', 'subordinados'])
}

//Funções adicionadas no objeto statics viram métodos de cada objeto portaria
//Método resposável por gerar novos tokens de autenticação
PortariaSchema.methods.generateAuthToken = function() {
	let portaria = this
	let access = 'auth'
	let token = jwt.sign({_id: portaria._id.toHexString(), access}, process.env.JWT_SECRET)

	portaria.tokens = portaria.tokens.concat([{access, token}])

	return portaria.save().then(() => {
		return token
	})
}

//Método responsável por remover os tokens de autenticação
PortariaSchema.methods.removeToken = function(token) {
	let portaria = this

	//faz a atualização do vetor de tokens da portaria
	return portaria.update({
		$pull: {	//remove qualquer elemento que bater com a informação passada
			tokens: {	//busca dentro do vetor de tokens
				token 	//Vai remover todo o objeto, eleminando o tipo de acesso tmb
			}
		}
	})
}

//Funções adicionadas no objeto statics viram métodos da classe/modelo Portaria
//Método resposável por buscar a portaria pelo token de acesso
PortariaSchema.statics.findByToken = function(token) {
	let Portaria = this
	let decoded
	//se qualquer erro ocorrer no bloco try, automaticamente ele vai pro bloco de catch
	try{
		decoded = jwt.verify(token, process.env.JWT_SECRET)
	}catch(e){
		//Em vez de declarar toda uma nova promisse, chama só o reject!
		return Promise.reject()
	}
	
	//retorna uma promise e para buscar os blocos tem que usar aspas simples
	return Portaria.findOne({
		'portariaId': decoded.portariaID,
		'tokens.token': token,
		'tokens.access': 'auth'
	})
}

//Método para buscar uma portaria usando o portariaID e a senha como parâmetros
PortariaSchema.statics.findByCredentials = function(portariaID, senha) {
	let Portaria = this

   return Portaria.findOne({portariaID}).then((portaria) => {
	   if(!portaria){
		   return Promise.reject()
	   }
	   //transforma uma função que retorna um callback em uma promise
	   return new Promise((resolve, reject) => {
		   bcrypt.compare(senha, portaria.senha, (err, res) => {
			   if(res){
				   resolve(portaria)	
			   }else{
				   reject()
			   }
		   })
	   })
   })
}

//Método para gerar uma nova hash da senha da portaria
PortariaSchema.pre('save', function(next) {
	let portaria = this

	if(portaria.isModified('senha')){
		bcrypt.genSalt(10, (err, salt) => {
		bcrypt.hash(portaria.senha, salt, (err,hash) => {
			portaria.senha = hash
			next()
		})
	})
	}else{	
		next()
	}
})

let Portaria = mongoose.model('Portaria', PortariaSchema)

module.exports = {Portaria}