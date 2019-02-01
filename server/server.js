require('./config/config.js')

const schedule = require('node-schedule')
const NodeGeocoder = require('node-geocoder');
const cors = require('cors')
 
const options = {
  provider: 'here',
  appId: process.env.APP_ID,
  appCode: process.env.APP_CODE
};

const geocoder = NodeGeocoder(options);

const _ = require('lodash')
const bodyParser = require('body-parser')
const express = require('express')
const moment = require('moment')
const {ObjectID} = require('mongodb')


const {authenticate} = require('./middleware/authenticate.js')
const {Log} = require('./models/log.js')
const {mongoose} = require('./db/mongoose.js')
const {Portaria} = require('./models/portaria.js')


const app = express()

app.use(bodyParser.json())

app.use(cors({
	exposedHeaders: ['x-auth']
}))

const port = process.env.PORT

//Funções internas do servidor
//Método para formatar a data no formato HH:MM:SS, DD/MM/AAAA
const formatDate = (timestamp) => {
	return moment(timestamp).utcOffset(-3).format('HH:mm:ss, DD/MM/YYYY')
}
/*
// //Método para filtrar os acionamentos dos giroleds, evitando redundâncias
// //e selecionando os eventos que foram acionados
// const filtraAcionamento = (logsLigados, logsDesligados, portarias, callback) => {
// 	let logsLigadosUnicos = []
// 	//1ª Iteração no vetor de logs de desligamento para filtrar os logs ligados
// 	//Para tirar as portarias que se auto-desligaram
// 	logsDesligados.forEach((logDesligado) => {
// 		logsLigados = logsLigados.filter((logLigado) => {
// 			return logLigado.portariaID !== logDesligado.portariaID
// 			|| logLigado.createdAt.valueOf() > logDesligado.createdAt.valueOf()
// 		})
// 	})

// 	//Adiciona todos os logs que estão ligados
// 	logsLigados.forEach((logLigado) => {
// 		//Desta forma deixa que apenas um log fique armazenado
// 		if(!logsLigadosUnicos.some(logLigadoUnico => logLigadoUnico.portariaID === logLigado.portariaID)){
// 			logsLigadosUnicos.push({
// 				portariaID: logLigado.portariaID,
// 				createdAt: logLigado.createdAt
// 			})
// 		}
// 	})

// 	//Nesse vetor vai ser expandido os subordinados dos ligados formatados
// 	let logsUnicos = logsLigadosUnicos

// 	logsLigadosUnicos.forEach((logLigadoUnico) => {
// 		//Busca a portaria pelo id do log ligado
// 		let portaria = portarias.filter(portaria => portaria.portariaID === logLigadoUnico.portariaID)
// 		portaria[0].subordinados.forEach((subordinado) => {
// 			if(!logsUnicos.some(logUnico => logUnico.portariaID === subordinado)){
// 				logsUnicos.push({
// 					portariaID: subordinado,
// 					createdAt: logLigadoUnico.createdAt
// 				})
// 			}
// 		})
// 	})

// 	//2ª Iteração no vetor de logs de desligamento para filtrar os logs ligados expandidos em seus subordinados
// 	logsDesligados.forEach((logDesligado) => {
// 		logsUnicos = logsUnicos.filter((logUnico) => {
// 			return logUnico.portariaID !== logDesligado.portariaID
// 			|| logUnico.createdAt.valueOf() > logDesligado.createdAt.valueOf()
// 		})
// 	})

// 	let logsFormatados = []

// 	logsUnicos.forEach((logUnico) => {
// 		logsFormatados.push({
// 			portariaID: logUnico.portariaID,
// 			data: formatDate(logUnico.createdAt)
// 		})
// 	})

// 	callback(logsFormatados)
// }
*/
//Versão com as direções integradas
//Método para filtrar os acionamentos dos giroleds, evitando redundâncias
//e selecionando os eventos que foram acionados
const filtraAcionamento = (logsLigados, logsDesligados, portarias, callback) => {
	let logsLigadosUnicos = []
	//1ª Iteração no vetor de logs de desligamento para filtrar os logs ligados
	//Para tirar as portarias que se auto-desligaram
	logsDesligados.forEach((logDesligado) => {
		logsLigados = logsLigados.filter((logLigado) => {
			return logLigado.portariaID !== logDesligado.portariaID
			|| logLigado.createdAt.valueOf() > logDesligado.createdAt.valueOf()
		})
	})

	//Adiciona todos os logs que estão ligados
	logsLigados.forEach((logLigado) => {
		//Desta forma deixa que apenas um log fique armazenado
		if(!logsLigadosUnicos.some(logLigadoUnico => logLigadoUnico.portariaID === logLigado.portariaID)){
			logsLigadosUnicos.push({
				portariaID: logLigado.portariaID,
				createdAt: logLigado.createdAt,
				direcao: logLigado.direcao,
				ameaca: logLigado.ameaca ? logLigado.ameaca : 'X',
				criador: logLigado.portariaID
			})
		}
	})

	//Nesse vetor vai ser expandido os subordinados dos ligados formatados
	let logsUnicos = logsLigadosUnicos

	logsLigadosUnicos.forEach((logLigadoUnico) => {
		//Busca a portaria pelo id do log ligado
		let portaria = portarias.filter(portaria => portaria.portariaID === logLigadoUnico.portariaID)
		portaria[0].subordinados.forEach((subordinado) => {
			if(!logsUnicos.some(logUnico => logUnico.portariaID === subordinado.portariaID)){
				let status
				if(logLigadoUnico.direcao === 'X'){
					status = 0
				}
				else if((subordinado.posicao === 'D' && logLigadoUnico.direcao === 'D') ||  (subordinado.posicao === 'E' && logLigadoUnico.direcao === 'E')){
					status = 1
				}
				else{
					status = 2
				}
				logsUnicos.push({
					portariaID: subordinado.portariaID,
					createdAt: logLigadoUnico.createdAt,
					status,
					ameaca: logLigadoUnico.ameaca,
					criador: logLigadoUnico.criador
				})
			}
		})
	})

	//2ª Iteração no vetor de logs de desligamento para filtrar os logs ligados expandidos em seus subordinados
	logsDesligados.forEach((logDesligado) => {
		logsUnicos = logsUnicos.filter((logUnico) => {
			return logUnico.portariaID !== logDesligado.portariaID
			|| logUnico.createdAt.valueOf() > logDesligado.createdAt.valueOf()
		})
	})

	let logsFormatados = []

	logsUnicos.forEach((logUnico) => {
		logsFormatados.push({
			portariaID: logUnico.portariaID,
			data: formatDate(logUnico.createdAt),
			status: logUnico.status || 0,
			createdAt: logUnico.createdAt,
			ameaca: logUnico.ameaca,
			criador: logUnico.criador
		})
	})

	callback(logsFormatados)
}

