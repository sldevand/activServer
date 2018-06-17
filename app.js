//OS DETECTION
var isWin = /^win/.test(process.platform);
var portPath,rootPath,logPath,sep;

if(isWin===true){
	portPath='com6';
	rootPath="C:\\wamp64\\www\\";
	logPath='activServer\\log.txt';
	sep='\\';
}else{
	portPath='/dev/ttyUSB0';
	rootPath='/home/pi/';
	logPath='activServer/log.txt';
	sep='/';
}

//REQUIRE DEPENDENCIES
var http = require('http');
var fs = require('fs');
var SerialPort = require('serialport');
var CronJob = require('cron').CronJob;
var logger = require('./logger/logger');
var df = require('./dateFactory/dateFactory');
var APIRequest=require('./httpRequest/apiRequest');



//SERVER INIT
var server = http.createServer();
var apiReq = new APIRequest(http,'localhost','/activapi.fr/api/');

//SOCKETIO
var io = require('socket.io').listen(server);

//CRONJOBS
var logRefreshCronJob = new CronJob('0 */30 * * * *', function() {
	apiReq.get('thermostat/log/refresh');
}, null, true, 'Europe/Paris');

//GLOBAL VARS
var actionneurs=[];
var capteurs=[];
var thermostats=[];
var thermoplanifs=[];


//SOCKETIO LISTENERS
io.sockets.on('connection', function (socket) {

	//LOG DE CONNEXION DU CLIENT
 	var clientIp = socket.request.connection.remoteAddress;
	logger.logToFile( rootPath+logPath,'New connection from ' + clientIp,true);

	//DEMANDE DES ACTIONNEURS
	apiReq.get('actionneurs/',(res)=>{
		res.setEncoding('utf8');
			var rawData = '';
			res.on('data', (chunk) => {
			rawData += chunk;
			actionneurs = JSON.parse(rawData);
		});
	});
	//DEMANDE DES CAPTEURS
	apiReq.get('mesures/get-sensors',(res)=>{
		res.setEncoding('utf8');
			var rawData = '';
			res.on('data', (chunk) => {
			rawData += chunk;
			capteurs = JSON.parse(rawData);
		});
	});

	//DEMANDE DU THERMOSTAT
	apiReq.get('thermostat',(res)=>{
		res.setEncoding('utf8');
			var rawData = '';
			res.on('data', (chunk) => {
			rawData += chunk;
			thermostats = JSON.parse(rawData);
		});
	});

	//EVENTS SOCKETS

	//EVENT TOUTS MESSAGES
	socket.on('messageAll',function(message){
		logger.logToFile( rootPath+logPath,'messageAll From : ' + clientIp + ' '+ message,true);
		socket.broadcast.emit("message",message);

	})

	socket.on('command',function(message){
		writeAndDrain(message,function(){});
	})

	//EVENT UPDATE DU DIMMER
	socket.on('updateDimmer', function (dimmerObject) {
		updateDimmer(dimmerObject,socket,false);
	});

	//EVENT UPDATE DU DIMMER ET PERSISTANCE
	socket.on('updateDimmerPersist', function (dimmerObject) {
		updateDimmerPersist(dimmerObject,socket);
	});

	//EVENT UPDATE DE L'INTER
	socket.on('updateInter', function (interObject) {
		updateInter(interObject,socket);
	});

	//EVENTS SCENARIOS
	socket.on("updateScenario",function(scenario){
		updateScenario(scenario,socket);
	});

	//EVENT THERMOSTAT CONSIGNE
	socket.on("updateTherCons",function(thermostat){
		updateThermostat(thermostat,socket,"cons");
	});
	//EVENT THERMOSTAT DELTA
	socket.on("updateTherDelta",function(thermostat){
		updateThermostat(thermostat,socket,"delta");
	});
	//EVENT THERMOSTAT TEMPEXT
	socket.on("updateTherTempext",function(thermostat){
		updateThermostat(thermostat,socket,"temp");
	});
	//EVENT THERMOSTAT INTERNE
	socket.on("updateTherInterne",function(thermostat){
		updateThermostat(thermostat,socket,"int");
	});

	//EVENT THERMOSTAT MODE
	socket.on("updateTherMode",function(id){
		updateThermostatMode(id);
	});

	//EVENT SYNC THERMOSTAT MODES
	socket.on("syncTherModes",function(id){
		syncThermostatModes();
	});
	//EVENT THERMOSTAT PLANNING
	socket.on("updateTherPlan",function(id){
		updateThermostatPlan(id);
	});

	//EVENT THERMOSTAT
	socket.on("refreshTher",function(){
		refreshThermostat();
	});

	//EVENT THERMOSTAT PLANNING
	socket.on("updateTherClock",function(id){
		updateThermostatRtc();
	});

	//EVENT UPDATE THERCLOCK
	socket.on("getTherClock",function(id){
		getThermostatClock();
	});

	//EVENT THERMOSTAT PLANNING
	socket.on("updateAquaClock",function(id){
		updateAquariumClock();
	});

	//EVENT UPDATE THERCLOCK
	socket.on("getAquaClock",function(id){
		getAquariumClock();
	});


	//EVENT ET LOG DE DECONNEXION DU SOCKET
	socket.on('disconnect', function() {
		var clientIp = socket.request.connection.remoteAddress;
 		logger.logToFile( rootPath+logPath,clientIp+' Disconnected',true);
   	});
});

