class PortManager {
    constructor(port, logger, io, df) {
        this.port = port;
        this.logger = logger;
        this.io = io;
        this.df = df;
    }

    open() {
        if (this.port.isOpen) {
            this.afterOpen();
            return;
        }
        var that = this;
        this.port.open(function (err) {
            if (err) {
                return console.log("Error opening port: ", err.message);
            }
            that.afterOpen();
        });
    }

    afterOpen() {
        return;
    }

    flush() {
        this.port.flush();
    }

    writeAndDrain(data, callback) {
        this.port.write(data);
        this.port.drain(callback);
    }

    reset() {
        let dataStr = "Resetting serialPort...";
        this.logger.log(dataStr);
        this.io.sockets.emit("messageConsole", this.df.stringifiedHour() + " " + dataStr);
        this.port.close((err) => {
            this.open();
        });
    }
}

module.exports = PortManager;
