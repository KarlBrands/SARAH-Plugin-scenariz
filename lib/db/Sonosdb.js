/*
	Author: Stéphane Bascher
	Date: March-17-2015
	Specific Sonos Cron management for Sarah
	Version: 1.0 - Creation of the module
*/

var moment = require('../moment/moment');
moment.locale('fr');

// Init js
var nedbClient = module.exports = function (opts) {
	//Dirty hack, should fix this. One day...
	nedbobj = this;

	if (!(this instanceof nedbClient)) {
		return new nedbClient(opts);
	}
	
	opts = opts || {};
	this.SARAH = this.SARAH || opts.sarah;
	this.lang = this.lang || opts.lang || 'FR_fr'; //FR_fr at least by default
	this.msg = this.msg || require('../lang/' + this.lang);
	this.Sonosdb = this.Sonosdb || this.dbinit();
	this.sarahClient = this.sarahClient || opts.sarahClient;
	this.debug = this.debug || opts.debug || 'true' ; 
	
	// Save action
	this.save = function (program,plugin,name,order,tempo,exec,key,tts,hour,days,clients) {this.dbsave(program,plugin,name,order,tempo,exec,key,tts,hour,days,clients)};
	// execute Cron action
	this.cron = function () {this.dbcron(function (tbl_pl_list) {nedbobj.callback_play(tbl_pl_list,1,nedbobj,nedbobj.callback_play)})};
	// Manage Cron action
	this.manage = function () {this.dbmanage()};
}

// Init nedb database
nedbClient.prototype.dbinit = function () {
	var dbstore = require('../nedb'),
	    path = __dirname + '/Sonosdb.db',
	    Sonosdb = new dbstore({ filename: path});
	Sonosdb.loadDatabase();
	return Sonosdb;   
}


// Execute the module
nedbClient.prototype.callback_play = function (tbl_pl_list,next,client,callback) {
	
	if (!callback) return;
	if (next > tbl_pl_list.length) return;
	
	var pl = {};
	for (i=0;i<tbl_pl_list.length;i++) {
		pl = tbl_pl_list[i];
		if (parseInt(pl.Order) == next)
			break;
	}
	
	var plugins=client.SARAH.ConfigManager.getConfig(),
		flagfound;
	Object.keys(plugins.modules).forEach(function(plugin) {
		if (plugin==pl.Plugin) { 
			flagfound = true;
			return ;
		}
	});
	
	switch (flagfound) {
		case true:
			var ExecTask = {};
			ExecTask = formatTask(pl.Keys);
			client.SARAH.call(pl.Plugin, ExecTask, function(cb){ 
				if (pl.tts && cb.tts) {
					if (pl.tts.indexOf("%s" != -1)) {
						pl.tts = pl.tts.replace ('%s', cb.tts);
						client.SARAH.speak(pl.tts, function(){
							setTimeout(function(){			
								callback(tbl_pl_list,++next,client,callback);
							}, parseInt(pl.Tempo));
						});
					} else
						client.SARAH.speak(pl.tts, function () { 
							client.SARAH.speak(cb.tts, function(){  
								setTimeout(function(){ 
									callback(tbl_pl_list,++next,client,callback);
								}, parseInt(pl.Tempo));
							});
						});	
				} else if (!pl.tts && cb.tts) {
					client.SARAH.speak(cb.tts, function(){  
						setTimeout(function(){
							callback(tbl_pl_list,++next,client,callback);
						}, parseInt(pl.Tempo));
					});
				} else if (!pl.tts && !cb.tts) {
					setTimeout(function(){
						callback(tbl_pl_list,++next,client,callback);
					}, parseInt(pl.Tempo));
				}
			});
			break;
		default:
			client.SARAH.speak(client.msg.err_localized('err_findplugin') + ' ' + pl.Plugin, function() {
				setTimeout(function(){
						callback(tbl_pl_list,++next,client,callback);
				}, parseInt(pl.Tempo));
			});
			break;
	}	
}




// Search for modules to execute
nedbClient.prototype.dbcron = function (callback) {
	var client = this;
	// current date & hour
	var date = moment().format("YYYY-MM-DD"),
	    hour = moment().format("HH:mm");
	
	client.Sonosdb.find({ Exec : "true" }, function (err, docs) {
		if (err){
				console.log("Enable to retrieve db items, error: " + err);
				return;
		}
		var tbl_pl_list = [],
		    pending = docs.length;
		docs.forEach(function (doc) {
			doc.Hour =  ((doc.Hour.indexOf (':') == 1) ? '0'+ doc.Hour : doc.Hour);		
			if (isday(doc.Days) && istime((date+'T'+doc.Hour), (date+'T'+hour))) {
				var ClientsList = doc.Clients.split('|');
				for ( z=0; z<ClientsList.length;z++ ) {
					if (ClientsList[z].toLowerCase() == client.sarahClient.toLowerCase() || ClientsList[z].toLowerCase() == 'all' ) {	
						tbl_pl_list.push(doc);
						break;
					}	
				}
			}
			if (!--pending) callback (tbl_pl_list);
		});
	});
}