//ECOUTE SUR PORT 5901
server.listen(5901);

//OUVERTURE SERIALPORT
var port = new SerialPort(portPath, {
  	baudRate: 9600
});

//EVENT OUVERTURE DU SERIALPORT
port.on('open', function() {
	logger.logToFile( rootPath+logPath,"port "+portPath+" opened",true);
});

//EVENT ERREUR SUR LE SERIALPORT
port.on('error', function(err) {
  	logger.logToFile( rootPath+logPath,err.message,true);
});

//EVENT FERMETURE DU SERIALPORT
port.on('close',function(){
	logger.logToFile( rootPath+logPath,"port "+portPath+" closed",true);
});

//EVENT DONNEES ARRIVANT SUR SERIALPORT
port.on('data', function (data) {

	//Split des donnees
	var datastr = data.toString();
	datastr = datastr.replace(/[\n\r]+/g, '');
	var dataTab = datastr.split(" ");

	//Varibles d'horodatage
	var dataObj={'radioid':dataTab[0],
		    'valeur1':dataTab[1],
		    'valeur2':dataTab[2],
		    'valeur3':dataTab[3],
		    'valeur4':dataTab[4],
		    'valeur5':dataTab[5]
		};


	//Persistance des sensors
	if(dataObj.radioid.includes("sensor")){
		persistSensor(dataTab,dataObj);
	}

	//Persistance du thermostat
	if(dataObj.radioid.includes("thermostat") || dataObj.radioid.includes("thersel")){
 		persistThermostat(dataObj);
 	}

 	if(dataObj.radioid.includes("message")){
 		 if(dataObj.valeur1.includes("tht")){
 			if(dataObj.valeur2.includes("spok")){
 				io.sockets.emit("therplansave","OK");
 			}
 		}
 	}

	if(dataObj.radioid.includes("therclock")){

		 dataStr = dataObj.valeur1 + " " + dataObj.valeur2;
		 io.sockets.emit("therclock",dataStr);
 	}

	//Log
	if(datastr!=""){
		var fullHour=df.stringifiedHour();
		io.sockets.emit("messageConsole",fullHour+ " " +datastr);
		logger.logToFile( rootPath+logPath,datastr,true);
	}
});

function updateActionneur(actionneur,socket){
	if(actionneur.categorie.includes("inter")){
		updateInter(actionneur,socket);
	}
	if(actionneur.categorie.includes("dimmer")){
		updateDimmerPersist(actionneur,socket);
	}
}

