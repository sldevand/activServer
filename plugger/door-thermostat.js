class DoorThermostat {

    constructor() {
        this.timer;
    }

    execute(data, callback) {

        if (data.radioid !== 'sensor43cdoorid1'
            || data.timerBeforeExecute == 0
        ) {
            return data;
        }

        let state = data.temperature;

        if (state === "1") {
            this.timer = setTimeout(() => {
                this.timer = null;
                callback();
            }, data.timerBeforeExecute)
        } else {
            if (this.timer) {
                clearTimeout(this.timer);
            }
        }


        return data;
    }
}

module.exports = DoorThermostat;
