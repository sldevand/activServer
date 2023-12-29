const http = require('http');
const config = require('./config/config');
var { SerialPort } = require('serialport')
if (config.nodeEnv == 'development') {
    SerialPort = require('virtual-serialport');
}
const CronJob = require('cron').CronJob;
const Logger = require('./logger/logger-api');
const df = require('./dateFactory/dateFactory');
const APIRequest = require('./httpRequest/apiRequest');
const APIFetchRequest = require('./httpRequest/apiFetchRequest');
const Timeout = require('await-timeout');
const SensorsManager = require('./sensors/sensorsManager');
const ActuatorsManager = require('./actuators/actuatorsManager');
const ThermostatManager = require('./thermostat/thermostatManager');
let PortManager = require('./port/portManager');
if (config.nodeEnv == 'development') {
    PortManager = require('./port/virtualPortManager');
}
const DoorThermostat = require('./plugger/door-thermostat');

//SERVER INIT
var server = http.createServer();
var apiReq = new APIRequest(http, config.ip, '/' + config.apiUri + '/');
var apiFetchReq = new APIFetchRequest('http://' + config.ip + '/' + config.apiUri);
var io = require('socket.io').listen(server);
var logger = new Logger(apiFetchReq, df);

//CRONJOBS
var logRefreshCronJob = new CronJob('0 */30 * * * *', () => {
    apiReq.get('thermostat/log/refresh');
}, null, true, 'Europe/Paris');

var rtcUpdateThermostatCronJob = new CronJob('0 5 0 * * *', () => {
    updateThermostatRtc();
}, null, true, 'Europe/Paris');

resetScenariosStatuses();

//GLOBAL VARS
var capteurs = [];
var thermostats = [];
var timers = [];
const ACTIONS_DELAY = 300;
const sensorsManager = new SensorsManager(apiFetchReq, logger, io, df);
const actuatorsManager = new ActuatorsManager(apiFetchReq, logger, io, df);
const thermostatManager = new ThermostatManager(apiFetchReq, logger, io, df);
const doorThermostat = new DoorThermostat();

//SOCKETIO LISTENERS
io.sockets.on('connection', socket => {

    var clientIp = socket.request.connection.remoteAddress;
    logger.log('New connection from ' + clientIp);

    thermostatManager.get();
    actuatorsManager.get();
    sensorsManager.get();

    socket.on('messageAll', message => {
        logger.log('messageAll From : ' + clientIp + ' ' + message);
        socket.broadcast.emit("message", message);
    }).on('command', message => {
        portManager.writeAndDrain(message, () => {
        });
    }).on('updateDimmer', dimmerObject => {
        actuatorsManager.updateDimmer(dimmerObject, socket, false);
    }).on('serialportReset', () => {
        portManager.reset();
    }).on('updateDimmerPersist', dimmerObject => {
        actuatorsManager.updateDimmerPersist(dimmerObject, socket);
    }).on('updateInter', interObject => {
        actuatorsManager.updateInter(interObject, socket);
    }).on("updateScenario", scenario => {
        launchScenario(scenario, socket);
    }).on("stopScenario", scenario => {
        stopScenario(scenario);
    }).on("watchScenario", scenario => {
        watchScenarioRemainingTime(scenario);
    }).on("updateTherCons", thermostat => {
        updateThermostat(thermostat, socket, "cons");
    }).on("updateTherDelta", thermostat => {
        updateThermostat(thermostat, socket, "delta");
    }).on("updateTherTempext", thermostat => {
        updateThermostat(thermostat, socket, "temp");
    }).on("updateTherInterne", thermostat => {
        updateThermostat(thermostat, socket, "int");
    }).on("updateTherMode", id => {
        updateThermostatMode(id);
    }).on("syncTherModes", id => {
        syncThermostatModes();
    }).on("updateTherPlan", id => {
        updateThermostatPlan(id);
    }).on("refreshTher", () => {
        refreshThermostat();
    }).on("updateTherClock", id => {
        updateThermostatRtc();
    }).on("getTherClock", id => {
        getThermostatClock();
    }).on("setTherPwr", status => {
        setThermostatPower(status)
    }).on("getTherPwr", () => {
        getThermostatPower();
    }).on('disconnect', () => {
        var clientIp = socket.request.connection.remoteAddress;
        logger.log(clientIp + ' Disconnected');
    });
});
server.listen(config.port, config.ip);

var port = new SerialPort({
    path: config.portPath,
    baudRate: 9600,
    autoOpen: false
});

const portManager = new PortManager(port, logger, io, df);
portManager.open();

