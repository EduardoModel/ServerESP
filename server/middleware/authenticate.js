let {Portaria} = require('./../models/portaria.js')

let authenticate = (req, res, next) => {
	let token = req.header('x-auth')
	let portariaID = req.header('portariaID')

	Portaria.findByToken(token).then((portaria) => {
		//procura se tem alguma portaria com o token passado
		if(!portaria){
			//Executa a promise.reject para parar o código e chamar o metodo catch logo em seguida!
			return Promise.reject()	
		}
		if(portariaID === portaria.portariaID){
			req.body.portariaID = portariaID
			// req.portaria = portaria
			// req.token = token 
			next()
		}
		else{
			throw 'Token de acesso não é da portaria solicitada'
		}
		
	}).catch((err) => {
		res.status(401).send()
	})
}

module.exports = {authenticate}