// Manage cron 
nedbClient.prototype.dbmanage = function () {
	var client = this;
	client.Sonosdb.find({}, function (err, docs) {	
		if (err){
			console.log("Enable to retrieve programs, error: " + err);
			return;
		}
		
		if (docs.length == 0)
			client.SARAH.speak(client.msg.err_localized('no_cron'));	
		else {
			var pending = docs.length,
			    progList = [];
			docs.forEach(function (doc) {
				if (progList && progList.indexOf(doc.Program) == -1)
					progList.push(doc.Program);
				
				if (!--pending)
					askCron(progList,0,client,client.SARAH,"up",askCron);
			});
		}	
	});
	
}


var askCron = function (progList,pos,client,SARAH,sens,callback) {
	
	if (!callback || pos < 0 || pos == progList.length) return;
	
	askTo(progList,pos,client,SARAH,sens,function (pos,sens) {
		if (sens == "up") ++pos;
		if (sens == "down") --pos;
		callback(progList,pos,client,SARAH,sens,callback) 
	});

}


var askTo = function (progList,pos,client,SARAH,sens,callback) {

	SARAH.askme(client.msg.localized('modifycron').replace('%s', progList[pos]), { 
			'oui parfait' : 'yes',
			'oui modifie' : 'yes',
			'suivant' : 'no',
			'non merci' : 'no',
			'quel est le sens' : 'sens',
			'inverse le sens' : 'reverse',
			'qu\'est ce que je peux dire' : 'sommaire',
			'terminé': 'cancel',
			'annule' : 'cancel'
	}, 0, function(answer, end){
			switch (answer) {
			case 'sommaire':
				if (client.debug == 'true') console.log("Summary: " + client.msg.localized('askTosommaire'));
				SARAH.speak(client.msg.localized('askTosommaire'),function(){
					callback(((sens == "up") ? --pos : ++pos),sens);
				}); 
				end();	
				break;
			case 'sens':
			    var tts = ((sens == "up") ? client.msg.localized('cron_sens_up') : client.msg.localized('cron_sens_down'));
				if (client.debug == 'true') console.log("The sens is " + sens);
				SARAH.speak(tts,function(){
					callback(((sens == "up") ? --pos : ++pos),sens);
				}); 
				end();	
				break;
			case 'yes':
				if (client.debug == 'true') console.log("Modification: " + progList[pos]);
				SARAH.speak(client.msg.localized('selectedcron').replace('%s', progList[pos]),function(){
				    askModifyCron(progList[pos],client.msg.localized('askModifyCron'),client,SARAH);
				});
				end();
				break;
			case 'cancel':
				SARAH.speak(client.msg.localized('cancel'),function(){
					if (client.debug == 'true') console.log("Cancel modification");
				});
				end();
				break;
			case 'reverse':
				if (client.debug == 'true') console.log("Reverse sens");
				sens = ((sens == "up") ? "down" : "up");
				callback(pos,sens);
				end();
				break;
			case 'no': 
			default:	
				if (client.debug == 'true') console.log("Next Program");
				callback(pos,sens);
				end();	
				break;
			}
	}); 
}


