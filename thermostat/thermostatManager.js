const Manager = require("./../common/manager");
class ThermostatManager extends Manager {
    get() {
        return this.apiFetchReq.get('thermostat')
            .then(data => {
                if (this.hasError(data)) {
                    return Promise.reject("ActuatorsManager::get : " + data.error)
                }
                this.data = data;
            })
            .catch(err => {
                this.handleError(err);
            });
    }
}

module.exports = ThermostatManager;
