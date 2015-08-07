/*
	Author: Stéphane Bascher
	Specific Scenarios Cron management for Sarah
	Date: March-17-2015 - Version: 1.0 - Creation of the module
	Date: April-04-2015 - Version: 2.0 - Adding immediate/time-out execution. Wow!! yes i did it & it works fine!! :-D
*/

var moment = require('../moment/moment');
moment.locale('fr');

// Init js
var nedbClient = module.exports = function (opts) {
	//Dirty hack
	nedbobj = this;

	if (!(this instanceof nedbClient)) {
		return new nedbClient(opts);
	}
	
	opts = opts || {};
	this.SARAH = this.SARAH || opts.sarah;
	this.lang = this.lang || opts.lang || 'FR_fr'; //FR_fr at least by default
	this.msg = this.msg || require('../lang/' + this.lang);
	this.Scenarizdb = this.Scenarizdb || this.dbinit();
	this.ScenarizdbnoCron = this.ScenarizdbnoCron || this.dbinitnoCron();
	this.sarahClient = this.sarahClient || opts.sarahClient;
	this.debug = this.debug || opts.debug || 'true' ; 
	
	// Save action
	this.save = function (program,plugin,name,order,tempo,exec,key,tts,autodestroy,mute,fifo,hour,days,clients) {this.dbsave(program,plugin,name,order,tempo,exec,key,tts,autodestroy,mute,fifo,hour,days,clients)};
	// Exec action
	this.exec = function (program,timeout) {this.dbexec(program,timeout,nedbobj,nedbobj.callback_play)};
	// execute Cron action
	this.cron = function () {this.dbcron(this.Scenarizdb, function (tbl_pl_list) {
								nedbobj.callback_play(tbl_pl_list,1,nedbobj,nedbobj.callback_play, function () {
									nedbobj.dbcron(nedbobj.ScenarizdbnoCron, function (tbl_pl_list_nocron) {
										nedbobj.callback_play(tbl_pl_list_nocron,1,nedbobj,nedbobj.callback_play, function() {
											nedbobj.removeNoCron(nedbobj.ScenarizdbnoCron,tbl_pl_list_nocron,0,nedbobj.removeNoCron, function () {
												nedbobj.removeAutoDestroys(nedbobj.Scenarizdb,nedbobj);
											});
										});
									});
								});
							});
							};
	this.remove	= function (program,name) {this.removeCron(program,name)};				
	// Manage Cron action
	this.manage = function () {this.dbmanage()};
}


nedbClient.prototype.removeNoCron = function (db, docs, pos, callback, callbackNext) {
	
	if (!callback || pos == docs.length) return callbackNext();
	db.remove({ _id: docs[pos]._id }, function (err, numRemoved) {
		setTimeout(function(){
			callback(db,docs,++pos,callback, callbackNext);
		}, 500);
	});
}



nedbClient.prototype.removeAutoDestroys = function (db,client) {
	
	var date = moment().format("YYYY-MM-DD"),
		currentDate = moment().format("YYYY-MM-DDTHH:mm"),
		substractdate = moment(currentDate).subtract(5, 'minutes').format("YYYY-MM-DDTHH:mm");	
	
	db.find({ Autodestroy : "true" }, function (err, docs) {
		if (err){
			console.log("Enable to retrieve db autodestroy items, error: " + err);
			return;
		}	
		if (client.debug == 'true') console.log("nb autodestroy docs: " + docs.length);
		
		var tbl_pl_list = [],
		    pending = docs.length;
			
		docs.forEach(function (doc) {
			doc.Hour =  ((doc.Hour.indexOf (':') == 1) ? '0'+ doc.Hour : doc.Hour);	
			var docDate = date+'T'+doc.Hour;
			
			if (moment(docDate).isBefore(substractdate) == true  || moment(docDate).isSame(substractdate)== true )
				tbl_pl_list.push(doc);
				
			if (!--pending) 
				client.removeAutoDestroy (db,tbl_pl_list,0,client.removeAutoDestroy);;
		});
	});	
		
}


nedbClient.prototype.removeAutoDestroy = function (db,docs,pos,callback) {
	
	if (!callback || pos == docs.length) return;
	// Added after used this plugin to program tv channel, the way is to remove the program after its execution.
	// A Autodestroy key added.
	db.remove({ _id: docs[pos]._id }, function (err, numRemoved) {
		setTimeout(function(){
			callback(db,docs,++pos,callback);
		}, 500);
	});
}