//Método para verificar se o token passado é da portaria gênesis
const verificaGenesis = async (token) => {
	try{
		let accessPortaria = await Portaria.findByToken(token)
		if(accessPortaria.portariaID === process.env.PORTARIAGENESIS){
			return true
		}
		else{
			return false
		}
	}
	catch(err){
		return false
	}
}

//Método para toda meia-noite apagar todos os tokens de acesso de todas as portarias
schedule.scheduleJob('0 0 * * *', async () => {
	await Portaria.updateMany({}, {
		$set: {
			tokens: []
		}
	})
})

app.get('/', (req, res) => {
	res.send('Ta funcionando')
})

//Logs
//Método para alterar os estados de funcionamento dos giroleds
app.post('/acionamento', authenticate, async (req, res) => {
	let log
	let evento
	//0 é pra desligar
	if(req.body.evento === 0){
		evento = 'D'
	}
	//1 é pra suspeita
	else if(req.body.evento === 1){
		evento = 'S'
	}//2 é pra ocorrencia
	else if(req.body.evento === 2){
		evento = 'O'
	}//3 é pro giroled enviar um ack pra comprovar o recebimento da ordem
	else if(req.body.evento === 3){
		evento = 'Ack'
	}//4 é pra sinalizar Pânico
	else if(req.body.evento === 4){
		evento = 'P'
	}//5 é pra atualizar a suspeita ou a ocorrência
	else if(req.body.evento === 5){
		if(typeof req.body.createdAt === 'string'){
			req.body.createdAt = parseInt(req.body.createdAt)
		}
		log = await Log.updateOne(
			{createdAt: req.body.createdAt},
			{ $set: {direcao: req.body.direcao ? req.body.direcao : 'X',
					ameaca: req.body.ameaca ? req.body.ameaca : 'X' }}
		)
		//res.send('Okk')
		res.send(log)
		return
	}
	log = new Log({
		portariaID: req.body.portariaID,
		createdAt: moment().valueOf(),
		evento: evento
	})
	res.send(await log.save())
})