//UPDATE DU DIMMER
function updateDimmer(dimmerObject,socket,fromPersist){

	if(dimmerObject.etat>=0 && dimmerObject.etat<=255 ){
		var commande = [dimmerObject.module,
        		dimmerObject.radioid,
			dimmerObject.etat].join('/')+'/';
		writeAndDrain(commande+'/',function(){
			var clientIp = socket.request.connection.remoteAddress;

			if(!fromPersist) socket.broadcast.emit('dimmer', dimmerObject);
			else io.sockets.emit('dimmer', dimmerObject);


		});
	}else{
		logger.logToFile( rootPath+logPath,
		'In updateDimmer : value must be between 0 and 255',
		true);
	}
}

function updateDimmerPersist(dimmerObject,socket){

	if(typeof(dimmerObject)==='string'){
		dimmerObject=JSON.parse(dimmerObject);
	}
	if(dimmerObject.etat>=0 && dimmerObject.etat<=255 ){
		updateDimmer(dimmerObject,socket,true);
		apiReq.post('actionneurs/update',dimmerObject);
		logger.logToFile( rootPath+logPath,dimmerObject.nom + ' ' + dimmerObject.etat,true);
		io.sockets.emit("messageConsole",df.stringifiedHour()+ " " +dimmerObject.nom + ' ' + dimmerObject.etat);

       	}else{
		logger.logToFile( rootPath+logPath,
			'In updateDimmerPersist : value must be between 0 and 255',
			true);
	}
}


//UPDATE INTER
function updateInter(interObject,socket){
	if(typeof(interObject)==='string'){
		interObject=JSON.parse(interObject);
	}
	var commande;
	if(interObject.etat>=0 && interObject.etat<=1){

		switch(interObject.type){
			case "relay":
				commande = [interObject.module,
				interObject.protocole,
				interObject.adresse,
				interObject.radioid,
				interObject.etat].join('/');
				break;
			case "aqua":

				commande = [interObject.module,
				interObject.protocole,
				interObject.adresse,
				interObject.type,
				"set","leds"].join('/');
				break;
			default:
				logger.logToFile( rootPath+logPath,"Unknown Actuator type "+ interObject.type,true);
				return;

		}

		logger.logToFile( rootPath+logPath,"update"+interObject.type+" "+interObject.nom,true);
		writeAndDrain(commande+'/',function(){});
		io.sockets.emit("messageConsole",df.stringifiedHour()+ " " +interObject.nom + ' ' +interObject.etat);
		io.sockets.emit('inter', interObject);
		apiReq.post('actionneurs/update',interObject);
	}else{
		logger.logToFile( rootPath+logPath,
			'In updateInter : value must be 0 or 1',
			true);
	}
}

//UPDATE SCENARIOS
var lastCall=new Date().getTime();
function updateScenario(scenario,socket){

	var now = new Date().getTime();

	var diff = now - lastCall;

	if(diff>2000){
		var time=0;

		if(typeof(scenario)==='string'){
			scenario=JSON.parse(scenario);
		}

		if (typeof scenario != "undefined"){
			io.sockets.emit("messageConsole",df.stringifiedHour()+'updateScenario '+ scenario.nom);
			logger.logToFile( rootPath+logPath,'updateScenario '+ scenario.nom,true);
			var items = [];
			for(var idx in scenario.data) {
				items.push(scenario.data[idx]);
			}

			items.forEach(function(val){
				setTimeout(function(){updateActionneur(val,socket);},time*500);
				time++;
			});

			lastCall= new Date().getTime();

		}else{
			logger.logToFile( rootPath+logPath,"malformed scenario = "+scenario,true);
		}
	}else{
		logger.logToFile( rootPath+logPath,"Please wait before two scenarios calls",true);

	}
}

