require('./config/config.js')
let moment = require('moment')
let bodyParser = require('body-parser')


const express = require('express')
const {ObjectID} = require('mongodb')


let {mongoose} = require('./db/mongoose.js')

let {Log} = require('./models/log.js')

const app = express()

app.use(bodyParser.json())

const port = process.env.PORT

let formatDate = (timestamp) => {
	return moment(timestamp).utcOffset(-3).format('HH:mm:ss, DD/MM/YYYY')
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
		console.log(logsLigados)
		//Busca os Logs de desligamento dos ultuimos 30 segundos
		let logsDesligados = await Log.find({
			mode: "D",
			createdAt: { $gt: moment().subtract({seconds: 30})}
		}).lean()
		//Itera no vetor de logs de desligamento para filtrar os logs de ligamento
		logsDesligados.forEach((logDesligado) => {
			logsLigados = logsLigados.filter((logLigado) => {
				return logLigado.portariaID !== logDesligado.portariaID
				|| logLigado.createdAt.valueOf() > logDesligado.createdAt.valueOf()
			})
		})
		let logsFormatatos = []

		logsLigados.forEach((logLigado) => {
			logsFormatatos.push({
				portariaID: logLigado.portariaID,
				data: formatDate(logLigado.createdAt)
			})
		})


		res.send(logsFormatatos)
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
		console.log(logsLigados)
		//Busca os Logs de desligamento dos ultuimos 30 segundos
		let logsDesligados = await Log.find({
			mode: "D",
			createdAt: { $gt: moment().subtract({seconds: 30})}
		}).lean()
		//Itera no vetor de logs de desligamento para filtrar os logs de ligamento
		logsDesligados.forEach((logDesligado) => {
			logsLigados = logsLigados.filter((logLigado) => {
				return logLigado.portariaID !== logDesligado.portariaID
				|| logLigado.createdAt.valueOf() > logDesligado.createdAt.valueOf()
			})
		})

		let logsFormatatos = []

		logsLigados.forEach((logLigado) => {
			logsFormatatos.push({
				portariaID: logLigado.portariaID,
				data: formatDate(logLigado.createdAt)
			})
		})


		res.send(logsFormatatos)
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
		}
		res.status(400).send('Database deletado!')
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
