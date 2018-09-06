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

//Método para postar os logs
app.post('/logs', (req, res) => {
	//Pra transformar de string para um objeto
	let log
	if(req.body.mode === 0){
		log = new Log({
			portariaID: req.body.portariaID,
			createdAt: moment().valueOf(),
			mode: "DesligaGiroled"
		})
	}
	else{
		log = new Log({
			portariaID: req.body.portariaID,
			createdAt: moment().valueOf()
		})
	}

	log.save().then((log) => {
		res.send(log)
	}, (err) => {
		res.status(400).send(err)
	})
})

//Método para pegar todos os logs
app.get('/logs', (req, res) => {
	Log.find({}).lean().then((logs) => {
		logs.forEach((log) => {
			log.date = formatDate(log.createdAt)
		})
		res.send({logs})
	}, (err) => {
		res.status(400).send(err)
	})	
})

//Método para postar o botão do pânico
app.post('/logs/panic', (req,res) => {
	let log = new Log({
		portariaID: req.body.portariaID,
		createdAt: moment().valueOf(),
		mode: 'Pânico'	//Modo 2 é para o pânico
	})
	log.save().then((log) => {
		res.send(log)
	}, (err) => {
		res.status(400).send(err)
	})
})

app.get('/logs/panic', (req,res) => {
	let panicLogs = []
	Log.find({
		mode: 'Pânico'
	}).lean().then((logs) => {
		logs.forEach((log) => {
			if((log.createdAt - moment().subtract({seconds: 30})) > 0){
				panicLogs.push(log)
			}
		})
		res.send(panicLogs)
	}, (err) => {
		res.status(400).send(err)
	})
})


//Método para pegar os logs por id de portaria
app.get('/logs/:id', (req,res) => {
	Log.find({
		portariaID: req.params.id
	}).lean().then((logs) => {
		logs.forEach((log) => {
			log.date = formatDate(log.createdAt)
		})
		res.send({logs})
	}, (err) => {
		res.status(400).send(err)
	})
})


app.listen(port, () => {
	console.log(`O app está escutando na porta ${port}!`)
})

module.exports = {
	app
}

// ./mongod --dbpath ~/mongo-data ->  pra iniciar o database
