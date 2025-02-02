require('dotenv').config();

var config = {
    portPath: process.env.USB_PORT_PATH,
    rootPath: process.env.ROOT_PATH,
    sep: process.env.SEP,
    protocol: process.env.PROTOCOL,
    ip: process.env.IP,
    port: process.env.PORT,
    apiUri: process.env.API_BASE_URI,
    timerBeforeExecute: process.env.TIMER_BEFORE_EXECUTE,
    nodeEnv: process.env.NODE_ENV,
    chaconDioSenders: process.env.CHACON_DIO_SENDERS.split(' ')
};

module.exports = config;