var askModifyCron = function (program,tts,client,SARAH){

	SARAH.askme(tts, { 
			'l\'état' : 'state',
			'activer' : 'activate',
			'qu\'est ce que je peux dire' : 'sommaire',
			'supprime le programme' : 'delete',
			'désactiver' : 'desactivate',
			'les minutes' : 'minute',
			'l\'heure' : 'hour',
			'les jours' : 'day',
			'terminé': 'cancel',
			'annule' : 'cancel'
	}, 0, function(answer, end){
			var tts = client.msg.localized('askModifyCronNext')
			switch (answer) {
			case 'sommaire':
				if (client.debug == 'true') console.log("Summary: " + client.msg.localized('askModifySommaire'));
				SARAH.speak(client.msg.localized('askModifySommaire'),function(){
					askModifyCron(program,tts,client,SARAH);
				}); 
				end();
				break;
			case 'state':
				if (client.debug == 'true') console.log("State " + program);
				updateCron(program, "state", client, SARAH, function (state,hour,days,nbactions,hourlast,clients){  
					clients = clients.replace('|', client.msg.localized('prefixClients'));
					SARAH.speak(client.msg.localized('stateCron').replace('%s', program).replace('%d', state).replace('%c', clients).replace('%h', hour).replace('%z', hourlast).replace('%a', nbactions).replace(' 1 ', ' ' + client.msg.localized('1') + ' ') ,function(){
						switch (days) {
							case "1111111":
								SARAH.speak(client.msg.localized('stateWeekdaysCronOn'),function(){
									askModifyCron(program,tts,client,SARAH);
								});
							break;
							case "0000000":
								SARAH.speak(client.msg.localized('stateWeekdaysCronOff'),function(){
									askModifyCron(program,tts,client,SARAH);
								});
							break;
							case "1111100":
								SARAH.speak(client.msg.localized('stateWorkdaysCronOn'),function(){
									askModifyCron(program,tts,client,SARAH);
								});
							break;
							case "0000011":
								SARAH.speak(client.msg.localized('stateWekendCronOn'),function(){
									askModifyCron(program,tts,client,SARAH);
								});
							break;
							default:
								var msg = ' ',
									nbdays = 0;
								if (days.substring(0,1) == '1') {nbdays += 1; msg += client.msg.localized('stateMondayCronOn') + ', ';}
								if (days.substring(1,2) == '1') {nbdays += 1 ; msg += client.msg.localized('statetuesdayCronOn') + ', ';}
								if (days.substring(2,3) == '1') {nbdays += 1 ; msg += client.msg.localized('statewednesdayCronOn') + ', ';}
			                    if (days.substring(3,4) == '1') {nbdays += 1 ; msg += client.msg.localized('statethursdayCronOn') + ', ';}
								if (days.substring(4,5) == '1') {nbdays += 1 ; msg += client.msg.localized('statefridayCronOn') + ', ';}
								if (days.substring(5,6) == '1') {nbdays += 1 ; msg += client.msg.localized('statesaturdayCronOn') + ', ';}
								if (days.substring(6) == '1') {nbdays += 1 ; msg += client.msg.localized('statesundayCronOn') + ', ';}
								switch (nbdays) {
									case 1:
										msg = client.msg.localized('statesresultCronOn').replace('%d', nbdays) + msg;
										break;
									default:
										msg = client.msg.localized('statesresultsCronOn').replace('%d', nbdays) + msg;
										break;
								}
								SARAH.speak(msg,function(){
									askModifyCron(program,tts,client,SARAH);
								});
							break;
						}
					});	
				});
				end();
				break;
			case 'activate':
			   if (client.debug == 'true') console.log("Activate " + program);
			   updateCron(program, "true", client, SARAH, function (numReplaced){  
					SARAH.speak(client.msg.localized('activateCron').replace('%s', program).replace('%d', numReplaced),function(){
						askModifyCron(program,tts,client,SARAH);
					});
				});
				end();
				break;
			case 'desactivate':
				if (client.debug == 'true') console.log("Desactivate " + program);	
				updateCron(program, "false", client, SARAH, function (numReplaced){  
					SARAH.speak(client.msg.localized('desactivateCron').replace('%s', program).replace('%d', numReplaced),function(){
						askModifyCron(program,tts,client,SARAH);						
					});
				});
				end();
				break;
			case 'minute':	
				if (client.debug == 'true') console.log("Changing minute for " + program);
				updateCron(program, "minute", client, SARAH, function (diff,numReplaced,newHour){  
					switch (diff) {
						case false:
							SARAH.speak(client.msg.localized('cancel'),function(){
								askModifyCron(program,tts,client,SARAH);						
							});
						break;
						case 0:
							SARAH.speak(client.msg.localized('noModificationCron').replace('%s', program),function(){
								askModifyCron(program,tts,client,SARAH);						
							});
						break;
						default:
							SARAH.speak(client.msg.localized('modifyMinuteCron').replace('%h', diff).replace('%s', program).replace('%d', numReplaced),function(){
								SARAH.speak(client.msg.localized('NewHourCron').replace('%s', newHour),function(){
									askModifyCron(program,tts,client,SARAH);						
								});							
							});
						break;
					}
				});
				end();
				break;
			case 'hour':	
				if (client.debug == 'true') console.log("Changing hour for " + program);
				updateCron(program, "hour", client, SARAH, function (diff,numReplaced,newHour){  
					switch (diff) {
						case false:
							SARAH.speak(client.msg.localized('cancel'),function(){
								askModifyCron(program,tts,client,SARAH);						
							});
						break;
						case 0:
							SARAH.speak(client.msg.localized('noModificationCron').replace('%s', program),function(){
								askModifyCron(program,tts,client,SARAH);						
							});
						break;
						default:
							SARAH.speak(client.msg.localized('modifyHourCron').replace('%h', diff).replace('%s', program).replace('%d', numReplaced).replace(' 1 ', ' ' + client.msg.localized('1') + ' '),function(){
								SARAH.speak(client.msg.localized('NewHourCron').replace('%s', newHour),function(){
									askModifyCron(program,tts,client,SARAH);						
								});					
							});
						break;
					}
				});
				end();
				break;
			case 'day':
				if (client.debug == 'true') console.log("Changing date for " + program);
				updateCron(program, "day", client, SARAH, function (days){  
					switch (days) {
						case false:
							SARAH.speak(client.msg.localized('cancel'),function(){
								askModifyCron(program,tts,client,SARAH);						
							});
						break;
						case 0:
							SARAH.speak(client.msg.localized('noModificationCron').replace('%s', program),function(){
								askModifyCron(program,tts,client,SARAH);						
							});
						break;
						default:
							SARAH.speak(client.msg.localized('modifyDaysCron').replace('%s', program).replace('%d', days).replace(' 1 ', ' ' + client.msg.localized('1') + ' '),function(){
								askModifyCron(program,tts,client,SARAH);								
							});
						break;
					}
				});
				end();
				break;
			case 'delete':
				if (client.debug == 'true') console.log("Delete " + program);
				updateCron(program, "delete", client, SARAH, function (numRemoved){
					switch (numRemoved) {
						case 0:
							SARAH.speak(client.msg.localized('noModificationCron').replace('%s', program),function(){
								askModifyCron(program,tts,client,SARAH);						
							});
						break;	
						default:
							SARAH.speak(client.msg.localized('deleteCron').replace('%s', program).replace('%d', numRemoved).replace(' 1 ', ' ' + client.msg.localized('1') + ' '),function(){
								askModifyCron(program,tts,client,SARAH);
							}); 
						break;	
					}
				});
				end();
				break;
			case 'cancel':
			default:
				SARAH.speak(client.msg.localized('terminateCron'));
				end();
				break;
			}
	}); 
	
}