nedbClient.prototype.removeCron = function (program,name) {
	var client = this;
	
	client.Scenarizdb.findOne({Program:program, Name:name}, function (err, doc) {
			if (err){
				console.log("Enable to retrieve Scenariz Cron, error: " + err);
				return;
			}
			
			if (doc) {
				client.Scenarizdb.remove({ _id: doc._id }, function (err, numRemoved) {
					if (client.debug == 'true') console.log("Cron Removed: " + name);
				});
			} else {
				if (client.debug == 'true') console.log("Cron not removed: " + name);
			}
	});		
}



// Init nedb database
nedbClient.prototype.dbinit = function () {
	var dbstore = require('../nedb'),
	    dbfile = __dirname + '/Scenariz.db',
	    db = new dbstore({ filename: dbfile});
	db.loadDatabase();
	return db; 
}



// Init nedb noCron database
nedbClient.prototype.dbinitnoCron = function () {
	var dbstore = require('../nedb'),
		dbfile = __dirname + '/ScenariznoCron.db',
		dbnoCron = new dbstore({ filename: dbfile});
	dbnoCron.loadDatabase();
	return dbnoCron; 
}



// Execute the module
nedbClient.prototype.callback_play = function (tbl_pl_list,next,client,callback,callbackNext) {
	
	if (!callback) return;
	if (next > tbl_pl_list.length) {
		if (callbackNext) {
			return callbackNext();
		} else {
			return;
		}
	}
	
	var pl = {};
	for (var i=0;i<tbl_pl_list.length;i++) {
		pl = tbl_pl_list[i];
		if (parseInt(pl.Order) == next)
			break;
	}
	
	var plugins=client.SARAH.ConfigManager.getConfig(),
		flagfound = false;
	var pending = Object.keys(plugins.modules).length;
	Object.keys(plugins.modules).forEach(function(plugin) {
		if (plugin==pl.Plugin) 
			flagfound = true;
		
		if (!--pending) {
			if (client.debug == 'true') console.log("Next: " + next + ' & Order: ' + pl.Order);
			switch (flagfound) {
				case true:
					var speech = pl.Speech;
					var ExecTask = {};
					ExecTask = formatTask(pl.Keys);
					client.SARAH.call(pl.Plugin, ExecTask, function(cb){ 
						if(pl.Fifo && pl.Fifo == 'true') {
							client.Scenarizdb.remove({ _id: pl._id }, function (err, numRemoved) {
							});
						}					
						if (client.debug == 'true') {
							console.log("pl.Plugin: " + pl.Plugin);
							if (pl.Speech) console.log("pl.Speech: " + pl.Speech);
						}	
						if (pl.Speech) { 
							if (cb.tts && cb.tts.length > 0) {
								if (client.debug == 'true') { 
									console.log("cb.tts: " + cb.tts);
									console.log("pl.Speech && cb.tts");
								};
								if (pl.Speech.indexOf("%s" != -1)) {
									pl.Speech = pl.Speech.replace ('%s', cb.tts);
									client.SARAH.speak(pl.Speech, function(){
										setTimeout(function(){			
											callback(tbl_pl_list,++next,client,callback,callbackNext);
										}, parseInt(pl.Tempo));
									});
								} else {
									client.SARAH.speak(pl.Speech, function () { 
										client.SARAH.speak(cb.tts, function(){  
											setTimeout(function(){ 
												callback(tbl_pl_list,++next,client,callback,callbackNext);
											}, parseInt(pl.Tempo));
										});
									});	
								}
							} else {
								if (speech == pl.Speech) {
									if (client.debug == 'true') console.log("pl.Speech");
									client.SARAH.speak(pl.Speech, function(){  
										setTimeout(function(){
											callback(tbl_pl_list,++next,client,callback,callbackNext);
										}, parseInt(pl.Tempo));
									});
								}
							}
						} else {
							if (cb.tts && cb.tts.length > 0) {
								if (client.debug == 'true') console.log("cb.tts");
								client.SARAH.speak(cb.tts, function(){  
									setTimeout(function(){
										callback(tbl_pl_list,++next,client,callback,callbackNext);
									}, parseInt(pl.Tempo));
								});
							} else {
								if (client.debug == 'true') console.log("no tts");
								setTimeout(function(){
									callback(tbl_pl_list,++next,client,callback,callbackNext);
								}, parseInt(pl.Tempo));
							}
						}
					});
					break;
				default:
					client.SARAH.speak(client.msg.err_localized('err_findplugin') + ' ' + pl.Plugin, function() {
						setTimeout(function(){
								callback(tbl_pl_list,++next,client,callback,callbackNext);
						}, parseInt(pl.Tempo));
					});
					break;
			}
		}
	});
}



