require('./config/config.js')
const moment = require('moment')
const bodyParser = require('body-parser')


const express = require('express')
const {ObjectID} = require('mongodb')


const {mongoose} = require('./db/mongoose.js')

const {Log} = require('./models/log.js')
const {Portaria} = require('./models/portaria.js')

const app = express()

app.use(bodyParser.json())

const port = process.env.PORT

let formatDate = (timestamp) => {
	return moment(timestamp).utcOffset(-3).format('HH:mm:ss, DD/MM/YYYY')
}

let filtraAcionamento = (logsLigados, logsDesligados, portarias, callback) => {
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

app.get('/', (req, res) => {
	res.send('Ta funcionando')
})


//SUSPEITA
//Método para postar as suspeitas
app.post('/suspeita', async (req, res) => {
	//Pra transformar de string para um objeto
	let log
	if(req.body.mode === 0){
		log = new Log({
			portariaID: req.body.portariaID,
			createdAt: moment().valueOf(),
			mode: "D"
		})
	}
	else if(req.body.mode === 2){
		log = new Log({
			portariaID: req.body.portariaID,
			createdAt: moment().valueOf(),
			mode: "Ack"
		})
	}
	else{
		log = new Log({
			portariaID: req.body.portariaID,
			createdAt: moment().valueOf()
		})
	}

	try{
		let logResposta = await log.save()
		res.send(log)
	}
	catch(err){
		res.status(400).send(err)
	}
})

//método que mostra quais portarias ligaram as suspeitas
app.get('/suspeita', async (req, res) => {
	try{
		//Busca os Logs de ligamento dos ultimos 30 segundos
		let logsLigados = await Log.find({
			mode: "L",
			tipo: "S",
			createdAt: { $gt: moment().subtract({seconds: 30})}
		}).lean()
		//Busca os Logs de desligamento dos ultuimos 30 segundos
		let logsDesligados = await Log.find({
			mode: "D",
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
//Método para postar ocorrencia
app.post('/ocorrencia', async (req,res) => {
	let log
	if(req.body.mode === 0){
		log = new Log({
			portariaID: req.body.portariaID,
			createdAt: moment().valueOf(),
			mode: "D",
			tipo: "O"
		})
	}
	else if(req.body.mode === 2){
		log = new Log({
			portariaID: req.body.portariaID,
			createdAt: moment().valueOf(),
			mode: "Ack",
			tipo: "O"
		})
	}
	else{
		log = new Log({
			portariaID: req.body.portariaID,
			createdAt: moment().valueOf(),
			tipo: "O"
		})
	}

	try{
		let logResposta = await log.save()
		res.send(log)
	}
	catch(err){
		res.status(400).send(err)
	}
})

app.get('/ocorrencia', async (req, res) => {
	try{
		//Busca os Logs de ligamento dos ultimos 30 segundos
		let logsLigados = await Log.find({
			mode: "L",
			tipo: "O",
			createdAt: { $gt: moment().subtract({seconds: 30})}
		}).lean()
		//Busca os Logs de desligamento dos ultuimos 30 segundos
		let logsDesligados = await Log.find({
			mode: "D",
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
app.get('/logs/:id', async (req,res) => {
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
app.get('/alllogs', async (req, res) => {
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
app.post('/deletealllogs', async (req, res) => {
	try{
		if(req.body.pass === process.env.PASS){
			let log = await Log.remove({}).lean()
			res.send('Database deletado!')
		}
		else{
			res.send('Senha incorreta!')
		}
	}
	catch(err){
		res.status(400).send(err)
	}
})


//Método para cadastrar novas portarias, com seus respectivos subordinados
app.post('/portaria', async (req, res) => {
	try{
		let portaria = new Portaria({
			portariaID: req.body.portariaID,
			subordinados: req.body.subordinados
		})
		let resposta = await portaria.save()
		res.send(resposta)
	}catch(err){
		res.status(400).send(err)
	}
})

//Método para retornar todas as portarias
app.get('portarias', async (req,res) => {
	try{
		let portarias = await Portaria.find({}).lean()
		res.send(portarias)
	}catch(err){
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
