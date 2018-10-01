require('./config/config.js')

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

const port = process.env.PORT

const formatDate = (timestamp) => {
	return moment(timestamp).utcOffset(-3).format('HH:mm:ss, DD/MM/YYYY')
}

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
				createdAt: logLigado.createdAt
			})
		}
	})

	//Nesse vetor vai ser expandido os subordinados dos ligados formatados
	let logsUnicos = logsLigadosUnicos

	logsLigadosUnicos.forEach((logLigadoUnico) => {
		//Busca a portaria pelo id do log ligado
		let portaria = portarias.filter(portaria => portaria.portariaID === logLigadoUnico.portariaID)
		portaria[0].subordinados.forEach((subordinado) => {
			if(!logsUnicos.some(logUnico => logUnico.portariaID === subordinado)){
				logsUnicos.push({
					portariaID: subordinado,
					createdAt: logLigadoUnico.createdAt
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
			data: formatDate(logUnico.createdAt)
		})
	})

	callback(logsFormatados)
}

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
	}
	log = new Log({
		portariaID: req.body.portariaID,
		createdAt: moment().valueOf(),
		evento: evento
	})
	res.send(await log.save())
})

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

//Método para pegar os logs por id de portaria
app.get('/logs/:id', authenticate, async (req,res) => {
	try{
		let logs = await Log.find({
			portariaID: req.params.id
		}).lean()
		logs.forEach((log) => {
			log.date = formatDate(log.createdAt)
		})
		res.send(logs)
	}
	catch(err){
		res.status(400).send(err)
	}
})

//Método para pegar todos os logs
app.get('/alllogs', authenticate, async (req, res) => {
	try{
		let logs = await Log.find({}).lean()
		logs.forEach((log) => {
			log.date = formatDate(log.createdAt)
		})
		res.send(logs)
	}
	catch(err){
		res.status(400).send(err)
	}
})

//Método para apagar todos os logs
// app.post('/deletealllogs', async (req, res) => {
// 	try{
// 		if(req.body.pass === process.env.PASS){
// 			await Log.remove({}).lean()
// 			res.send('Database deletado!')
// 		}
// 		else{
// 			res.send('Senha incorreta!')
// 		}
// 	}
// 	catch(err){
// 		res.status(400).send(err)
// 	}
// })

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
					senha: req.body.senha
				})
				let genesis = await portaria.save()
				res.send(genesis)
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

//Método para cadastrar portarias, através da portaria master
app.post('/portaria', async (req, res) => {
	try{
		let accessToken = req.header('x-auth')
		if(await verificaGenesis(accessToken)){
			let body = _.pick(req.body, ['portariaID', 'senha', 'subordinados'])
			//Se não existir a portaria com o id fornecido, cria ela
			if(!await Portaria.findOne({
				portariaID: body.portariaID
			})){
				//O objeto body é gerado contendo os campos portariaID e senha atrelados aos respectivos valores passados na requisição
				let portaria = new Portaria(body)

				res.send(await portaria.save())
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

//Método para retornar todas as portarias
app.get('portarias', async (req,res) => {
	try{
		let accessToken = req.header('x-auth')
		if(verificaGeneis(accessToken)){
			let portarias = await Portaria.find({}).lean()
			res.send(portarias)
		}
		else{
			throw "Acesso negado! Não foi possível buscar as portarias!"
		}
	}catch(err){
		res.status(400).send(err)
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
			let portariaAtualizada = await Portaria.update({
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

app.listen(port, () => {
	console.log(`O app está escutando na porta ${port}!`)
})

module.exports = {
	app
}

// ./mongod --dbpath ~/mongo-data ->  pra iniciar o database
