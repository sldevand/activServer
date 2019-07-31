class PortManager {
    constructor(port) {
        this.port = port;
    }

    writeAndDrain(data, callback) {
        this.port.write(data, () => {
        });
        this.port.drain(callback);
    }
}

module.exports = PortManager;