var updateCron = function (cron, state, client, SARAH, callback){
	
	switch (state)  {
		case 'state':
			client.Sonosdb.find({Program: cron, Order:'1'}, function (err, docs) {	
				var pending = docs.length,
				    hour,
					hourlast,
					clients,
					days,
				    date = moment().format("YYYY-MM-DD");
				docs.forEach(function (doc) {
					if (hour) {
						if ( moment(date+'T'+doc.Hour).isBefore(date+'T'+hour) == true) {
							hour = doc.Hour;
							state = ((doc.Exec == "false") ? client.msg.localized('desactivatedCron') : client.msg.localized('activatedCron'));
							days = doc.Days;
							clients = doc.Clients;
						}
					} else {
						hour = doc.Hour;
						state= ((doc.Exec == "false") ? client.msg.localized('desactivatedCron') : client.msg.localized('activatedCron'));
						days = doc.Days;
						clients = doc.Clients;
					}
					
					if (hourlast) {
						if ( moment(date+'T'+doc.Hour).isAfter(date+'T'+hourlast) == true) {
							hourlast = doc.Hour;
						}
					} else 
						hourlast = doc.Hour;
					
					if (!--pending) {
						client.Sonosdb.find({Program: cron}, function (err, docs) {
							callback(state,hour,days,docs.length,hourlast,clients);
						});
					}
				});	
			});
			break;
		case 'hour':	
		case 'minute':	
		case 'day':
			client.Sonosdb.find({Program: cron, Order:'1'}, function (err, docs) {	
				var pending = docs.length,
				    hour,
					hourMns,
					minute,
					days,
				    date = moment().format("YYYY-MM-DD");
				docs.forEach(function (doc) {
					if (hourMns) {
						if ( moment(date+'T'+doc.Hour).isBefore(date+'T'+hourMns) == true) {
							hourMns = doc.Hour;
							minute = doc.Hour.split(':').pop();
							hour = doc.Hour.split(':').shift();
							days = doc.Days;
						}
					} else {
						hourMns = doc.Hour;
						minute = doc.Hour.split(':').pop();
						hour = doc.Hour.split(':').shift();
						days = doc.Days;
					}
					
					if (!--pending) {
						client.Sonosdb.find({Program: cron}, function (err, docs) {
							switch (state)  {
								case 'hour':
									askHour (hour, minute, docs, hour, client, SARAH, askHour, function(diff, newHour) {
										callback(diff,docs.length,newHour);
									});
									break;
								case 'minute':
									askMinute (hour, minute, docs, minute, client, SARAH, askMinute, function(diff, newHour) {
										callback(diff,docs.length,newHour);
									});
									break;
								case 'day':
									askDays (cron, days, client.msg.localized('activatedCron'), docs, days, client, SARAH, askDays, function(days) {
										callback(days);
									});
									break;
							}
						});
					}
				});	
			});
			break;	
		case 'true':
		case 'false':
			client.Sonosdb.update({Program:cron}, { $set: {Exec: state}}, { multi: true }, function (err, numReplaced) {	
				if (err) {
					console.log("Enable to retrieve program, error: " + err);
					numReplaced = 0;
				}
				callback(numReplaced);
			});
			break;
		case 'delete':
			SARAH.askme(client.msg.localized('askDeleteCron').replace('%s', ' ' + cron), { 
				'Oui supprime' : 'deleteCron',
				'annule' : 'cancel'
			}, 0, function(answer, end){
				switch (answer) {
					case 'deleteCron':
						client.Sonosdb.remove({Program:cron}, { multi: true }, function (err, numRemoved) {	
							if (err) {
								console.log("Enable to delete program, error: " + err);
								numRemoved = 0;
							}
							callback(numRemoved);
						});
						end();
						break;
					case 'cancel':
					default:
						callback(0);
						end();
						break;
				}
			});
	}
}






