var fs = require('fs'),
    ini = require('ini');

var iniFile = ini.parse(fs.readFileSync('./config/config.ini', 'utf-8'))
var isWin = /^win/.test(process.platform);
var env = "LINUX";
if (isWin === true) {
    env = "WINDOWS"
}

var config =  {
    portPath : iniFile[env].portPath,
    rootPath : iniFile[env].rootPath,
    logPath : iniFile[env].logPath,
    sep : iniFile[env].sep
}

module.exports = config;