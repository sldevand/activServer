const PortManager = require("./portManager");
const df = require("./../dateFactory/dateFactory");
const config = require("./../config/config");

class VirtualPortManager extends PortManager {
    constructor(port, logger, io, df) {
        super(port, logger, io, df);
        this.dispatchAfterOpen = true;
        this.valueOnOff = false;
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
        setTimeout(() => this.sendSensors(), 1000);
        setInterval(() => this.sendSensors(), config.timerBeforeExecute || 20000);
    }

    sendSensors() {
        this.valueOnOff = !this.valueOnOff;
        let sender = config.chaconDioSenders.at(0);
        let sensors = [
            { id: "chacon-dio", valeur1: sender, valeur2: 1, valeur3: Number(this.valueOnOff) },
            { id: "chacon-dio", valeur1: sender, valeur2: 2, valeur3: Number(this.valueOnOff) },
            { id: "chacon-dio", valeur1: sender, valeur2: 3, valeur3: Number(this.valueOnOff) },
            { id: "sensor24ctn10id3", valeur1: this.randomize(18, 20), valeur2: "" },
            { id: "sensor24ctn10id4", valeur1: this.randomize(18, 20), valeur2: "" },
            { id: "sensor43dht22id1", valeur1: this.randomize(18, 20), valeur2: this.randomize(40, 60) },
        ];
        sensors.forEach((sensor) => {
            let suffix = '';
            if (sensor.hasOwnProperty('valeur3')) {
                suffix += ' ' + sensor.valeur3
            }
            this.port.write(`${sensor.id} ${sensor.valeur1} ${sensor.valeur2}${suffix}`);
        });
    }

    randomize(min, max) {
        let randFloat = Math.random() * (max - min) + min;
        return randFloat.toFixed(2);
    }
}

module.exports = VirtualPortManager;
