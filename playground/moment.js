let moment = require('moment')

//console.log(`Timestamp: ${moment().valueOf()}\nData formatada: ${moment().format('MMMM Do YYYY, H:mm:ss')}`)

let formatDate = (timestamp) => {
	moment().utcOffset(-3)
	return moment(moment().valueOf()).format('H:mm:ss, D/MM/YYYY')
}


console.log(formatDate(87326287642))
