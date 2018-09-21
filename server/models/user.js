const mongoose = require('mongoose')
const validator = require('validator')
const jwt = require('jsonwebtoken')
const _ = require('lodash')
const bcrypt = require('bcryptjs')


//Modelo para estruturar o usuário global pros giroleds
let UserSchema = new mongoose.Schema({
	email: {
		type: String,
		trim: true,
		required: true,
		minlength: 1,
		unique: true,		//garante que o e-mail é único!
		validate: {
			validator: validator.isEmail,	//retorna direto se o email é válido
			message: `{VALUE} não é um e-mail válido`
		}
	},
	password: {
		type: String,
		required: true,
		minlength: 6
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
	}]
})

UserSchema.methods.toJSON = function() {
	let user = this
	let userObject = user.toObject()
	//Reduz a resposta a apenas o id e o email do usuário!
	return _.pick(userObject, ['_id', 'email'])
}

//usa isso para declarar os métodos de instância do objeto
//o uso de function agrega o this. junto ao objeto, onde o this guarda o documento individual
UserSchema.methods.generateAuthToken = function() {
	let user = this
	let access = 'auth'
	let token = jwt.sign({_id: user._id.toHexString(), access}, process.env.JWT_SECRET)

	user.tokens = user.tokens.concat([{access, token}])

	return user.save().then(() => {
		return token
	})
}


UserSchema.methods.removeToken = function(token) {
	let user = this

	//faz a atualização do vetor de tokens do usuário
	return user.update({
		$pull: {	//remove qualquer elemento que bater com a informação passada
			tokens: {	//busca dentro do vetor de tokens
				token 	//Vai remover todo o objeto, eleminando o tipo de acesso tmb
			}
		}
	})
}


//Funções adicionadas no objeto statics viram métodos da classe/modelo
UserSchema.statics.findByToken = function(token) {
	let User = this
	let decoded
	//se qualquer erro ocorrer no bloco try, automaticamente ele vai pro bloco de catch
	try{
		decoded = jwt.verify(token, process.env.JWT_SECRET)
	}catch(e){
		//Em vez de declarar toda uma nova promisse, chama só o reject!
		return Promise.reject()
	}
	
	//retorna uma promise e para buscar os blocos tem que usar aspas simples
	return User.findOne({
		'_id': decoded._id,
		'tokens.token': token,
		'tokens.access': 'auth'
	})
}

UserSchema.statics.findByCredentials = function(email, password) {
	 let User = this

	return User.findOne({email}).then((user) => {
		if(!user){
			return Promise.reject()
		}
		//transforma uma função que retorna um callback em uma promise
		return new Promise((resolve, reject) => {
			bcrypt.compare(password, user.password, (err, res) => {
				if(res){
					resolve(user)	
				}else{
					reject()
				}
				
			})
		})
	})
}

UserSchema.pre('save', function(next) {
	let user = this

	if(user.isModified('password')){
		bcrypt.genSalt(10, (err, salt) => {
		bcrypt.hash(user.password, salt, (err,hash) => {
			user.password = hash
			next()
		})
	})
	}else{	
		next()
	}
})

let User = mongoose.model('Users', UserSchema)

module.exports = {User}