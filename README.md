# [Scenariz](http://encausse.net/s-a-r-a-h)

## EN CONSTRUCTION
zip inclu: scenariz SARAH V3 !!


This plugin is an add-on for the framework [S.A.R.A.H.](http://encausse.net/s-a-r-a-h), an Home Automation project built 
on top of:
* C# (Kinect) client for Voice, Gesture, Face, QRCode recognition. 
* NodeJS (ExpressJS) server for Internet of Things communication


## Description

Scenariz permet de créer des scénarios sous de multiples formes avec toutes les actions des plugins installés dans Sarah. 

Il n'y a aucune limite au nombre de scénarios et d'actions dans un scénario.

- A exécution programmée, à l'heure et aux jours de la semaine de votre choix.
	- Réveil, tâches domotiques, etc...
- A exécution immédiate ou différée par règle.
	- Exécution d'un groupe d'actions (par exemple, on part -> fermeture des volets, éteindre les lumières, baisser le chauffage, activer l'alarme, etc...)
	- Possibilité de différer en précisant:
		- Le jour, l'heure ou les minutes.
		- Aujourd'hui, demain ou après-demain.
- Gestion et modification des scénarios par dialogue en le sélectionnant vocalement.
	- Etat du scénario.
		- Si il est actif ou inactif.
		- Heure et jour(s) de la semaine de son exécution.
	- Activation/Désativation d'un scénario.
	- Modification de l'heure et des minutes vocalement.
	- Modification des jours d'exécution vocalement
		- Semaine de travail.
		- Semaine entière.
		- En précisant les jours de la semaine.
	- Suppression du scénario.

## Compatibilité
- Scenariz V 3.0 est compatible Sarah V3 et Sarah V4.


## Installation
- Téléchargez et dézippez le fichier 'SARAH-scenariz-master.zip' dans le répertoire plugins de Sarah.
	- Supprimez le dernier répertoire du chemin proposé pour ne pas avoir de doublon de répertoire.
- Renommez le répertoire créé en 'scenariz'.

### sarah.js
Le plugin utilise la fonction askme de Sarah pour la gestion vocale des scénarios. Cette fonction a été corrigée et améliorée pour scenariz.
- Localisation du fichier sarah.js d'origine de Sarah:
	- Pour la V3: SARAH\script\manager
	- Pour la V4: SARAH\server\app\server
- Copiez le fichier sarah.js d'origine en sarah.ori
- Copiez/collez le fichier SARAH\scenariz\install\'version'\sarah.js dans son répertoire de localisation.
 
##### Important:
Si vous utilisez la fonction askme dans d'autres plugins, vous devrez modifier tous les appels à la fonction end() de la fonction askme() de vos plugins par end(true).

Existant:
```javascript
 SARAH.askme("message", {
	'regle' : 'tag1',
	'regle' : 'tag2'
	}, 1000, function (answer, end) {
		switch (answer) {
		case 'tag1':
				// action...
				end();
				break;
		case 'tag2':
				// action...
				end();
		}
	});
```
A modifier par:
```javascript
 SARAH.askme("message", {
	'regle' : 'tag1',
	'regle' : 'tag2'
	}, 1000, function (answer, end) {
		switch (answer) {
		case 'tag1':
				// action...
				end(true);
				break;
		case 'tag2':
				// action...
				end(true);
		}
	});
```

## 1: Créer un scénario
- La création d'un scénario se fait dans le fichier scenariz.xml.
- Chaque action d'un scénario est une règle à définir.
- Après avoir créé une règle du scénario, il faut la vocaliser pour l'ajouter dans la base de données de scenariz. Cette action n'est à faire qu'une seule fois.

### Commençons simple
Supposons un scénario qui commence par faire dire à Sarah une petite phrase.

Il nous faut au minimum:
- Un nom pour le scenario, je vais l'appeler "Démonstration".
- Un nom pour l'action dans le scénario, je vais l'appeler "Phrase de début".
- Une séquence de définition de l'heure, des minutes et des jours de la semaine pour l'action.
- Le plugin Sarah qui exécute l'action.
- Les tags (clés) de l'action du plugin Sarah.
	- Toutes ces valeurs sont en fait les tags de la règle (action) dans le xml du plugins lorsque vous l'exécutez.

Traduisons ça dans un language qui nous convient, c'est à dire des tags pour la règle de l'action dans le scenariz.xml.
- out.action.program="Démonstration"
	- Le Tag 'program' du nom du scénario.
	- Obligatoire dans vos scénarios.
- out.action.name="Phrase de début"
	- Le Tag 'name' du nom de l'action.
	- Obligatoire dans vos scénarios.
- out.action.start="15:30-1111111"
	- Le Tag 'start' de la séquence d'exécution l'heure:minute et les jours de la semaine. (7 valeurs: 1 actif, 0 inactif) séparée par un tiret (-).
	- Je l'ai donc défini à 15h30mn tous les jours.
	- Obligatoire dans vos scénarios.
- out.action.plug="scenariz"
	- Le Tag 'plug' du plugin qui exécute l'action du scénario
	- Obligatoire dans vos scénarios.
- out.action.key="command=speech~text=c'est la phrase de début du scénario de démonstration."
	- Le Tag 'key' des clés dont l'action a besoin pour s'exécuter.
	- Format: Tag=Valeur séparés par un tilde (~)
	- Non obligatoire dans vos scénarios.
	- Dans le xml du plugin scenariz (clé out.action.plug juste au dessus), nous aurions pu avoir une règle qui aurait eu ces tags:
		- out.action.command="speech";out.action.text="c'est la phrase de début du scénario de démonstration."
		- On notera que cette règle n'existe pas bien qu'elle aurait pû. Pourquoi ? Parce qu'il n'est pas necessaire d'avoir une règle dans un xml coté client. Ce qui compte, c'est son exécution dans le js du plugin, coté serveur.
		- Mémorisez donc cette règle pour faire dire une phrase à Sarah dans vos scénarios :-)
		
Il faut maintenant écrire une règle avec une phrase à vocaliser "Début de la démonstration" en y incluant ces tags:
```xml
 <rule id="rulescenariz">
    <tag>out.action=new Object()</tag>
	<item>Sarah</item>
	 
	<one-of>
		<!-- Gestion et modification des programmes, les programmes doivent exister-->		
		<item>gestion des programmes<tag>out.action.command="ManageCron"</tag></item>
		<item>Supprime tous les programmes<tag>out.action.command="RemoveAllCron"</tag></item>
		
		<!-- Clé de création du scénario Démonstration -->
		<item>Début de la démonstration<tag>out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="Phrase de début";out.action.plug="scenariz";out.action.start="15:30-1111111";out.action.key="command=speech~text=c'est la phrase de début du scénario de démonstration."</tag></item>
```				
Nous pouvons voir une clé qui n'a pas eu d'explication, la clé out.action.command="ScenarizCron":
- Cette clé est 'LA' clé de création d'une action de scénario dans le plugin scenariz. Elle est obligatoire !
		
Il nous reste maintenant à passer cette règle pour l'ajouter dans la base de scenariz.
- Dites: 
```text
SARAH Début de la démonstration
```
Sarah vous répond:
```text
Phrase de début enregistré
```
Vous venez de créer un scénario qui s'éxécute tous les jours à 15h30.

### Modification simple	
Nous allons maintenant modifier la phrase et l'heure de l'action dans notre scénario parce que nous nous sommes trompé (ben quoi, ça arrive...).
- Nouvelle heure: 20h15
- Nouvelle phrase: Bonjour, je dois dire quelque chose au début du scénario.

Pour modifier une action d'un scénario, modifier les valeurs des tags associés directement dans la règle et rejouez la règle.
```xml	
<!-- ICI -->
<item>Début de la démonstration<tag>out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="Phrase de début";out.action.plug="scenariz";out.action.start="20:15-1111111";out.action.key="command=speech~text=Bonjour, je dois dire quelque chose au début du scénario."</tag></item>
```		
- Dites: 
```text
SARAH Début de la démonstration
```
Sarah vous répond:
```text
Phrase de début remplacé
```
Vous venez de modifier l'action du scénario.

### Si on exécutait ce petit scénario ?
Nous venons de créer un scénario à exécution programmé (tous les jours à 20h15). Néanmoins, un scénario peut être à exécution programmé ou à exécution immédiate par règle sans modification.

Il suffit juste de créer une règle dans le scenariz.xml qui exécute ce scénario
Il nous faut:
- Une règle à jouer "fais nous une petite démo".
- Un Tag out.action.command="ExecCron" qui est 'LA' clé d'exécution d'un scénario.
	- Obligatoire
- Un Tag out.action.program="Démonstration" pour donner le nom du scénario.
	- Obligatoire avec le nom du scénario
	
Ce qui donne dans le scenariz.xml:
```xml
 <rule id="rulescenariz">
    <tag>out.action=new Object()</tag>
	<item>Sarah</item>
	 
	<one-of>
		<!-- Gestion et modification des programmes, les programmes doivent exister-->		
		<item>gestion des programmes<tag>out.action.command="ManageCron"</tag></item>
		<item>Supprime tous les programmes<tag>out.action.command="RemoveAllCron"</tag></item>
		
		<!-- Clé de création du scénario Démonstration -->
		<item>Début de la démonstration<tag>out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="Phrase de début";out.action.plug="scenariz";out.action.start="15:30-1111111";out.action.key="command=speech~text=Bonjour, je dois dire quelque chose au début du scénario."</tag></item>

		<!-- Scénario Démonstration -->
		<item>fais nous une petite démo<tag>out.action.command="ExecCron";out.action.program="Démonstration"</tag></item>
```		
Il nous reste maintenant à jouer ce scénario.
- Dites: 
```text
SARAH fais nous une petite démo
```
Sarah exécute:
```text
Bonjour, je dois dire quelque chose au début du scénario.
```



 
		
		
		
		
		













Téléchargez le plug-in et suivez la documentation. 
   
   
## Versions
Version 2.7 (13/12/2015)
- Correction du bug à l'exécution d'un scénario immédiat avec une seule action en différé. Testé avec un différé d'une minute.

Version 2.6 (11/12/2015)
- Correction du bug à l'exécution d'un scénario immédiat avec une seule action.

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