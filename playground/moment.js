let moment = require('moment')

//console.log(`Timestamp: ${moment().valueOf()}\nData formatada: ${moment().format('MMMM Do YYYY, H:mm:ss')}`)

let formatDate = (timestamp) => {
	return moment().format('H:mm:ss, D/MM/YYYY')
}


console.log(formatDate(moment().valueOf()))