var askDays = function (cron, days, state, docs, currentdays, client, SARAH, callback, callbackNext){

	var tts = client.msg.localized('askWeekdaysCron').replace('%s', ' ' + state);
	SARAH.askme(tts, { 
			'qu\'est ce que je peux dire' : 'sommaire',
			'semaine de travail' : 'workdays',
			'toute la semaine' : 'weekdays',
			'active' : 'activate',
			'désactive' : 'desactivate',
			'le lundi' : 'monday',
			'le mardi' : 'tuesday',
			'le mercredi' : 'wednesday',
			'le jeudi' : 'thursday',
			'le vendredi' : 'friday',
			'le samedi' : 'saturday',
			'le dimanche' : 'sunday',
			'c\est bon': 'yes',
			'terminé': 'yes',
			'annule': 'cancel'
	}, 0, function(answer, end){
		switch (answer) {
			case 'sommaire':
				if (client.debug == 'true') console.log("Summary: " + client.msg.localized('askDaysSommaire'));
				SARAH.speak(client.msg.localized('askDaysSommaire'),function(){
					callback (cron, days, state, docs, currentdays, client, SARAH, callback, callbackNext);
				}); 
				end();
				break;
			case 'activate':
			case 'desactivate':
				state = ((state == client.msg.localized('activatedCron')) ? client.msg.localized('desactivatedCron') : client.msg.localized('activatedCron'));
				callback (cron, days, state, docs, currentdays, client, SARAH, callback, callbackNext);
				end();
				break;
			case 'workdays':
				days = ((state == client.msg.localized('activatedCron')) ? "1111100" : "0000011");
				var tts = ((state == client.msg.localized('activatedCron')) ? client.msg.localized('workdaysOn') : client.msg.localized('workdaysOff'));
				SARAH.speak(tts,function(){
					callback (cron, days, state, docs, currentdays, client, SARAH, callback, callbackNext);				
				});
				end();
				break;
			case 'weekdays':
				days = ((state == client.msg.localized('activatedCron')) ? "1111111" : "0000000");
				var tts = ((state == client.msg.localized('activatedCron')) ? client.msg.localized('weekdaysOn') : client.msg.localized('weekdaysOff'));
				SARAH.speak(tts,function(){
					callback (cron, days, state, docs, currentdays, client, SARAH, callback, callbackNext);				
				});
				end();
				break;
			case 'monday':
				days = ((state == client.msg.localized('activatedCron'))
						? '1' + days.substring(1) : '0' + days.substring(1));
				var tts = ((state == client.msg.localized('activatedCron')) ? client.msg.localized('mondayOn') : client.msg.localized('mondayOff'));
				SARAH.speak(tts,function(){
					callback (cron, days, state, docs, currentdays, client, SARAH, callback, callbackNext);				
				});
				end();
				break;
			case 'tuesday':
				days = ((state == client.msg.localized('activatedCron'))
						? days.substring(0,1) + '1' + days.substring(2) : days.substring(0,1) + '0' + days.substring(2));
				var tts = ((state == client.msg.localized('activatedCron')) ? client.msg.localized('tuesdayOn') : client.msg.localized('tuesdayOff'));
				SARAH.speak(tts,function(){
					callback (cron, days, state, docs, currentdays, client, SARAH, callback, callbackNext);				
				});
				end();
				break;
			case 'wednesday':
				days = ((state == client.msg.localized('activatedCron'))
						? days.substring(0,2) + '1' + days.substring(3) : days.substring(0,2) + '0' + days.substring(3));
				var tts = ((state == client.msg.localized('activatedCron')) ? client.msg.localized('wednesdayOn') : client.msg.localized('wednesdayOff'));
				SARAH.speak(tts,function(){
					callback (cron, days, state, docs, currentdays, client, SARAH, callback, callbackNext);				
				});
				end();
				break;
			case 'thursday':
				days = ((state == client.msg.localized('activatedCron'))
						? days.substring(0,3) + '1' + days.substring(4) : days.substring(0,3) + '0' + days.substring(4));
				var tts = ((state == client.msg.localized('activatedCron')) ? client.msg.localized('thursdayOn') : client.msg.localized('thursdayOff'));
				SARAH.speak(tts,function(){
					callback (cron, days, state, docs, currentdays, client, SARAH, callback, callbackNext);				
				});
				end();
				break;
			case 'friday':
				days = ((state == client.msg.localized('activatedCron'))
						? days.substring(0,4) + '1' + days.substring(5) : days.substring(0,4) + '0' + days.substring(5));
				var tts = ((state == client.msg.localized('activatedCron')) ? client.msg.localized('fridayOn') : client.msg.localized('fridayOff'));
				SARAH.speak(tts,function(){
					callback (cron, days, state, docs, currentdays, client, SARAH, callback, callbackNext);				
				});
				end();
				break;
			case 'saturday':
				days = ((state == client.msg.localized('activatedCron'))
						? days.substring(0,5) + '1' + days.substring(6) : days.substring(0,5) + '0' + days.substring(6));
				var tts = ((state == client.msg.localized('activatedCron')) ? client.msg.localized('saturdayOn') : client.msg.localized('saturdayOff'));
				SARAH.speak(tts,function(){
					callback (cron, days, state, docs, currentdays, client, SARAH, callback, callbackNext);				
				});
				end();
				break;
			case 'sunday':
				days = ((state == client.msg.localized('activatedCron'))
						? days.substring(0,6) + '1' : days.substring(0,6) + '0');
				var tts = ((state == client.msg.localized('activatedCron')) ? client.msg.localized('sundayOn') : client.msg.localized('sundayOff'));
				SARAH.speak(tts,function(){
					callback (cron, days, state, docs, currentdays, client, SARAH, callback, callbackNext);				
				});
				end();
				break;
			case 'yes': 
				if (days != currentdays ) {
					client.Sonosdb.update({Program:cron}, { $set: {Days: days}}, { multi: true }, function (err, numReplaced) {	
						if (err) {
							console.log("Enable to retrieve program, error: " + err);
							numReplaced = 0;
						}
						callbackNext(numReplaced);
					});	
				} else
					callbackNext(0);
				end();
				break;
			case 'cancel':
				callbackNext(false);
				end();
				break;
			default:
				callbackNext(0);
				end();
				break;
		}
	});
}





