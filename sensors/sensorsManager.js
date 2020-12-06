const Manager = require("./../common/manager");
class SensorsManager extends Manager{
    get() {
        return this.apiFetchReq.get('mesures/get-sensors')
            .then(data => {
                this.data = data;
            }).catch(err => {
                this.logger.log(err);
            });
    }

    persist(dataTab, dataObj) {
        var uri = 'mesures/add-' + dataObj.radioid + '-' + dataObj.valeur1;
        if (dataTab.length > 2) uri += '-' + dataObj.valeur2;
        return this.apiFetchReq.get(uri)
            .then(data => {
                this.emit(dataObj);
            });
    }

    persistChacon(dataObj) {
        var uri = 'mesures/addchacondio-' + dataObj.valeur1 + ' ' + dataObj.valeur2 + "-" + dataObj.valeur3;

        return this.apiFetchReq.get(encodeURI(uri))
            .then(data => {
                this.emit(dataObj);
                return data;
            });
    }

    emit(dataObj) {
        this.data.forEach((sensor) => {
            if (sensor.radioid !== dataObj.radioid) {
                return;
            }
            sensor.valeur1 = dataObj.valeur1;
            sensor.valeur2 = dataObj.valeur2;
            if (undefined === sensor.valeur2) {
                sensor.valeur2 = "";
            }
            sensor.releve = this.df.nowDatetime();
            sensor.actif = 1;
            let eventName = "";
            if (dataObj.radioid.includes("ctn10") ||
                dataObj.radioid.includes("dht11")) {
                eventName = 'thermo';
            } else if (dataObj.radioid.includes("tinfo")) {
                eventName = 'teleinfo';
            } else if (dataObj.radioid.includes("therm")) {
                eventName = 'chaudiere';
            } else if (dataObj.radioid.includes("chacon-dio")) {
                eventName = 'chacon-dio';
            }

            if (eventName === "") {
                return;
            }
            this.io.sockets.emit(eventName, sensor);
        });
    }
}

module.exports = SensorsManager;