
/*
messages
*/
var messages = {
	debug: "scenariz: mode debug activé.",
	cancel: "Terminé.",
	terminateSarahAsk: "De rien|je t'en pris|Avec plaisir",
	done: "ajouté.",
	'1': "une",
	askForsommaire: "Oui parfait ou oui ajoute. Suivant ou non merci. Lettre suivante. Inverse le sens. Quel est le sens. Terminé ou annulé.",
	cron_saved: "enregistré",
	cron_replaced: "remplacé",
	current_room: "est la pièce courante.",
	heure: "heure",
	generalCron: "Général",
	modifycron: "Modification du programme %s?",
	askTosommaire: "Oui parfait ou oui modifie. Suivant ou non merci. Inverse le sens. Quel est le sens. Terminé ou annule.",
	cron_sens_up: "Je te propose les programmes en montant",
	cron_sens_down: "Je te propose les programmes en descendant",
	selectedcron: "Programme %s",
	askModifyCron: "Que veux-tu faire?",
	askModifyCronNext: "Veux-tu faire autre chose?",
	askModifySommaire: "L'état. Activer ou Désactiver. L'heure, les minutes, les jours. Supprime-le ou terminé.",
	desactivateCron: "J'ai désactivé %d actions du programme %s",
	activateCron: "J'ai activé %d actions du programme %s",
	askDeleteCron: "Es-tu sûr ?",
	deleteCron: "J'ai supprimé le programme %s avec %d actions",
	terminateCron: "Terminé.",
	currentHourCron: "%s heure",
	askHourSommaire: "Baisse. Baisse beaucoup. Augmente. Augmente beaucoup. C'est bon ou terminé. Annule",
	currentMinuteCron: "%s minute",
	modifyHourCron: "J'ai modifié de %h heure pour %d actions du programme %s",
	modifyMinuteCron: "J'ai modifié de %h minute pour %d actions du programme %s",
	noModificationCron: "Aucune modification du programme %s",
	NewHourCron: "Nouvelle heure du programme: %s.",
	stateCron: "Le programme %s est %d pour le client %c. Il y a %a actions dans le programme. Début du programme à %h. Fin du programme à %z",
	stateAllCron: "Le programme %s est %d pour tous les clients. Il y a %a actions dans le programme. Début du programme à %h. Fin du programme à %z",
	prefixClients: ", le client",
	desactivatedCron: "désactivé",
	activatedCron: "activé",
	askWeekdaysCron: "quel jour à %s?",
	askDaysSommaire: "Active. Désactive. Toute la Semaine ou semaine de travail. 'Le' suivi d'un jour de la semaine. Terminé ou annulé.",
	workdaysOn: "J'ai activé la semaine de travail.",
	workdaysOff: "J'ai désactivé la semaine  de travail.",
	weekdaysOn: "J'ai activé la semaine complète.",
	weekdaysOff: "J'ai désactivé la semaine complète.",
	mondayOn: "J'ai activé le lundi.",
	mondayOff: "J'ai désactivé le lundi.",
	modifyDaysCron: "J'ai modifié les jours pour %d actions du programme %s",
	tuesdayOn: "J'ai activé le mardi.",
	tuesdayOff: "J'ai désactivé le mardi.",
	wednesdayOn: "J'ai activé le mercredi.",
	wednesdayOff: "J'ai désactivé le mercredi.",
	thursdayOn: "J'ai activé le jeudi.",
	thursdayOff: "J'ai désactivé le jeudi.",
	fridayOn: "J'ai activé le vendredi.",
	fridayOff: "J'ai désactivé le vendredi.",
	saturdayOn: "J'ai activé le samedi.",
	saturdayOff: "J'ai désactivé le samedi.",
	sundayOn: "J'ai activé le dimanche.",
	sundayOff: "J'ai désactivé le dimanche.",
	nbCron: "J'ai trouvé %d programme à modifier",
	nbminCron: "Début de la liste, veux-tu recommencer au début ?",
	nbmaxCron: "Fin de la liste, veux-tu recommencer au début ?",
	stateWeekdaysCronOn: "La semaine complète est activée.",
	stateWeekdaysCronOff: "La semaine complète est désactivée.",
	stateWorkdaysCronOn: "La semaine de travail est activée.",
	stateWekendCronOn: "Le weekend est activé.",
	stateMondayCronOn: "Le lundi",
	statetuesdayCronOn: "Le mardi",
	statewednesdayCronOn: "Le mercredi",
	statethursdayCronOn: "Le jeudi",
	statefridayCronOn: "Le vendredi",
	statesaturdayCronOn: "Le samedi",
	statesundayCronOn: "Le dimanche",
	statesresultsCronOn: "%d jours sont activés.",
	statesresultCronOn: "%d jour est activé.",
}	



/*
Errors messages
*/
var error_messages = {
	no_info: "Je suis désolé mais je ne peux pas te donner cette information.",
	cron_no_date: "Je suis désolé, le format de la date est incorrecte.",
	cron_no_plugin: "Je suis désolé, il n'y a pas de module à exécuter.",
	err_findplugin: "La programmation a échouée, il n'existe pas de module",
	not_replaced: "Je ne suis pas arrivé à remplacé",
	several_cron: "Il existe plusieurs programmes avec ce nom, il faudrait néttoyer la base.",
	cron_not_saved: "Je ne suis pas arrivé à sauvegarder le programme.",
	no_cron: "Il n'y a aucun programme enregistré",
	no_tts: "Je suis désolé, je n'ai pas compris",
}


	
exports.localized = function(msg){ return messages[msg]} 
exports.err_localized = function(msg){ return error_messages[msg]} 
exports.random_localized = function(msg){ var tblanswer = messages[msg].split('|');
										 return tblanswer[Math.floor(Math.random() * tblanswer.length)]}