var askHour = function (hour, minute, docs, currenthour, client, SARAH, callback, callbackNext){
	
	var tts = client.msg.localized('currentHourCron').replace('%s', hour);
	SARAH.askme(tts, { 
			'qu\'est ce que je peux dire' : 'sommaire',
			'baisse' : 'minus',
			'baisse beaucoup' : 'minusby15',
			'augmente' : 'more',
			'augmente beaucoup' : 'moreby15',
			'c\'est bon': 'yes',
			'terminé': 'yes',
			'annule': 'cancel'
	}, 0, function(answer, end){
		switch (answer) {
			case 'sommaire':
				if (client.debug == 'true') console.log("Summary: " + client.msg.localized('askHourSommaire'));
				SARAH.speak(client.msg.localized('askHourSommaire'),function(){
					callback (hour, minute, docs, currenthour, client, SARAH, callback, callbackNext);
				}); 
				end();
				break;
			case 'minus':
				hour = (((parseInt(hour) - 1) < 0) ? (23).toString() : (parseInt(hour) - 1).toString()); 
				callback (hour.toString(), minute, docs, currenthour, client, SARAH, callback, callbackNext);
				end();
				break;
			case 'minusby15':
				hour = (((parseInt(hour) - 5) < 0) ? (23).toString() : (parseInt(hour) - 5).toString()); 
				callback (hour.toString(), minute, docs, currenthour, client, SARAH, callback, callbackNext);
				end();
				break;
			case 'more':
				hour = (((parseInt(hour) + 1) > 23) ? (0).toString() : (parseInt(hour) + 1).toString()); 
				callback (hour.toString(), minute, docs, currenthour, client, SARAH, callback, callbackNext);
				end();
				break;
			case 'moreby15':
				hour = (((parseInt(hour) + 5) > 23) ? (0).toString() : (parseInt(hour) + 5).toString()); 
				callback (hour.toString(), minute, docs, currenthour, client, SARAH, callback, callbackNext);
				end();
				break;
			case 'yes':
				hour =  ((hour.length == 1) ? '0'+ hour : hour);	
				var newHour = moment().format("YYYY-MM-DD") + 'T' + hour +':' + minute;
				var oldhour =  moment().format("YYYY-MM-DD") + 'T' + currenthour +':' + minute;
				if (moment(oldhour).isSame(newHour) == false ) {
					var diffHour = parseInt(hour) - parseInt(currenthour);
					setCronHour (diffHour, docs, 0, client, setCronHour, function (diffHour) {
						if (diffHour < 0) 
							diffHour = diffHour * -1;
						callbackNext(diffHour, hour +':' + minute);
					});
				} else
					callbackNext(0);
				end();
				break;
			case 'cancel':
				callbackNext(false);
				end();
				break;
			default:
				callbackNext(0);
				end();
				break;
		}
	});
}




