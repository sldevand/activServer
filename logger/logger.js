var fs = require('fs');
var config = require('../config/config.ini');
var df = require('../dateFactory/dateFactory');

//JOURNAL D'EVENEMENTS
function logToFile(filename, data, output) {
    var fullHour = df.stringifiedHour();

    if (output === true) {
        console.log(fullHour + " " + data);
    }
    fs.appendFile(filename, fullHour + " " + data + '\n', function (err) {
        if (err) throw err;
    });
}

function log(data){
    logToFile(config.rootPath + config.logPath, data, true);
}

exports.logToFile = logToFile;
exports.log = log;