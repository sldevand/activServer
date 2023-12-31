const df = require('./../dateFactory/dateFactory');

class Manager {
    constructor(apiFetchReq, logger, io, df) {
        this.logger = logger;
        this.apiFetchReq = apiFetchReq;
        this.io = io;
        this.df = df;
        this.data = [];
    }

    getData() {
        return this.data;
    }

    hasError(data) {
        return data.hasOwnProperty('error');
    }

    handleError(err) {
        var fullHour = df.stringifiedHour();
        this.io.sockets.emit("messageConsole", fullHour + " " + err);
        this.io.sockets.emit("error", err);
        this.logger.log(err);
    }
}

module.exports = Manager;