var askMinute = function (hour, minute, docs, currentminute, client, SARAH, callback, callbackNext){
	
	var tts = client.msg.localized('currentMinuteCron').replace('%s', minute);
	SARAH.askme(tts, { 
			'qu\'est ce que je peux dire' : 'sommaire',
			'baisse' : 'minus',
			'baisse beaucoup' : 'minusby15',
			'augmente' : 'more',
			'augmente beaucoup' : 'moreby15',
			'c\est bon': 'yes',
			'terminé': 'yes',
			'annule': 'cancel'
	}, 0, function(answer, end){
		switch (answer) {
			case 'sommaire':
				if (client.debug == 'true') console.log("Summary: " + client.msg.localized('askHourSommaire'));
				SARAH.speak(client.msg.localized('askHourSommaire'),function(){
					callback (hour, minute, docs, currentminute, client, SARAH, callback, callbackNext);
				}); 
				end();
				break;
			case 'minus':
				minute = (((parseInt(minute) - 5) < 0) ? (55).toString() : (parseInt(minute) - 5).toString()); 
				callback (hour, minute.toString(), docs, currentminute, client, SARAH, callback, callbackNext);
				end();
				break;
			case 'minusby15':
				minute = (((parseInt(minute) - 15) < 0) ? (55).toString() : (parseInt(minute) - 15).toString()); 
				callback (hour, minute.toString(), docs, currentminute, client, SARAH, callback, callbackNext);
				end();
				break;
			case 'more':
				minute = (((parseInt(minute) + 5) > 55) ? (0).toString() : (parseInt(minute) + 5).toString()); 
				callback (hour, minute.toString(), docs, currentminute, client, SARAH, callback, callbackNext);
				end();
				break;
			case 'moreby15':
				minute = (((parseInt(minute) + 15) > 55) ? (0).toString() : (parseInt(minute) + 15).toString()); 
				callback (hour, minute.toString(), docs, currentminute, client, SARAH, callback, callbackNext);
				end();
				break;
			case 'yes':
				minute =  ((minute.length == 1) ? '0'+ minute : minute);	
				var newHour = moment().format("YYYY-MM-DD") + 'T' + hour +':' + minute;
				var oldhour =  moment().format("YYYY-MM-DD") + 'T' + hour +':' + currentminute;
				if (moment(oldhour).isSame(newHour) == false ) {
					var diffMn = parseInt(minute) - parseInt(currentminute);
					setCronMn (diffMn, docs, 0, client, setCronMn, function (docs) {
						if (diffMn < 0) 
							diffMn = diffMn * -1;
						callbackNext(diffMn, hour +':' + minute);
					});
				} else
					callbackNext(0);
				end();
				break;
			case 'cancel':
				callbackNext(false);
				end();
				break;
			default:
				callbackNext(0);
				end();
				break;
		}
	});
}


var setCronMn = function (diffMn, docs, pos, client, callback, callbackNext){
    
	if (pos == docs.length) return callbackNext(diffMn);

	if (client.debug == 'true') console.log("docs.length: " + docs.length + ' et pos: ' + pos );
	var doc = docs[pos],
		newHour = moment().format("YYYY-MM-DD") + 'T' + doc.Hour,
		diff;
	
	if (client.debug == 'true') console.log("diff minutes: " + diffMn);
	if (diffMn >= 0) 
		newHour = moment(newHour).add(diffMn, 'minutes').format("HH:mm");
	else {
		diff = diffMn * -1;
		newHour = moment(newHour).subtract(diff, 'minutes').format("HH:mm");
	}
	if (client.debug == 'true') console.log("new hour pour " + doc.Name + ': ' + newHour);
	newHour =  ((newHour.indexOf (':') == 1) ? '0'+ newHour : newHour);	
	client.Sonosdb.update({_id: doc._id}, { $set: {Hour: newHour}}, {}, function (err, numReplaced) {	
		if (err)
			console.log("Enable to update " + doc.Name + ' error: ' + err);
	    if (numReplaced == 0)
			console.log("Enable to update " + doc.Name);
		
		callback(diffMn, docs, ++pos, client, callback, callbackNext);
	});

	
}

