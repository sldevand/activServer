class PortManager {
    constructor(port, logger, io, df) {
        this.port = port;
        this.logger = logger;
        this.io = io;
        this.df = df;
    }

    open() {
        if (this.port.isOpen) {
            return;
        }
        this.port.open(function (err) {
            if (err) {
                return console.log("Error opening port: ", err.message);
            }
        });
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

    initVirtualMode() {
        // this.port.off("dataToDevice", this.virtualWriteToComputer);
        this.port.on("dataToDevice", (data) => {
            return this.port.writeToComputer(data);
        });

        this.port.write("Virtual port activated");
    }
}

module.exports = PortManager;
