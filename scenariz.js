/*
	Author: Stéphane Bascher
	Make Scenarios for Sarah
	
	Date: April-04-2015
	Version: 1.0: Creation of the module
	Version: 2.0: Adding immediate/time-out execution... wow !!
				  speech action, to have the possibility to vocalize a simple tts in a scenario.
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
  initScenariz(SARAH);
}


// Cron
exports.cron = function(callback, task){

	// It's time to check if a thing is to do
	if (SarahClient) {
		var remember = require('./lib/db/scenarizdb')({
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
var initScenariz = function(SARAH, callback) {
	
	var config = SARAH.ConfigManager.getConfig(),
	    multiRoom = config.modules.scenariz['multiRoom'] || 'false';
	    
	debug  = config.modules.scenariz['debug'] || 'false';
	lang = config.modules.scenariz['language'] || 'FR_fr';

	if (multiRoom.toLowerCase() == 'true') {
		// Search client name
		path = require('path'); 
		var inifile = path.resolve('%CD%', './custom.ini').replace('\\%CD%', '');
		SarahClient = ini.parse(fs.readFileSync(inifile, 'utf-8')).common.client;
		if (SarahClient) {
			if (debug == 'true') console.log("Scenariz Cron client: " + SarahClient);
		} else 
			console.log('Scenariz Cron Error: Unable to retrieve the client name from ini');
	} else 
		SarahClient = config.modules.scenariz['defaultRoom'] || 'SARAH1';
	
	// callback if required
	if (callback) callback();
}


// Sarah actions
exports.action = function(data, callback, config, SARAH){
	
	// ? Are you nuts ? leave back home.
	if (data.command === undefined)
		return callback({});
	
	// localized messages
	msg = require('./lib/lang/' + lang);
	if (debug == 'true') console.log(msg.localized('debug'));
	
	// table of actions
	var tblActions = {
		// set Time, specific for Cron
		setTime: function() {setTime(callback);return},
		// Speech, specific for Cron
		speech: function() {callback({'tts': data.text});return},
		// To remove a cron - careful, only one line!
		remmoveCron: function() {remove_cron(data.program,data.name)},
		// Save Program
		ScenarizCron: function() {set_cron(data.program,data.name,data.exec,data.order,data.tempo,data.plug, data.start, data.key, data.ttsCron, data.autodestroy, data.mute, data.fifo, data.speechStartOnRecord, lang, data.clients)},
		// Exec Program, Immediate execution, no at specific date
		ExecCron: function() {exec_cron(data.program,((data.timeout)?parseInt(data.timeout):0))},
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


var remove_cron = function (program, name) {
	
	var remember = require('./lib/db/scenarizdb')({
			sarah: SARAH,
			lang: lang,
			sarahClient: SarahClient,
			debug: debug});
	remember.remove(program,name);

}

var set_cron = function (program, name, exec, order, tempo, plugin, start, key, tts, autodestroy, mute, fifo, speechStartOnRecord, lang, Clients) {
	
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
	autodestroy = ((autodestroy) ? autodestroy : "false" ); // If true, the program is destroyed after execution
	fifo  = ((fifo) ? fifo : "false" ); // first client  executes it then delete
	mute = ((mute) ? "true" : "false" );
	speechStartOnRecord = ((speechStartOnRecord) ? speechStartOnRecord : "false" );
	
    if (debug == 'true') console.log("hour: " + hour + " days: " + days);	
	
	if (SarahClient) {
		var remember = require('./lib/db/scenarizdb')({
				sarah: SARAH,
				lang: lang,
				sarahClient: SarahClient,
				debug: debug});
		remember.save(program,plugin,name,order,tempo,exec,key,tts,autodestroy,mute,fifo,speechStartOnRecord,hour,days,Clients);
	} else 
		console.log('Scenariz Cron Error: No client name');
	
}


var exec_cron = function (program,timeout) {

	if (SarahClient) {
		var remember = require('./lib/db/scenarizdb')({
				sarah: SARAH,
				lang: lang,
				sarahClient: SarahClient,
				debug: debug});
		remember.exec(program,timeout);
	} else 
		console.log('Scenariz Cron Error: No client name');

}


var manage_cron = function () {
	
	if (SarahClient) {
		var remember = require('./lib/db/scenarizdb')({
				sarah: SARAH,
				lang: lang,
				sarahClient: SarahClient,
				debug: debug});
		remember.manage();
	} else 
		console.log('Scenariz Cron Error: No client name');
	
}


