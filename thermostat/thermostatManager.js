const Manager = require("./../common/manager");
class ThermostatManager extends Manager {
    get() {
        return this.apiFetchReq.get('thermostat')
            .then(data => {
                this.data = data;
            })
            .catch(err => {
                this.logger.log(err);
            });
    }
}

module.exports = ThermostatManager;
