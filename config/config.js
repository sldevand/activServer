var fs = require('fs'),
    ini = require('ini');

var iniFile;

try {
    iniFile = ini.parse(fs.readFileSync('./config/config.ini', 'utf-8'));
} catch (error) {    
    throw new Error("Error on ini file ----> "+error);
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
    sep: iniFile[env].sep
}

module.exports = config;