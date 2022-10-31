class PortManager {
    constructor(port, logger, io, df) {
        this.port = port;
        this.logger = logger;
        this.io = io;
        this.df = df;
    }

    open() {
        this.port.open();
    }

    flush() {
       this.port.flush();
    }

    writeAndDrain(data, callback) {
        this.port.write(data);
        this.port.drain(callback);
    }

    reset() {
        let dataStr = 'Resetting serialPort...';
        this.logger.log(dataStr);
        this.io.sockets.emit("messageConsole", this.df.stringifiedHour() + " " + dataStr);
        this.port.close(() => {
            this.port.open();
        });
    }
}

module.exports = PortManager;
