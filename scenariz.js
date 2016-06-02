/*
	Author: Stéphane Bascher
	Making Scenarios for Sarah
	
	Date: April-04-2015
	Version: 1.0: Creation of the module
	Version: 2.0: Adding immediate/time-out execution... wow !!
				  speech action, to have the possibility to vocalize a simple tts in a scenario.
	
	Date: May-28-2015
	Version 3.0: New version for SARAH V3 and V4
*/


// Global variables
var Sarah
	, logger
	, msg
	, debug
	, lang
	, SarahClient
	, fs = require('fs')
	, moment = require('./lib/moment/moment')
	, ini = require('./lib/ini/ini');
	 
moment.locale('fr');	
	
// Init Sarah	 
exports.init = function(_SARAH){
	
	var winston = require('./lib/winston');
	logger = new (winston.Logger)({
		transports: [
			new (winston.transports.Console)()
		]
	});
	
	getVersion(_SARAH, function () { 
		initScenariz(Sarah);
	});
	
}


// Cron
exports.cron = function(callback, task){

	// It's time to check if a thing is to do
	if (SarahClient) {
		if (exists('clientManager') == true) 
			Sarah.obj.trigger('clientManager',{key:'unwatch', files: [__dirname + '/lib/db/Scenariz.db', __dirname + '/lib/db/ScenariznoCron.db']});
		
		var remember = require('./lib/db/scenarizdb')({
			sarah: Sarah.obj,
			config: (Sarah.version == 4) ? Config : null,
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
	
	var multiRoom = getConfig().modules.scenariz.multiRoom || false;
	
	debug  = getConfig().modules.scenariz.debug || false;
	lang = getConfig().modules.scenariz.language || 'FR_fr';

	if (multiRoom == true) {
		// Search client name
		path = require('path'); 
		if (Sarah.version == 3) {
			var inifile = path.resolve('%CD%', './custom.ini').replace('\\%CD%', '');
			SarahClient = ini.parse(fs.readFileSync(inifile, 'utf-8')).common.client;
		} else {
			var inifile = path.resolve('%CD%', './client/custom.ini').replace('\\%CD%', '');
			SarahClient = ini.parse(fs.readFileSync(inifile, 'utf-8')).bot.id;
		}
		if (SarahClient) {
			if (debug == true) logger.info("Scenariz Cron client: %s", SarahClient);
		} else 
			logger.error('Scenariz Cron: Unable to retrieve the client name from ini');
	} else 
		SarahClient = getConfig().modules.scenariz.defaultRoom || 'SARAH1';
	
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
	if (debug == true) logger.info(msg.localized('debug'));
	
	// table of actions
	var tblActions = {
		// Speech the Time, specific for Cron
		setTime: function() {setTime(callback);return},
		// Speech à TTS, specific for Cron
		speech: function() {callback({'tts': data.text});return},
		// To remove only one cron - careful, only one line!
		remmoveCron: function() {remove_cron(data.program,data.name)},
		// To remove ALL programs
		RemoveAllCron: function() {remove_AllCron()},
		// Save Program
		ScenarizCron: function() {set_cron(data.program,data.name,data.exec,data.order,data.tempo,data.plug, data.start, data.key, data.ttsCron, data.autodestroy, data.mute, data.fifo, data.speechStartOnRecord, lang, data.clients)},
		// Exec Program, Immediate execution, not at specific date/time
		ExecCron: function() {exec_cron(data.program,((data.timeout)?parseInt(data.timeout):0))},
		// Manage cron
		ManageCron: function() {manage_cron()}
	};
	
	if (debug == true) logger.info("data.command: %s", data.command);
	
	tblActions[data.command]();
	
	// return fucking callback
	if (data.command != 'setTime' && data.command != 'speech')
		callback({});
}



var getVersion = function (_SARAH, callback) {
	if (typeof Config === "undefined" ) {
		logger.info("Sarah version 3");
		Sarah = {version: 3, obj: _SARAH};
	} else  {
		logger.info("Sarah version 4");
		Sarah = {version: 4, obj: SARAH};
	}
	callback ();
}


var getConfig = function(value){
  
	var conf = (Sarah.version == 4) ? Config : Sarah.obj.ConfigManager.getConfig();
	if (value)
		 conf = conf[value];
	return conf;
}


var exists = function(cmd){

  if (getConfig().modules[cmd])
    return true;

  return false;
}


var setTime = function(callback) {
	var date = new Date();
	var text = date.getHours() + ' ' + msg.localized('heure');
	if (date.getMinutes() > 0)
		text += ' ' + date.getMinutes();
	callback({'tts': text});
}


var remove_cron = function (program, name) {
	
	if (exists('clientManager') == true) 
		Sarah.obj.trigger('clientManager',{key:'unwatch', files: [__dirname + '/lib/db/Scenariz.db', __dirname + '/lib/db/ScenariznoCron.db']});
	
	var remember = require('./lib/db/scenarizdb')({
			sarah: Sarah.obj,
			config: (Sarah.version == 4) ? Config : null,
			lang: lang,
			sarahClient: SarahClient,
			debug: debug});
	remember.remove(program,name);

}


var remove_AllCron = function () {
	
	if (exists('clientManager') == true) 
		Sarah.obj.trigger('clientManager',{key:'unwatch', files: [__dirname + '/lib/db/Scenariz.db', __dirname + '/lib/db/ScenariznoCron.db']});
	
	var remember = require('./lib/db/scenarizdb')({
			sarah: Sarah.obj,
			config: (Sarah.version == 4) ? Config : null,
			lang: lang,
			sarahClient: SarahClient,
			debug: debug});
	remember.removeAll();

}



var set_cron = function (program, name, exec, order, tempo, plugin, start, key, tts, autodestroy, mute, fifo, speechStartOnRecord, lang, Clients) {
	
	var tokenize = start.split('-'),
		hour = tokenize.shift(),
		days = tokenize.pop();
	
	if (!days || !hour) {
		Sarah.obj.speak ( msg.err_localized('cron_no_date'));
		return;
	}
	
	if (days.toLowerCase() == 'today' || days.toLowerCase() == 'tomorrow' || days.toLowerCase() == 'aftertomorrow' ) {
		days = setDayOfWeek(days);
	}
	
	if (!plugin) {
		Sarah.obj.speak ( msg.err_localized('cron_no_plugin'));
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
	
    if (debug == true) logger.info("hour: %s days: %s",hour,days);	
	
	if (SarahClient) {
		if (exists('clientManager') == true) 
			Sarah.obj.trigger('clientManager',{key:'unwatch', files: [__dirname + '/lib/db/Scenariz.db', __dirname + '/lib/db/ScenariznoCron.db']});
		
		var remember = require('./lib/db/scenarizdb')({
				sarah: Sarah.obj,
				config: (Sarah.version == 4) ? Config : null,
				lang: lang,
				sarahClient: SarahClient,
				debug: debug});
		remember.save(program,plugin,name,order,tempo,exec,key,tts,autodestroy,mute,fifo,speechStartOnRecord,hour,days,Clients);
	} else 
		logger.error('Scenariz Cron: No client name');
	
}


var exec_cron = function (program,timeout) {

	if (SarahClient) {
		if (exists('clientManager') == true) 
			Sarah.obj.trigger('clientManager',{key:'unwatch', files: [__dirname + '/lib/db/Scenariz.db', __dirname + '/lib/db/ScenariznoCron.db']});
		
		var remember = require('./lib/db/scenarizdb')({
				sarah: Sarah.obj,
				config: (Sarah.version == 4) ? Config : null,
				lang: lang,
				sarahClient: SarahClient,
				debug: debug});
		remember.exec(program,timeout);
	} else 
		logger.error('Scenariz Cron: No client name');

}


var manage_cron = function () {
	
	if (SarahClient) {
		if (exists('clientManager') == true) 
			Sarah.obj.trigger('clientManager',{key:'unwatch', files: [__dirname + '/lib/db/Scenariz.db', __dirname + '/lib/db/ScenariznoCron.db']});
		
		var remember = require('./lib/db/scenarizdb')({
				sarah: Sarah.obj,
				config: (Sarah.version == 4) ? Config : null,
				lang: lang,
				sarahClient: SarahClient,
				debug: debug});
		remember.manage();
	} else 
		console.log('Scenariz Cron Error: No client name');
	
}


var setDayOfWeek = function(days) {
	
	var today = parseInt(moment().weekday());
	days = days.toLowerCase(); 
	switch (days) {
		case 'today':
			switch (today) {
				case 0: return "1000000";
				case 1: return "0100000";
				case 2: return "0010000";
				case 3: return "0001000";
				case 4: return "0000100";
				case 5: return "0000010";
				case 6: return "0000001";
				default:  return "1111111";
			}
			break;
		case 'tomorrow':
			switch (today) {
				case 0: return "0100000";
				case 1: return "0010000";
				case 2: return "0001000";
				case 3: return "0000100";
				case 4: return "0000010";
				case 5: return "0000001";
				case 6: return "1000000";
				default:  return "1111111";
			}
			break;
		case 'aftertomorrow':
			switch (today) {
				case 0: return "0010000";
				case 1: return "0001000";
				case 2: return "0000100";
				case 3: return "0000010";
				case 4: return "0000001";
				case 5: return "1000000";
				case 6: return "0100000";
				default:  return "1111111";
			}
			break;
		default:
			return "1111111";
	}
}