//THERMOSTAT
function updateThermostat(thermostat,socket,part) {

	if(typeof(thermostat)==='string'){
		thermostat=JSON.parse(thermostat);
	}

	var val=null;
	if(part.includes("cons")){
		val=thermostat.consigne;
	}

	if(val!=null) {
		var commande = ["nrf24","node","2Nodw","ther","set",part,val].join('/');

		writeAndDrain(commande+'/',function(){});

	}else{
		logger.logToFile( rootPath+logPath,"given value is null",true);
	}
}

function updateAllThermostat(thermostat,socket){

	updateThermostat(thermostat,socket,"cons");
	updateThermostat(thermostat,socket,"delta");

}


function updateThermostatRtc(){
 //nrf24/node/2Nodw/ther/put/rtc/2018/02/15/15/34/22/
  var date = new Date();


	var d = date.getDate();
	var m = date.getMonth()+1;
	var y = date.getFullYear();
	var h = date.getHours();
	var i = date.getMinutes();
	var s = date.getSeconds();

	var commande = ["nrf24","node","2Nodw","ther","put","rtc",y,m,d,h,i,s].join('/');
	writeAndDrain(commande+'/',function(){});
}

function getThermostatClock(){
	var commande = ["nrf24","node","2Nodw","ther","get","rtc"].join('/');
	writeAndDrain(commande+'/',function(){});
}

function updateAquariumClock(){
 //nrf24/node/3Nodw/aqua/put/rtc/2018/02/15/15/34/22/
  var date = new Date();


	var d = date.getDate();
	var m = date.getMonth()+1;
	var y = date.getFullYear();
	var h = date.getHours();
	var i = date.getMinutes();
	var s = date.getSeconds();

	var commande = ["nrf24","node","3Nodw","aqua","put","rtc",y,m,d,h,i,s].join('/');
	writeAndDrain(commande+'/',function(){});
}

function getAquariumClock(){
	var commande = ["nrf24","node","3Nodw","aqua","get","rtc"].join('/');
	writeAndDrain(commande+'/',function(){});
}



function refreshThermostat(){
	var commande = ["nrf24","node","2Nodw","ther","get","info"].join('/');
	writeAndDrain(commande+'/',function(){});
}



//THERMOSTAT PERSISTANCE
function persistThermostat(dataObj){

  apiReq.get('thermostat',(res)=>{
        res.setEncoding('utf8');
        var rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
          thermostats = JSON.parse(rawData);
	  thermostats.forEach(function (thermostat,index){

		if(dataObj.radioid.includes("thermostat")){
			thermostat.consigne=dataObj.valeur1;
			thermostat.delta=dataObj.valeur2;
			thermostat.interne=dataObj.valeur4;
			thermostat.etat=dataObj.valeur5;
			io.sockets.emit('thermostat', thermostat);

		}

		if(dataObj.radioid.includes("thersel")){
			thermostat.modeid=dataObj.valeur1;
			thermostat.planning=dataObj.valeur2;
			io.sockets.emit('thersel', thermostat);

		}


		delete thermostat.sensor;
		delete thermostat.mode;
		apiReq.post('thermostat/update',thermostat);
	  });
 	});
  });
}

function updateThermostatMode(id){


  //THERMOPLANIFS
 apiReq.get("thermostat/mode/"+parseInt(id,10),(res)=>{
	res.setEncoding('utf8');
	var rawData = '';
		res.on('data', (chunk) => {

	  		rawData += chunk;
	  		var mode = JSON.parse(rawData);

	    	if(id!=null && id>0 && id<254) {
				var commande = ["nrf24","node","2Nodw","ther","sel","mode",mode.id].join('/');
				writeAndDrain(commande+'/',function(){});



					refreshThermostat();
			}else{
				logger.logToFile( rootPath+logPath,"given value is null or out of bounds",true);
			}

		});
	});



}

