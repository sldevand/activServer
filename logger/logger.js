var fs = require('fs');
var df = require('../dateFactory/dateFactory');

//JOURNAL D'EVENEMENTS
function logToFile(filename,data,output){
	var fullHour=df.stringifiedHour();

	if(output===true){console.log(fullHour+" "+data);}
	fs.appendFile(filename,fullHour+" "+data+'\n',function(err){
		if(err) throw err;
	});
}

exports.logToFile = logToFile;