// Exec cron 
nedbClient.prototype.dbexec = function (program, timeout, client, callback) {
	
	client.Scenarizdb.find({Program:program}, function (err, docs) {	
		if (err){
			console.log("Enable to retrieve db items, error: " + err);
			return;
		}
		
		if (client.debug == 'true') console.log("Timeout: " + timeout);
		
		var tbl_pl_list = [],
			tbl_pl_list_start = [],
			tbl_pl_list_next = [],
			date = moment().format("YYYY-MM-DD"),	
			timeHour = moment().add(timeout,'minutes'),
			currentHour = timeHour.format("HH:mm");
		
		if (client.debug == 'true')	console.log("current hour: " + currentHour);
		
		for (var e=0; e<docs.length;e++ ) {
			var ClientsList = docs[e].Clients.split('|');
			for ( z=0; z<ClientsList.length;z++ ) {
				if (ClientsList[z].toLowerCase() == client.sarahClient.toLowerCase() || ClientsList[z].toLowerCase() == 'all' ) {	
					tbl_pl_list.push(docs[e]);
				}	
			}
		}
	
		// Buble sort
		for (var i=0;i<tbl_pl_list.length;i++) {
			for (var a=0;a<tbl_pl_list.length;a++) {
				var tempdoc = {};
				if ( moment(date+'T'+tbl_pl_list[a].Hour).isAfter(date+'T'+tbl_pl_list[i].Hour) == true) {
					tempdoc = tbl_pl_list[i];
					tbl_pl_list[i] = tbl_pl_list[a];
					tbl_pl_list[a] = tempdoc;
				} else if (moment(date+'T'+tbl_pl_list[a].Hour).isSame(date+'T'+tbl_pl_list[i].Hour) == true) {
					if (parseInt(tbl_pl_list[a].Order) > parseInt(tbl_pl_list[i].Order)) {
						tempdoc = tbl_pl_list[i];
						tbl_pl_list[i] = tbl_pl_list[a];
						tbl_pl_list[a] = tempdoc;
					}
				}
			}
			
			if (i+1 == tbl_pl_list.length) {
				var startHour = tbl_pl_list[0].Hour;
				var docHour = moment(date+'T'+tbl_pl_list[0].Hour);
				tbl_pl_list[0].Hour = currentHour;
				var diffMn = parseInt(timeHour.diff(docHour,"minutes"));
				if (client.debug == 'true') console.log("Difference of minutes: " + diffMn);
				
				for (a=1;a<tbl_pl_list.length;a++) {
					var newHour;
					if (tbl_pl_list[a].Hour == startHour) {
						newHour = currentHour;
					} else {
						var docHour = moment(date+'T'+tbl_pl_list[a].Hour);
						if (diffMn >= 0) 
							newHour = moment(docHour).add(diffMn, 'minutes').format("HH:mm");
						else {
							diff = diffMn * -1;
							newHour = moment(docHour).subtract(diff, 'minutes').format("HH:mm");
						}
						newHour =  ((newHour.indexOf (':') == 1) ? '0'+ newHour : newHour);	
					}
					tbl_pl_list[a].Hour = newHour;
					
					if (a+1 == tbl_pl_list.length) {	
						for (b=0;b<tbl_pl_list.length;b++) {
							if (tbl_pl_list[b].Hour == currentHour && timeout <= 4) {
								tbl_pl_list_start.push(tbl_pl_list[b]);
								if (client.debug == 'true') console.log(tbl_pl_list[b].Name + ' a ' + tbl_pl_list[b].Hour + ' ordre ' + tbl_pl_list[b].Order);	
							} else {
								tbl_pl_list_next.push(tbl_pl_list[b]);
								if (client.debug == 'true') console.log(tbl_pl_list[b].Name + ' a ' + tbl_pl_list[b].Hour + ' ordre ' + tbl_pl_list[b].Order);	
							}
				
							if (b+1 == tbl_pl_list.length) {	
								if (tbl_pl_list_next.length > 0) {
									client.addNextItem (tbl_pl_list_next,0,client,client.addNextItem,function(){
										callback (tbl_pl_list_start,1,client,callback);	
									});
								} else
									callback (tbl_pl_list_start,1,client,callback);
							}
						}
					}	
				}
			}
		}
	});
}