port.on('open', () => {
    actuatorsManager.setPortManager(portManager);
    logger.log("port " + config.portPath + " opened");
    portManager.flush();
}).on('error', err => {
    logger.log(err.message);
}).on('close', () => {
    logger.log("port " + config.portPath + " closed");
}).on('data', data => {
    var datastr = data.toString();

    if (!datastr
        || /^\s*$/.test(datastr)
        || datastr.length > 255
    ) {
        return;
    }
    datastr = datastr.replace(/[\n\r]+/g, '');
    var dataTab = datastr.split(" ");
    var dataObj = {
        radioid: dataTab[0],
        valeur1: dataTab[1],
        valeur2: dataTab[2],
        valeur3: dataTab[3],
        valeur4: dataTab[4],
        valeur5: dataTab[5],
    };
    if (dataObj.radioid.includes("sensor")) {
        sensorsManager.persist(dataTab, dataObj);
    }
    if (dataObj.radioid.includes("chacon-dio") && config.chaconDioSenders.includes(dataObj.valeur1)) {
        let actuators = actuatorsManager.getData().filter((actuator) => {
            return actuator.adresse == dataObj.valeur1 && actuator.radioid == dataObj.valeur2
        });
        for (let actuator of actuators) {
            if (actuator.etat == dataObj.valeur3) {
                continue;
            }
            actuator.etat = dataObj.valeur3
            actuatorsManager.updateInterNoSerialPort(actuator);
        }
    }
    if (dataObj.radioid.includes("thermostat") || dataObj.radioid.includes("thersel")) {
        persistThermostat(dataObj);
    }
    if (dataObj.radioid.includes("message")) {
        if (dataObj.valeur1.includes("tht")) {
            if (dataObj.valeur2.includes("spok")) {
                io.sockets.emit("therplansave", "OK");
            }
            if (dataObj.valeur2.includes("smok")) {
                io.sockets.emit("thermodesave", "OK");
            }
            if (dataObj.valeur2.includes("pow")) {
                persistThermostat(dataObj);
            }
        }
    }
    if (dataObj.radioid.includes("therclock")) {

        const mapDow = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
        var therclockStr = mapDow[dataObj.valeur1] + " " + dataObj.valeur2 + " " + dataObj.valeur3;

        io.sockets.emit("therclock", therclockStr);
    }

    var fullHour = df.stringifiedHour();
    io.sockets.emit("messageConsole", fullHour + " " + datastr);
    logger.log(datastr);
});

function resetScenariosStatuses() {
    apiFetchReq.get('scenarios/reset')
        .then((json) => {
            if (json.hasOwnProperty('error')) {
                return Promise.reject(json.error)
            }
            logger.log(json.success);
        })
        .catch(err => {
            logger.log(err);
        });
}

function launchScenario(pScenario, socket) {
    if (typeof (pScenario) === "undefined") {
        logger.log("malformed scenario = " + pScenario);
        return
    }

    if (typeof (pScenario) === 'string') {
        pScenario = JSON.parse(pScenario);
    }

    let timer = new Timeout();
    apiFetchReq.get('scenarios', pScenario.id)
        .then((scenario) => {
            if (scenario.status === 'play') {
                let logData = 'Scenario ' + scenario.nom + ' is running';
                io.sockets.emit("messageConsole", df.stringifiedHour() + logData);
                watchScenarioRemainingTime(scenario);

                return Promise.reject(logData);
            }
            return changeScenarioStatus(scenario, 'play')
        })
        .then((scenario) => {
            logScenarioChanges(scenario);
            scenario.startTime = Date.now();
            scenario.stopTime = scenario.startTime + getScenarioTotalTimeout(scenario);
            timers.push({
                'scenario': scenario,
                'timer': timer,
                'watcher': setInterval(() => {
                    watchScenarioRemainingTime(scenario);
                }, 5000)
            });
            watchScenarioRemainingTime(scenario);
            return processSequenceItems(scenario, socket, timer);
        })
        .then((scenario) => {
            stopScenario(scenario);
        })
        .catch((err) => {
            logger.log(err);
        });
}

function stopScenario(scenario) {
    changeScenarioStatus(scenario, 'stop')
        .then(scenario => {
            if (scenario.hasOwnProperty('error')) {
                return Promise.reject(scenario.error);
            }
            logScenarioChanges(scenario);
            for (let key in timers) {
                if (timers[key].scenario.id !== scenario.id) {
                    continue;
                }
                clearTimer(key);
                return;
            }
        })
        .catch((err) => {
            clearTimers();
            logger.log(err);
        });
}

function clearTimers() {
    for (let key in timers) {
        io.sockets.emit("scenarioFeedback", timers[key].scenario);
        clearTimer(key);
    }
    resetScenariosStatuses();
}