function syncThermostatModes(){


	var time=0;
  //THERMOPLANIFS
 apiReq.get("thermostat/mode/",(res)=>{
	res.setEncoding('utf8');
	var rawData = '';
		res.on('data', (chunk) => {
	  		rawData += chunk;
	  		var modes = objToArray(JSON.parse(rawData));


			modes.forEach(function(mode){
				setTimeout(function(){

					var commande =
					["nrf24","node","2Nodw","ther","put","mode",mode.id,mode.consigne,mode.delta].join('/');
					writeAndDrain(commande+'/',function(){});

				},time*200);
				time++;
			});


		});
	});



}

function objToArray(obj){
	var objArray = [];
	for(var idx in obj) {
		objArray.push(obj[idx]);
	}

	return objArray;

}

function updateThermostatPlan(id){

  //THERMOPLANIFS
  var time=0;

  	if(id!=null && id>0 && id<254) {
	  apiReq.get("thermostat/planif/"+parseInt(id,10),(res)=>{
		res.setEncoding('utf8');
		var rawData = '';
			res.on('data', (chunk) => {

		  		rawData += chunk;

		  		var plans = objToArray(JSON.parse(rawData));
				var com = ["nrf24","node","2Nodw","ther","set","plan",parseInt(id)].join('/');

				writeAndDrain(com+'/',function(){});

				var count=1;

				setTimeout(function(){

					plans.forEach(function(plan){
						setTimeout(function(){

							h1Start = plan.heure1Start;
							h1Stop = plan.heure1Stop;
							h2Start = plan.heure2Start;
							h2Stop = plan.heure2Stop;
							if(plan.heure1Start === null || plan.heure1Start =="") h1Start="XX:XX";
							if(plan.heure1Stop === null || plan.heure1Stop =="") h1Stop="XX:XX";
							if(plan.heure2Start === null || plan.heure2Start =="") h2Start="XX:XX";
							if(plan.heure2Stop === null || plan.heure2Stop =="") h2Stop="XX:XX";



							var commande =
							["nrf24","node","2Nodw","ther","put","plan",
							plan.jour,plan.modeid,plan.defaultModeid,
							h1Start,h1Stop,h2Start,h2Stop].join('/');
							writeAndDrain(commande+'/',function(){});



							if(parseInt(plan.jour)>=7){

								setTimeout(function(){

									commande=["nrf24","node","2Nodw","ther","save","plan"].join('/');
									writeAndDrain(commande+'/',function(){});
								},200);
							}

						},time*120);
						time++;
					});

				},500);
			});
		});

	}else{

		if(id==0){
			var commande = ["nrf24","node","2Nodw","ther","set","plan",id].join('/');

			writeAndDrain(commande+'/',function(){});
		}else{
			logger.logToFile( rootPath+logPath,"given value is null or out of bounds",true);
		}
	}

}





//SENSOR PERSISTANCE
function persistSensor(dataTab,dataObj){
	//Requete d'ajout de la mesure
	var uri='mesures/add-'+dataObj.radioid+'-'+dataObj.valeur1;
	if(dataTab.length>2) uri+='-'+dataObj.valeur2;
	apiReq.get(uri);

	//Envoi des donnees socketio des capteurs
	capteurs.forEach(function (capteur,index){
		if(capteur.radioid===dataObj.radioid){
			capteur.valeur1=dataObj.valeur1;
			capteur.valeur2=dataObj.valeur2;
			if(capteur.valeur2==undefined){
				capteur.valeur2="";
			}
			capteur.releve= df.nowDatetime();
			capteur.actif=1;
			if(dataObj.radioid.includes("ctn10")
			|| dataObj.radioid.includes("dht11")){
				io.sockets.emit('thermo', capteur);
			}
			if(dataObj.radioid.includes("tinfo")){
				io.sockets.emit('teleinfo', capteur);
			}
			if(dataObj.radioid.includes("therm")){
				io.sockets.emit('chaudiere', capteur);
			}
		}
	});
}

//ECRITURE ET ATTENTE SUR PORT SERIE
function writeAndDrain (data, callback) {
  port.write(data,function(){
  });
  port.drain(callback);
}