nedbClient.prototype.addNextItem = function(docs,pos,client,callback,callbacknext) { 

	if (!callback) return;
	if (pos == docs.length)
		return callbacknext();
	
	client.ScenarizdbnoCron.findOne({Program:docs[pos].Program, Name:docs[pos].Name}, function (err, docfound) {
			if (err){
				console.log("Enable to replace Scenariz Cron, error: " + err);
				return callback(docs,++pos,client,callback,callbacknext);
			}
			
			if (docfound) {
				// Doc found, just replace
				client.ScenarizdbnoCron.update({_id:docfound._id}, { $set:{	Clients: docs[pos].Clients,
																	Plugin: docs[pos].Plugin,
																	Order: docs[pos].Order,
																	Tempo: docs[pos].Tempo,
																	Speech: docs[pos].Speech,
																	Autodestroy: docs[pos].Autodestroy,
																	Exec: 'true',
																	Keys: docs[pos].Keys,
																	Fifo: docs[pos].Fifo,
																	Hour: docs[pos].Hour,
																	Days: docs[pos].Days
																}}, {}
					, function(err, numReplaced){
						if (numReplaced == 0 || err)
							console.log("Enable to replace Scenariz Cron, error: " + ((err) ? err : ''));
						callback(docs,++pos,client,callback,callbacknext);	
				});
			} else {
				// New, create
				client.ScenarizdbnoCron.insert({
							Program: docs[pos].Program,
							Clients: docs[pos].Clients,
							Plugin: docs[pos].Plugin,
							Name: docs[pos].Name,
							Order: docs[pos].Order,
							Tempo: docs[pos].Tempo,
							Speech: docs[pos].Speech,
							Autodestroy: docs[pos].Autodestroy,
							Exec: 'true',
							Keys: docs[pos].Keys,
							Fifo: docs[pos].Fifo,
							Hour: docs[pos].Hour,
							Days: docs[pos].Days
					}, function(err, newDoc){
						if (!newDoc || err)
							console.log("Enable to create Scenariz Cron, error: " + ((err) ? err : ''));
						callback(docs,++pos,client,callback,callbacknext);
					});		
			}		
	});		
}




