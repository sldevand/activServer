let fs = require('fs'),
    ini = require('ini');

let iniFile = ini.parse(fs.readFileSync('./config/config.ini', 'utf-8'))
var isWin = /^win/.test(process.platform);
let env = "LINUX";
if (isWin === true) {
    env = "WINDOWS"
}

let config =  {
    portPath : iniFile[env].portPath,
    rootPath : iniFile[env].rootPath,
    logPath : iniFile[env].logPath,
    sep : iniFile[env].sep
}

module.exports = config;