var setCronHour = function (diffHour, docs, pos, client, callback, callbackNext){
    
	if (pos == docs.length) return callbackNext(diffHour);

	if (client.debug == 'true') console.log("docs.length: " + docs.length + ' et pos: ' + pos );
	var doc = docs[pos],
		newHour = moment().format("YYYY-MM-DD") + 'T' + doc.Hour,
		diff;
	
	if (client.debug == 'true') console.log("diff Hour: " + diffHour);
	if (diffHour >= 0) 
		newHour = moment(newHour).add(diffHour, 'hours').format("HH:mm");
	else {
		diff = diffHour * -1;
		newHour = moment(newHour).subtract(diff, 'hours').format("HH:mm");
	}
	if (client.debug == 'true') console.log("new hour pour " + doc.Name + ': ' + newHour);
	newHour =  ((newHour.indexOf (':') == 1) ? '0'+ newHour : newHour);	
	client.Sonosdb.update({_id: doc._id}, { $set: {Hour: newHour}}, {}, function (err, numReplaced) {	
		if (err)
			console.log("Enable to update " + doc.Name + ' error: ' + err);
	    if (numReplaced == 0)
			console.log("Enable to update " + doc.Name);
		
		callback(diffHour, docs, ++pos, client, callback, callbackNext);
	});

	
}


// Save module in db
nedbClient.prototype.dbsave = function (program,plugin,name,order,tempo,exec,key,tts,hour,days,clients) {
	var client = this;
	client.Sonosdb.findOne({Program:program, Name:name}, function (err, docfound) {
			if (err){
				console.log("Enable to retrieve Sonos Cron, error: " + err);
				return;
			}
			
			if (docfound) {
				// Doc found, just replace
				client.Sonosdb.update({_id:docfound._id}, { $set:{	Clients: clients,
																	Plugin: plugin,
																	Order: order,
																	Tempo: tempo,
																	tts: tts,
																	Exec: exec.toLowerCase(),
																	Keys: key,
																	Hour: hour,
																	Days: days
																}}, {}
					, function(err, numReplaced){
						switch (numReplaced){
							case 0: client.SARAH.speak(client.msg.err_localized('not_replaced') + ' ' + docfound.Name);
							break;
							case 1: client.SARAH.speak(docfound.Name +  ' ' + client.msg.localized('cron_replaced'));
							break;
							default: client.SARAH.speak(client.msg.err_localized('several_cron'));
							break;
						}		
				});
			} else {
				// New, create
				client.Sonosdb.insert({
							Program: program,
							Clients: clients,
							Plugin: plugin,
							Name: name,
							Order:order,
							Tempo: tempo,
							tts: tts,
							Exec: exec.toLowerCase(),
							Keys: key,
							Hour: hour,
							Days: days
					}, function(err, newDoc){
						if (!newDoc)
							client.SARAH.speak(newDoc.Name + ' ' + client.msg.err_localized('cron_not_saved'));
						else
							client.SARAH.speak(newDoc.Name + ' ' + client.msg.localized('cron_saved'));
					});		
			}		
	});		
}



// is it a good time to execute it ?
var istime = function (docDate, currentDate) {
	// 4 mn more -> cron starts all 5 minutes then 
	// if the docDate is not exactly a multiple of 5 the algo add 4 minutes and check
	// If the cron is modified for each 1 minute then remove the cron var and the substractdate (in the test too)
	var cron = 4,
        substractdate = moment(currentDate).add(cron, 'minutes').format("YYYY-MM-DDTHH:mm");
	if ((moment(substractdate).isAfter(docDate) == true && moment(currentDate).isBefore(docDate) == true ) || (moment(docDate).isSame(currentDate)== true ))
		return true;
	
	return false;
}


// is it a good day to execute it ?
var isday = function (days) {
	
	moment().weekday(1);
	if (days.substring(parseInt(moment().weekday()), (parseInt(moment().weekday()) + 1)) == '1')
		return true;

	return false;
}


var formatTask = function (task) {
	var keys={};
	if (task != undefined) {
		var keys={};
		var options, option;
		options = task.split('~');
		for (i=0;i<options.length;i++) {
			option = options[i].split('=');
			keys[option[0]] = option[1];
		}
	}
	return keys;
}