// Search for modules to execute
nedbClient.prototype.dbcron = function (db, callback) {
	var client = this;
	// current date & hour
	var date = moment().format("YYYY-MM-DD"),
	    hour = moment().format("HH:mm");
	
	db.find({ Exec : "true" }, function (err, docs) {
		if (err){
				console.log("Enable to retrieve db items, error: " + err);
				return;
		}
		var tbl_pl_list = [],
		    pending = docs.length;
		if (pending == 0)
			 return callback (tbl_pl_list)
			
		if (client.debug == 'true') console.log("dbcron nb docs: " + pending);
		docs.forEach(function (doc) {
			doc.Hour =  ((doc.Hour.indexOf (':') == 1) ? '0'+ doc.Hour : doc.Hour);		
			if (isday(doc.Days) && istime((date+'T'+doc.Hour), (date+'T'+hour))) {
				if (client.debug == 'true') console.log("dbcron is time to: " + doc.Name);
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
	client.Scenarizdb.find({}, function (err, docs) {	
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
				
				if (!--pending) {
					client.SARAH.speak(client.msg.localized('nbCron').replace('%d',progList.length),function() {
						setTimeout(function(){
							if (exists('mute',client) == true) 
								client.SARAH.call('mute', {command : 'autoMute', values : {Cmd: 'askme', Options: {timeout: false}}});
						
							askCron(progList,0,client,client.SARAH,"up",askCron);
						}, 1500);
					});
				}
			});
		}	
	});
	
}



var exists = function(cmd,client){

  var config = client.SARAH.ConfigManager.getConfig();
  if (config.modules[cmd])
    return true;

  return false;
}


var askCron = function (progList,pos,client,SARAH,sens,callback) {
	
	if (!callback) return;
	if (pos < 0 || pos == progList.length) {
		if (pos < 0)
			var tts = client.msg.localized('nbminCron')
		else if (pos == progList.length)
			var tts = client.msg.localized('nbmaxCron')
		SARAH.askme(tts, { 	
			'oui parfait' : 'yes',
			'oui s\'il te plait' : 'yes',
			'non terminé': 'cancel',
			'non merci Sarah': 'cancel',
			'annule' : 'cancel'
			}, 0, function(answer, end){
				switch (answer) {
				case 'yes':
					callback (progList,0,client,SARAH, "up",callback);	
					end();
					break;
				case 'cancel':
				default:
					SARAH.speak(client.msg.localized('terminateCron'),function() {
						end(true);
					});
					break;
				}
		});
	} else {
		askTo(progList,pos,client,SARAH,sens,function (pos,sens) {
			if (sens == "up") ++pos;
			if (sens == "down") --pos;
			callback(progList,pos,client,SARAH,sens,callback) 
		});
	}

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
			'merci sarah' : 'Sarahcancel',
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
			case 'SARAHcancel':
			case 'Sarahcancel':
				SARAH.speak(client.msg.random_localized('terminateSarahAsk'), function() { 
					end(true);
				});	
				break;	
			case 'cancel':
				SARAH.speak(client.msg.localized('cancel'),function(){
					if (client.debug == 'true') console.log("Cancel modification");
					end(true);
				});
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
			'donne-moi l\'état' : 'state',
			'activer' : 'activate',
			'qu\'est ce que je peux dire' : 'sommaire',
			'supprime-le' : 'delete',
			'désactiver' : 'desactivate',
			'les minutes' : 'minute',
			'l\'heure' : 'hour',
			'les jours' : 'day',
			'merci sarah' : 'Sarahcancel',
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
					if (clients.toLowerCase() == 'all')
						var ttsState = client.msg.localized('stateAllCron').replace('%s', program).replace('%d', state).replace('%h', hour).replace('%z', hourlast).replace('%a', nbactions).replace(' 1 ', ' ' + client.msg.localized('1') + ' ');
					else {
						clients = clients.replace('|', client.msg.localized('prefixClients') + ' ');
						var ttsState = client.msg.localized('stateCron').replace('%s', program).replace('%d', state).replace('%c', clients).replace('%h', hour).replace('%z', hourlast).replace('%a', nbactions).replace(' 1 ', ' ' + client.msg.localized('1') + ' ');
					}
					SARAH.speak(ttsState ,function(){
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
			case 'SARAHcancel':
			case 'Sarahcancel':
				SARAH.speak(client.msg.random_localized('terminateSarahAsk'));	
				end(true);
				break;	
			case 'cancel':
			default:
				SARAH.speak(client.msg.localized('terminateCron'));
				end(true);
				break;
			}
	}); 
	
}




var updateCron = function (cron, state, client, SARAH, callback){
	
	switch (state)  {
		case 'state':
			client.Scenarizdb.find({Program: cron, Order:'1'}, function (err, docs) {	
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
						client.Scenarizdb.find({Program: cron}, function (err, docs) {
							callback(state,hour,days,docs.length,hourlast,clients);
						});
					}
				});	
			});
			break;
		case 'hour':	
		case 'minute':	
		case 'day':
			client.Scenarizdb.find({Program: cron, Order:'1'}, function (err, docs) {	
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
						client.Scenarizdb.find({Program: cron}, function (err, docs) {
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
			client.Scenarizdb.update({Program:cron}, { $set: {Exec: state}}, { multi: true }, function (err, numReplaced) {	
				if (err) {
					console.log("Enable to retrieve program, error: " + err);
					numReplaced = 0;
				}
				callback(numReplaced);
			});
			break;
		case 'delete':
			SARAH.askme(client.msg.localized('askDeleteCron'), { 
				'Oui' : 'deleteCron',
				'non' : 'cancel',
				'annule' : 'cancel'
			}, 0, function(answer, end){
				switch (answer) {
					case 'deleteCron':
						client.Scenarizdb.remove({Program:cron}, { multi: true }, function (err, numRemoved) {	
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
					client.Scenarizdb.update({Program:cron}, { $set: {Days: days}}, { multi: true }, function (err, numReplaced) {	
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
	client.Scenarizdb.update({_id: doc._id}, { $set: {Hour: newHour}}, {}, function (err, numReplaced) {	
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
	client.Scenarizdb.update({_id: doc._id}, { $set: {Hour: newHour}}, {}, function (err, numReplaced) {	
		if (err)
			console.log("Enable to update " + doc.Name + ' error: ' + err);
	    if (numReplaced == 0)
			console.log("Enable to update " + doc.Name);
		
		callback(diffHour, docs, ++pos, client, callback, callbackNext);
	});
}




// Save module in db
nedbClient.prototype.dbsave = function (program,plugin,name,order,tempo,exec,key,tts,autodestroy,mute,fifo,hour,days,clients) {
	var client = this;
	client.Scenarizdb.findOne({Program:program, Name:name}, function (err, docfound) {
			if (err){
				console.log("Enable to retrieve Scenariz Cron, error: " + err);
				return;
			}
			
			if (docfound) {
				// Doc found, just replace
				client.Scenarizdb.update({_id:docfound._id}, { $set:{	Clients: clients,
																	Plugin: plugin,
																	Order: order,
																	Tempo: tempo,
																	Speech: tts,
																	Autodestroy: autodestroy,
																	Exec: exec.toLowerCase(),
																	Keys: key,
																	Fifo: fifo,
																	Hour: hour,
																	Days: days
																}}, {}
					, function(err, numReplaced){
						if (mute == 'true'){
							switch (numReplaced){
								case 0: console.log(client.msg.err_localized('not_replaced') + ' ' + docfound.Name);
								break;
								case 1: console.log(docfound.Name +  ' ' + client.msg.localized('cron_replaced'));
								break;
								default: console.log(client.msg.err_localized('several_cron'));
								break;
							}
						} else {
							switch (numReplaced){
								case 0: client.SARAH.speak(client.msg.err_localized('not_replaced') + ' ' + docfound.Name);
								break;
								case 1: client.SARAH.speak(docfound.Name +  ' ' + client.msg.localized('cron_replaced'));
								break;
								default: client.SARAH.speak(client.msg.err_localized('several_cron'));
								break;
							}		
						}
				});
			} else {
				// New, create
				client.Scenarizdb.insert({
							Program: program,
							Clients: clients,
							Plugin: plugin,
							Name: name,
							Order:order,
							Tempo: tempo,
							Speech: tts,
							Autodestroy: autodestroy,
							Exec: exec.toLowerCase(),
							Keys: key,
							Fifo: fifo,
							Hour: hour,
							Days: days
					}, function(err, newDoc){
						if (!newDoc) {
							if (mute == 'true') {
								console.log(newDoc.Name + ' ' + client.msg.err_localized('cron_not_saved'));
							} else {
								client.SARAH.speak(newDoc.Name + ' ' + client.msg.err_localized('cron_not_saved'));
							}
						} else {
							if (mute == 'true') {
								console.log(newDoc.Name + ' ' + client.msg.localized('cron_saved'));
							} else {
								client.SARAH.speak(newDoc.Name + ' ' + client.msg.localized('cron_saved'));
							}
						}
					});		
			}		
	});		
}



// is it a good time to execute it ?
var istime = function (docDate, currentDate) {
	// 4 mn more -> cron starts all 5 minutes then 
	// if the docDate is not exactly a multiple of 5 the algo add 4 minutes and check
	// If the cron is modified for each 1 minute then set the cron var to 0 (var cron = 0)
	// I didn't checked that but it has to work... because i'm a best, good reason :-D
	
	var cron = 4,
        substractdate = moment(currentDate).add(cron, 'minutes').format("YYYY-MM-DDTHH:mm");
	
	if ((moment(substractdate).isAfter(docDate) == true && moment(currentDate).isBefore(docDate) == true ) || (moment(docDate).isSame(currentDate)== true ) || (moment(substractdate).isSame(docDate)== true ))
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