/*
Códigos ameaças:
1 - A pé
2 - Bicicleta
3 - Moto
*/

//SUSPEITA
//método que mostra quais portarias ligaram as suspeitas
app.get('/suspeita', authenticate, async (req, res) => {
	try{
		//Busca os Logs de ligamento dos ultimos 30 segundos
		let logsLigados = await Log.find({
			evento: "S",
			createdAt: { $gt: moment().subtract({seconds: 30})}
		}).lean()
		//Busca os Logs de desligamento dos ultuimos 30 segundos
		let logsDesligados = await Log.find({
			evento: "D",
			createdAt: { $gt: moment().subtract({seconds: 30})}
		}).lean()
		//Busca pelas portarias existentes
		let portarias = await Portaria.find({}).lean()
		//Filtra os acionamentos das portarias
		filtraAcionamento(logsLigados, logsDesligados, portarias, (logsFormatados) => {
			res.send(logsFormatados)
		})
	}
	catch(err){
		res.status(400).send(err)
	}
})

//OCORRENCIA
//método que mostra quais portarias ligaram as ocorrencias
app.get('/ocorrencia', authenticate, async (req, res) => {
	try{
		//Busca os Logs de ligamento dos ultimos 30 segundos
		let logsLigados = await Log.find({
			evento: "O",
			createdAt: { $gt: moment().subtract({seconds: 30})}
		}).lean()
		//Busca os Logs de desligamento dos ultuimos 30 segundos
		let logsDesligados = await Log.find({
			evento: "D",
			createdAt: { $gt: moment().subtract({seconds: 30})}
		}).lean()
		//Busca pelas portarias existentes
		let portarias = await Portaria.find({}).lean()
		//Filtra os acionamentos das portarias
		filtraAcionamento(logsLigados, logsDesligados, portarias, (logsFormatados) => {
			res.send(logsFormatados)
		})
	}
	catch(err){
		res.status(400).send(err)
	}
})

//PANICO
//método que mostra quais portarias ligaram o botão de pânico
app.get('/panico', authenticate, async (req, res) => {
	try{
		//Busca os Logs de ligamento dos ultimos 30 segundos
		let logsLigados = await Log.find({
			evento: "P",
			createdAt: { $gt: moment().subtract({seconds: 30})}
		}).lean()
		//Busca os Logs de desligamento dos ultuimos 30 segundos
		let logsDesligados = await Log.find({
			evento: "D",
			createdAt: { $gt: moment().subtract({seconds: 30})}
		}).lean()
		//Retira os desligamentos das portarias que ligaram o pânico
		logsLigados.forEach((logLigado) => {
			logsDesligados = logsDesligados.filter((logDesligado) => logDesligado.portariaID !== logLigado.portariaID)
		})
		//Busca pelas portarias existentes
		let portarias = await Portaria.find({}).lean()
		//Filtra os acionamentos das portarias
		filtraAcionamento(logsLigados, logsDesligados, portarias, (logsFormatados) => {
			res.send(logsFormatados)
		})
	}
	catch(err){
		res.status(400).send(err)
	}
})

//Método para pegar os logs por id da portaria autenticada
// app.get('/getlogs', authenticate, async (req,res) => {
// 	try{
// 		let logs = await Log.find({
// 			portariaID: req.body.portariaID
// 		}).lean()
// 		logs.forEach((log) => {
// 			log.date = formatDate(log.createdAt)
// 		})
// 		res.send(logs)
// 	}
// 	catch(err){
// 		res.status(400).send(err)
// 	}
// })

