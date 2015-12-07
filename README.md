# [Scenariz](http://encausse.net/s-a-r-a-h)

This plugin is an add-on for the framework [S.A.R.A.H.](http://encausse.net/s-a-r-a-h), an Home Automation project built 
on top of:
* C# (Kinect) client for Voice, Gesture, Face, QRCode recognition. 
* NodeJS (ExpressJS) server for Internet of Things communication


## Description

Créez vos scénarios:
- A exécution programmée, à l'heure et aux jours de la semaine de votre choix.
- A exécution immédiate ou différée.
- A exécution par règle en précisant:
	- Aujourd'hui, Demain, Après-demain.
	- Le jour, l'heure ou les minutes.
- Gestion des scénarios par dialogue:
	- Sarah vous donne l'état des scénarios.
	- Activation/Désativation.
	- Modification de l'heure, des minutes.
	- Modification des jours de programmation:
		- Semaine de travail.
		- Semaine entière.
		- En précisant les jours.
	- Suppression du programme.
- Aucune limite d'actions dans un scénario.


## Démarrage rapide
Téléchargez le plug-in et suivez la documentation. 
   
   
## Versions
Version 2.5 (07/12/2015)
- Ajout d'une règle "Supprime tous les programmes".

Version 2.4 (02/12/2015)
- Multiroom amélioré. Exécution du programme dans la pièce courante par clients=currentRoom. Ajouté pour la compatibilité avec le module "motionSensor" qui met dans un JSON la pièce courante par capteur de présence.
- Amélioration de l'exemple de scénario dynamique (exemple pour mettre un chauffage en donnant le jour et l'heure) maintenant possible en disant:
	- Aujourd'hui, Demain, Après-demain ou directement l'heure (le jour courant est alors aujourd'hui).

Version 2.3 (16/11/2015)
- Petite correction de la gestion de la propriété autodestroy
- Ajout d'une propriété speechStartOnRecord ('true' ou 'false') pour que Sarah dise le jour et l'heure d'enregistrement du scénario.
- Ajout d'un exemple de scénario dynamique (exemple pour mettre un chauffage en donnant le jour et l'heure).

Version 2.2 (après le 18/10/2015)
- Correction mineure de l'initialisation de la variable 'debug'

Version 2.1 (avant le 18/10/2015)
- Release.