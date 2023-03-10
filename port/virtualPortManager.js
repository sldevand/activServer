const PortManager = require("./portManager");
const df = require("./../dateFactory/dateFactory");

class VirtualPortManager extends PortManager {
    constructor(port, logger, io, df) {
        super(port, logger, io, df);
        this.dispatchAfterOpen = true;
    }

    afterOpen() {
        if (!this.dispatchAfterOpen) {
            return;
        }
        this.port.on("dataToDevice", (data) => {
            return this.port.writeToComputer(data);
        });

        setTimeout(() => this.port.write("Virtual port activated"), 10);
        this.initVirtualSensors();
        this.dispatchAfterOpen = false;
    }

    writeAndDrain(data, callback) {
        console.log(`sent to virtualSerialPort : ${data}`);
        this.handleData(data);
        return "";
    }

    handleData(data) {       
        if (data === "nrf24/node/2Nodw/ther/get/rtc/" || data.includes("nrf24/node/2Nodw/ther/put/rtc")) {
            this.port.write(`therclock ${new Date().getDay()} ${df.nowDatetime("/")}`);
        }
    }

    initVirtualSensors() {
        setTimeout(() => this.sendSensors(), 500);
        setInterval(() => this.sendSensors(), 20000);
    }

    sendSensors() {
        let sensors = [
            { id: "sensor24thermid1", valeur1: this.randomize(18, 20), valeur2: this.randomize(40, 60) },
            { id: "sensor24ctn10id3", valeur1: this.randomize(18, 20), valeur2: "" },
            { id: "sensor24ctn10id4", valeur1: this.randomize(18, 20), valeur2: "" },
            { id: "sensor43dht22id1", valeur1: this.randomize(18, 20), valeur2: this.randomize(40, 60) },
        ];
        sensors.forEach((sensor) => {
            this.port.write(`${sensor.id} ${sensor.valeur1} ${sensor.valeur2}`);
        });
    } 

    randomize(min, max) {
        let randFloat = Math.random() * (max - min) + min;
        return randFloat.toFixed(2);
    }
}

module.exports = VirtualPortManager;