app.post('/dadosportaria', authenticate, async (req,res) => {
	try{
		let portariaBuscada = await Portaria.find({
			portariaID: req.body.portariaBuscada
		}).lean()

		let endereco = portariaBuscada[0].cidade + ', '+ portariaBuscada[0].estado + ', ' + portariaBuscada[0].rua + ', Numero: ' + portariaBuscada[0].numero +
		', ' + portariaBuscada[0].bairro + ', Telefone: ' + portariaBuscada[0].telefone

		res.send({
			endereco
		})
	}catch(err){
		res.status(400).send(err)
	}
})

//Método para pegar todos os logs
app.get('/alllogs', async (req, res) => {
	try{
		let accessToken = req.header('x-auth')
		if(await verificaGenesis(accessToken)){
			let logs = await Log.find({}).lean()

			logsEnviar = logs.map((log) => {
				return {
					portariaID: log.portariaID,
					data: formatDate(log.createdAt),
					evento: log.evento 
				}
			})
			res.send(logsEnviar)
		}
		else{
			throw "Acesso negado!"
		}
	}
	catch(err){
		res.status(400).send(err)
	}
})

//Métodos referentes as portarias
//Método para gerar a portaria genesis
app.post('/portariagenesis', async (req, res) => {
	try{
		let pass = req.body.pass
		let testeGenesis = await Portaria.findOne({portariaID: process.env.PORTARIAGENESIS})
		if(!testeGenesis){
			if(pass === process.env.PASS){
				let portaria = new Portaria({
					portariaID: process.env.PORTARIAGENESIS,
					senha: req.body.senha,
					estado: "XX",
					cidade: "XXXX",
					bairro: "XXXXXX",
					rua: "XXXXXX",
					numero: "XXXX",
					latitude: 00,
					longitude: 00
				})
				let genesis = await portaria.save()
				res.send({portariaID: genesis.portariaID})
			}
			else{
				throw "Senha para criar a genesis incorreta!"
			}
		}
		else{
			throw "Usuário gênesis já existe!"
		}
	}
	catch(err){
		res.status(400).send(err)
	}
})

//Método para cadastrar portarias, através da portaria genesis
app.post('/portaria', async (req, res) => {
	try{
		let accessToken = req.header('x-auth')
		if(await verificaGenesis(accessToken)){
			let body = _.pick(req.body, ['portariaID', 'senha', 'subordinados', 'estado', 'cidade', 'bairro', 'rua', 'numero'])
			//Se não existir a portaria com o id fornecido, cria ela
			//adiciona os campos de latitude e longitude
			try{
				resposta = await geocoder.geocode({address: body.estado + " " + body.cidade + " " + body.rua + " " + body.numero})
				body.latitude = resposta[0].latitude
				body.longitude = resposta[0].longitude
			}
			catch(err){
				throw err
			}
			if(!await Portaria.findOne({
				portariaID: body.portariaID
			})){
				//O objeto body é gerado contendo os campos portariaID e senha atrelados aos respectivos valores passados na requisição
				let portaria = new Portaria(body)
				await portaria.save()
				res.send({
					portariaID: portaria.portariaID,
					subordinados: portaria.subordinados,
					estado: portaria.estado,
					cidade: portaria.cidade,
					bairro: portaria.bairro,
					rua: portaria.rua,
					numero: portaria.numero
				})
			}
			else{
				throw "Não foi possível criar a portaria. Portaria já existente!"
			}
		}
		else{
			throw "Acesso negado! Portaria não pode gerar outras portarias!"
		}
	}
	catch(err){
		res.status(400).send(err)
	}
})

//Método para retornar todas as portarias para a genesis
app.post('/portarias', async (req,res) => {
	try{
		let accessToken = req.header('x-auth')
		if(await verificaGenesis(accessToken)){
			let body = _.pick(req.body, ['estado', 'cidade', 'bairro', 'rua', 'numero'])
			let portarias = await Portaria.find(
				body
			).lean()
			let portariasEnviar = portarias.map((portaria) => {
				return {
					portariaID: portaria.portariaID,
					subordinados: portaria.subordinados,
					estado: portaria.estado,
					cidade: portaria.cidade,
					bairro: portaria.bairro,
					rua: portaria.rua,
					numero: portaria.numero
				}
			})
			res.send(portariasEnviar)
		}
		else{
			throw "Acesso negado! Não foi possível buscar as portarias!"
		}
	}catch(err){
		res.status(400).send(err)
	}
})

