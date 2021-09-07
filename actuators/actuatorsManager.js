const Manager = require("./../common/manager");

class ActuatorsManager extends Manager {
    get() {
        return this.apiFetchReq.get('actionneurs')
            .then(data => {
                this.data = data;
            }).catch(err => {
                this.logger.log(err);
            });
    }

    post(data) {
        return this.apiFetchReq.send('POST', 'actionneurs/update', data);
    }

    update(actuator, socket) {
        if (actuator.categorie.includes("inter")) {
            this.updateInter(actuator, socket);
        }
        if (actuator.categorie.includes("dimmer")) {
            this.updateDimmerPersist(actuator, socket);
        }
    }

    setPortManager(portManager) {
        this.portManager = portManager;
    }

    updateDimmer(dimmerObject, socket, fromPersist) {
        if (dimmerObject.etat < 0 || dimmerObject.etat > 255) {
            this.logger.log('In updateDimmer : value must be between 0 and 255');
            return;
        }

        let command = [dimmerObject.module,
        dimmerObject.radioid,
        dimmerObject.etat
        ].join('/') + '/';
        this.portManager.writeAndDrain(command + '/', () => {
            if (!fromPersist) {
                socket.broadcast.emit('dimmer', dimmerObject);
                return;
            }
            this.io.sockets.emit('dimmer', dimmerObject);
        });
    }

    updateDimmerPersist(dimmerObject, socket) {
        if (typeof (dimmerObject) === 'string') {
            dimmerObject = JSON.parse(dimmerObject);
        }

        if (dimmerObject.etat < 0 || dimmerObject.etat > 255) {
            this.logger.log('In updateDimmerPersist : value must be between 0 and 255');
            return;
        }

        this.updateDimmer(dimmerObject, socket, true);
        this.post(dimmerObject).then(res => {
            if (res && res.error) {
                return this.logger.log(res.error);
            }

            this.logger.log(dimmerObject.nom + ' ' + dimmerObject.etat);
            this.io.sockets.emit("messageConsole", this.df.stringifiedHour() + " " + dimmerObject.nom + ' ' + dimmerObject.etat);
        })
            .catch(err => console.log(err));
    }

    updateInter(interObject, socket) {
        if (interObject.etat < 0 || interObject.etat > 1) {
            this.logger.log('In updateInter : value must be 0 or 1');
        }

        if (typeof (interObject) === 'string') {
            interObject = JSON.parse(interObject);
        }

        var command = this.getInterCommand(interObject);
        if (command === false) {
            this.logger.log("Unknown Actuator type " + interObject.type);
            return;
        }

        this.portManager.writeAndDrain(command + '/', () => {
            this.logger.log("update" + interObject.type + " " + interObject.nom + ' ' + interObject.etat);
            this.io.sockets.emit("messageConsole", this.df.stringifiedHour() + " " + interObject.nom + ' ' + interObject.etat);
            this.io.sockets.emit('inter', interObject);
            if (interObject.etat === 0) {
                interObject.etat = "0"
            }
            console.log(interObject);
            this.post(interObject);
        });
    }

    getInterCommand(interObject) {
        switch (interObject.type) {
            case "relay":
                return [interObject.module,
                interObject.protocole,
                interObject.adresse,
                interObject.radioid,
                interObject.etat
                ].join('/');
            case "aqua":
                return [interObject.module,
                interObject.protocole,
                interObject.adresse,
                interObject.type,
                    "set", "leds"
                ].join('/');
            default:
                return false;
        }
    }
}

module.exports = ActuatorsManager;
