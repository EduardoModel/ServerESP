let moment = require('moment')

//console.log(`Timestamp: ${moment().valueOf()}\nData formatada: ${moment().format('MMMM Do YYYY, H:mm:ss')}`)

let formatDate = (timestamp) => {
	return moment(moment().valueOf()).utcOffset(-3).format('H:mm:ss, D/MM/YYYY')
}


console.log(formatDate(87326287642))