app.post('/acionamentos', async (req,res) => {
	try{
		let accessToken = req.header('x-auth')
		if(await verificaGenesis(accessToken)){
			let body = _.pick(req.body, ['estado', 'cidade', 'bairro', 'rua', 'numero', 'portariaID'])
			let portarias = await Portaria.find(
				body
			).lean()
			let portariasIDs = portarias.map((portaria) => portaria.portariaID)
			try{
				let logs = []
				let counter = 0
				portariasIDs.forEach(async (portariaID) => {
					let acionamentos = await Log.find({
						portariaID
					}).lean()
					let panico = acionamentos.filter((acionamento) => acionamento.evento === 'P')
					let suspeita = acionamentos.filter((acionamento) => acionamento.evento === 'S')
					let ocorrencia = acionamentos.filter((acionamento) => acionamento.evento === 'O')
					let log = {
						portariaID,
						panico,
						suspeita,
						ocorrencia
					}
					counter++
					logs.push(log)
					console.log(counter)
					if(counter === portariasIDs.length){
						res.send(logs)
					}
				})
			}
			catch(e){
				res.status(400).send(e)
			}
		}
	}catch(e){
		res.status(400).send(e)
	}
})

//Método para a ESP fazer o login e gerar o token de acesso
app.post('/portaria/login', async (req, res) => {
	try{
		let body = _.pick(req.body, ['portariaID', 'senha'])

		let portaria = await Portaria.findByCredentials(body.portariaID, body.senha)
		let token = await portaria.generateAuthToken()
		res.header('x-auth', token).send({portariaID: portaria.portariaID, subordinados: portaria.subordinados})
	}
	catch(err){
		res.status(400).send(err)
	}
})

//Método para a genesis adicionar ou remover um subordinado
app.patch('/portaria/subordinados', async (req, res) => {
	try{
		let accessToken = req.header('x-auth')
		if(await verificaGenesis(accessToken)){
			//pega os dados da portaria a ser atualizada junto com os novos subordinados
			let updatePortaria = _.pick(req.body, ['portariaID', 'novosSubordinados'])
			//busca a portaria no banco de dados
			portaria = await Portaria.findOne({portariaID: updatePortaria.portariaID})
			//Se o op for 0, é pra deletar elementos
			if(req.body.op === 0){
				//filtra os elementos que devem ser eliminados
				updatePortaria.novosSubordinados.forEach((novoSubordinado) => {
					portaria.subordinados = portaria.subordinados.filter((subordinado) => subordinado !== novoSubordinado)
				})
			}
			//Se for 1 é pra adicionar elementos
			else{
				//adiciona os novos subordinados na portaria retornada
				updatePortaria.novosSubordinados.forEach((novoSubordinado) => {
					portaria.subordinados.push(novoSubordinado)
				})
			}
			
			// faz a atualização da portaria no banco de dados
			let portariaAtualizada = await Portaria.updateOne({
				portariaID: updatePortaria.portariaID
			},
			{$set: {
				subordinados: portaria.subordinados
			}})
			if(!portariaAtualizada){
				res.status(404).send()
			}
			else{
				res.send({portariaAtualizada})
			}
		}
	}
	catch(err){
		res.status(400).send(err)
	}
})

//Método para a propria portaria trocar sua senha
// app.patch('/portaria/update/senha', authenticate, async (req, res) => {
// 	let ok = await Portaria.updateOne({
// 		portariaID: req.body.portariaID
// 	},{
// 		$set: {
// 			senha: req.body.senha
// 		}
// 	}).save()
// 	if(!ok){
// 		res.status(400).send(ok)
// 	}
// 	else{
// 		res.send(ok)
// 	}
// })

app.listen(port, () => {
	console.log(`O app está escutando na porta ${port}!`)
})

module.exports = {
	app
}

// ./mongod --dbpath ~/mongo-data ->  pra iniciar o database
// portariaID:001 qtd tokens:544