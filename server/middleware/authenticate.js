let {User} = require('./../models/user.js')

let authenticate = (req, res, next) => {
	let token = req.header('x-auth')

	User.findByToken(token).then((user) => {
		if(!user){
			//Executa a promise.reject para parar o código e chamar o metodo catch logo em seguida!
			return Promise.reject()	
		}

		req.user = user
		req.token = token 
		next()
	}).catch((err) => {
		res.status(401).send()
	})
}

module.exports = {authenticate}