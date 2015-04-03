/*
	Author: Stéphane Bascher
	Make Scenarios for Sarah
	
	Date: 
	Version: 1.0: 
	Creation of the module
*/


// Global variables
var SARAH
	 , msg
	 , debug
	 , lang
	 , SarahClient
	 , fs = require('fs')
	 , ini = require('./lib/ini/ini');
	
// Init Sarah	 
exports.init = function(sarah){
  SARAH = sarah;
  initSonos(SARAH);
}


// Cron Sonos
exports.cron = function(callback, task){

	// It's time to check if some things are to do
	if (SarahClient) {
		var remember = require('./lib/db/Sonosdb')({
			sarah: SARAH,
			lang: lang,
			sarahClient: SarahClient,
			debug: debug});
		remember.cron();	
	} else 
		console.log('Scenariz Cron Error: Unable to retrieve the client name from ini');
	
	// return fucking callback
	callback({});
}


// Init Senariz	
var initSonos = function(SARAH, callback) {
	
	// Search client name
	path = require('path'); 
	var inifile = path.resolve('%CD%', './custom.ini').replace('\\%CD%', '');
	SarahClient = ini.parse(fs.readFileSync(inifile, 'utf-8')).common.client;
	if (SarahClient) {
		if (debug == 'true') console.log("Scenariz Cron client: " + SarahClient);
	} else 
		console.log('Scenariz Cron Error: Unable to retrieve the client name from ini');
	
	var config = SARAH.ConfigManager.getConfig();
	debug  = config.modules.SonosPlayer['debug'] || 'false';
	lang = config.modules.SonosPlayer['language'] || 'FR_fr';
	
	// callback if required
	if (callback) callback();
}


// Sarah actions
exports.action = function(data, callback, config, SARAH){
	
	// ? Are you nuts ? leave back home.
	if (data.command === undefined)
		return callback({});
	
	// table of properties
	var _SonosConf = {
		language: config.modules.SonosPlayer['language'] || 'FR_fr',
		debug: config.modules.SonosPlayer['debug'] || 'false'
	};
	
	// localized messages
	lang = _SonosConf.language; // Added for cron...
	msg = require('./lib/lang/' + _SonosConf.language);
	// mode debug
	debug = _SonosConf.debug;
	if (debug == 'true') console.log(msg.localized('debug'));
	
	// table of actions
	var tblActions = {
		// set Time, specific for Cron
		setTime: function() {setTime(callback);return},
		// Save Programme
		ScenarizCron: function() {set_cron(data.program,data.name,data.exec,data.order,data.tempo,data.plug, data.start, data.key, data.ttsCron,_SonosConf.language, data.clients)},
		// Manage cron
		ManageCron: function() {manage_cron()}
	};
	
	if (debug == 'true') console.log("data.command: " + data.command);
	tblActions[data.command]();
	
	// return fucking callback
	callback({});
}


var setTime = function(callback) {
	var date = new Date();
	var text = date.getHours() + ' ' + msg.localized('heure');
	if (date.getMinutes() > 0)
		text += ' ' + date.getMinutes();
	callback({'tts': text});
}




var set_cron = function (program, name, exec, order, tempo, plugin, start, key, tts, lang, Clients) {
	
	var tokenize = start.split('-'),
		hour = tokenize.shift(),
		days = tokenize.pop();
	
	if (!days || !hour) {
		SARAH.speak ( msg.err_localized('cron_no_date'));
		return;
	}
	
	if (!plugin) {
		SARAH.speak ( msg.err_localized('cron_no_plugin'));
		return;
	}
	
	exec = ((exec) ? exec : "true");  // execution true by default
	order = ((order) ? order : "1");  // order 1 by default
	tempo = ((tempo) ? tempo : "1000"); // 3s of tempo by default
	tts =  ((tts) ? tts : null); // start tts by ...
	key = ((key) ? key : null);
	Clients = ((Clients) ? Clients : 'SARAH1' ); //Sarah clients by default
	program = ((program) ? program : msg.localized('generalCron') ); // Group of cron, "General" by default

    if (debug == 'true') console.log("hour: " + hour + " days: " + days);	
	
	if (SarahClient) {
		var remember = require('./lib/db/Sonosdb')({
				sarah: SARAH,
				lang: lang,
				sarahClient: SarahClient,
				debug: debug});
		remember.save(program,plugin,name,order,tempo,exec,key,tts,hour,days,Clients);
	} else 
		console.log('Sonos Cron Error: Unable to retrieve the client name from ini');
	
}


var manage_cron = function () {
	
	if (SarahClient) {
		var remember = require('./lib/db/Sonosdb')({
				sarah: SARAH,
				lang: lang,
				sarahClient: SarahClient,
				debug: debug});
		remember.manage();
	} else 
		console.log('Sonos Cron Error: Unable to retrieve the client name from ini');
	
}