function clearTimer(key) {
    timers[key].timer.clear();
    clearTimeout(timers[key].watcher);
    logger.log('Scenario ' + timers[key].scenario.nom + ' timer is cleared');
    timers.splice(key, 1);
}

function watchScenarioRemainingTime(scenario) {
    let obj = timers.find(o => o.scenario.id === scenario.id);
    if (!obj) {
        logger.log('no obj found');
        return;
    }
    scenario.remainingTime = obj.scenario.stopTime - Date.now();
    io.sockets.emit("scenarioFeedback", scenario);

}

async function changeScenarioStatus(scenario, status) {
    scenario.status = status;
    let scenarioEmit = {
        "id": scenario.id,
        "status": scenario.status
    };
    io.sockets.emit("scenarioStatusChange", scenarioEmit);
    return await apiFetchReq.send('PUT', 'scenarios/update', scenario);
}

function logScenarioChanges(scenario) {
    let logData = 'Scenario ' + scenario.nom + ' ' + scenario.status;
    io.sockets.emit("messageConsole", df.stringifiedHour() + " " + logData);
    io.sockets.emit("scenarioFeedback", scenario);
    logger.log(logData);
}

async function processSequenceItems(scenario, socket, timer) {
    let items = flattenSequences(scenario);
    for (let item of items) {
        await updateAction(item, socket, timer);
        timer.clear();
    }
    return await scenario;
}

function getScenarioTotalTimeout(scenario) {
    let items = flattenSequences(scenario);
    let total = 0;
    for (let item of items) {
        total += item.timeout * 1000;
    }

    return total;
}

async function updateAction(action, socket, timer) {
    let actionneur = action.actionneur;
    actionneur.etat = action.etat;
    action.timeout *= 1000;
    if (action.timeout < ACTIONS_DELAY) {
        await Timeout.set(ACTIONS_DELAY);
    }

    return timer.set(action.timeout)
        .then(() => {
            actuatorsManager.update(actionneur, socket);
        })
        .catch(err => {
            logger.log(err)
        });
}

function flattenSequences(scenario) {
    var items = [];
    for (let idx in scenario.sequences) {
        for (let idxAction in scenario.sequences[idx].actions) {
            items.push(scenario.sequences[idx].actions[idxAction]);
        }
    }

    return items;
}

function updateThermostat(thermostat, socket, part) {

    if (typeof (thermostat) !== 'string' || !part.includes("cons")) {
        logger.log("given value is null");
        return;
    }

    thermostat = JSON.parse(thermostat);
    var val = thermostat.consigne;
    var commande = ["nrf24", "node", "2Nodw", "ther", "set", part, val].join('/');
    portManager.writeAndDrain(commande + '/', () => {
    });
}

function updateThermostatRtc() {
    var date = new Date();

    var dow = date.getDay();
    var d = date.getDate();
    var m = date.getMonth() + 1;
    var y = date.getFullYear();
    var h = date.getHours();
    var i = date.getMinutes();
    var s = date.getSeconds();
    var commande = ["nrf24", "node", "2Nodw", "ther", "put", "rtc", dow, y, m, d, h, i, s].join('/');
    portManager.writeAndDrain(commande + '/', () => {
    });
}

function getThermostatClock() {
    var commande = ["nrf24", "node", "2Nodw", "ther", "get", "rtc"].join('/');
    portManager.writeAndDrain(commande + '/', () => {
    });
}

function refreshThermostat() {
    var commande = ["nrf24", "node", "2Nodw", "ther", "get", "info"].join('/');
    portManager.writeAndDrain(commande + '/', () => {
    });
}

function setThermostatPower(status) {
    var commande = ["nrf24", "node", "2Nodw", "ther", "set", "pwr", status].join('/');
    portManager.writeAndDrain(commande + '/', () => {
    });
}

function getThermostatPower() {
    var commande = ["nrf24", "node", "2Nodw", "ther", "get", "pwr"].join('/');
    portManager.writeAndDrain(commande + '/', () => {
    });
}

function persistThermostat(dataObj) {
    apiReq.get('thermostat', (res) => {
        res.setEncoding('utf8');
        var rawData = '';
        res.on('data', (chunk) => {
            rawData += chunk;
        });
        res.on('end', () => {
            thermostats = JSON.parse(rawData);
            thermostats.forEach((thermostat, index) => {
                if (dataObj.radioid.includes("thermostat")) {
                    thermostat.consigne = dataObj.valeur1;
                    thermostat.delta = dataObj.valeur2;
                    thermostat.interne = dataObj.valeur4;
                    thermostat.etat = dataObj.valeur5;
                    io.sockets.emit('thermostat', thermostat);
                }

                if (dataObj.radioid.includes("thersel")) {
                    thermostat.modeid = dataObj.valeur1;
                    thermostat.planning = dataObj.valeur2;
                    io.sockets.emit('thersel', thermostat);
                }

                if (dataObj.radioid.includes("message")
                    && dataObj.valeur1.includes("tht")
                    && dataObj.valeur2.includes("pow")
                ) {
                    thermostat.pwr = dataObj.valeur3
                    io.sockets.emit("therpowget", thermostat);
                }
                delete thermostat.sensor;
                delete thermostat.mode;
                apiReq.post('thermostat/update', thermostat);
            });
        });
    });
}

