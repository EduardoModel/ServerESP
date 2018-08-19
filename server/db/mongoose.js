let mongoose = require('mongoose')

//pra setar o padrão de primises que for usar durante o código
mongoose.Promise = global.Promise
mongoose.connect(process.env.MONGODB_URI)

module.exports = {mongoose}