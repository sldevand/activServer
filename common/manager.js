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
}

module.exports = Manager;