var fs = require('fs'),
    ini = require('ini');

var iniFile;

try {
    iniFile = ini.parse(fs.readFileSync(__dirname + '/config.ini', 'utf-8'));
} catch (error) {
    throw new Error("Error on ini file ----> " + error);
}
var isWin = /^win/.test(process.platform);
var env = "LINUX";
if (isWin === true) {
    env = "WINDOWS"
}

var config = {
    portPath: iniFile[env].portPath,
    rootPath: iniFile[env].rootPath,
    logPath: iniFile[env].logPath,
    sep: iniFile[env].sep,
    ip: iniFile['NETWORK'].ip,
    port: iniFile['NETWORK'].port,
    apiUri:iniFile['API'].address,
    timerBeforeExecute:iniFile['DOORTHERMOSTAT'].timerBeforeExecute,
};

module.exports = config;