function updateThermostatMode(id) {

    if (id === null || id <= 0 || id >= 254) {
        logger.log("given value is null or out of bounds");
        return;
    }

    apiReq.get("thermostat/mode/" + parseInt(id, 10), (res) => {
        res.setEncoding('utf8');
        var rawData = '';
        res.on('data', (chunk) => {
            rawData += chunk;
        });
        res.on('end', () => {
            var mode = JSON.parse(rawData);
            var commande = ["nrf24", "node", "2Nodw", "ther", "sel", "mode", mode.id].join('/');
            portManager.writeAndDrain(commande + '/', () => {
            });
            setTimeout(() => {
                let saveModecommand = ["nrf24", "node", "2Nodw", "ther", "save", "mode"].join('/');
                portManager.writeAndDrain(saveModecommand + '/', () => {
                });
            }, 2000);
        });
    });
}

function syncThermostatModes() {
    var time = 0;
    apiReq.get("thermostat/mode/", (res) => {
        res.setEncoding('utf8');
        var rawData = '';
        res.on('data', (chunk) => {
            rawData += chunk;
        });

        res.on('end', () => {
            var timeoutDuration = 300;
            var modes = objToArray(JSON.parse(rawData));
            var iter = 0;

            modes.forEach(mode => {
                setTimeout(() => {
                    var commande = ["nrf24", "node", "2Nodw", "ther", "put", "mode", mode.id, mode.consigne, mode.delta].join('/');
                    portManager.writeAndDrain(commande + '/', () => {
                    });

                    if (iter >= modes.length - 1) {
                        setTimeout(() => {
                            var commande = ["nrf24", "node", "2Nodw", "ther", "save", "mode"].join('/');
                            portManager.writeAndDrain(commande + '/', () => {
                            });
                            logger.log('Saving thermostat modes');
                        }, 500);
                    }
                    iter++;
                }, time * timeoutDuration);
                time++;
            });
        });
    });
}

function objToArray(obj) {
    var objArray = [];
    for (var idx in obj) {
        objArray.push(obj[idx]);
    }
    return objArray;
}

function updateThermostatPlan(id) {
    var time = 0;

    if (id === null || id < 0 || id >= 254) {
        logger.log("given value is null or out of bounds");
        return;
    }

    if (id == 0) {
        var commande = ["nrf24", "node", "2Nodw", "ther", "set", "plan", id].join('/');
        portManager.writeAndDrain(commande + '/', () => {
        });
        return;
    }

    apiReq.get("thermostat/planif/" + parseInt(id, 10), (res) => {
        res.setEncoding('utf8');
        var rawData = '';
        res.on('data', (chunk) => {
            rawData += chunk;
        });

        res.on('end', () => {
            var plans = objToArray(JSON.parse(rawData));
            let setPlanCommand = ["nrf24", "node", "2Nodw", "ther", "set", "plan", parseInt(id)].join('/') + '/';
            portManager.writeAndDrain(setPlanCommand, () => {
            });

            const TIME_BETWEEN_PLANS = 400;
            setTimeout(() => {
                plans.forEach(plan => {
                    setTimeout(() => {
                        let putPlanCommandArray = ["nrf24", "node", "2Nodw", "ther", "put", "plan", plan.jour];
                        plan.timetable = plan.timetable.replace(/-/g, '');
                        let timetable = JSON.parse(plan.timetable);
                        let putPlanCommand = putPlanCommandArray.concat(timetable).join('/') + '/';

                        portManager.writeAndDrain(putPlanCommand, () => {
                        });

                        if (parseInt(plan.jour) < 7) {
                            return;
                        }
                    }, time * TIME_BETWEEN_PLANS);
                    time++;
                });

                setTimeout(() => {
                    let savePlanCommand = ["nrf24", "node", "2Nodw", "ther", "save", "plan"].join('/') + '/';
                    console.log(savePlanCommand)
                    portManager.writeAndDrain(savePlanCommand, () => {
                        logger.log("savePlan ok");
                    });
                }, 10 * TIME_BETWEEN_PLANS);

            }, 500);
        });
    });
}
