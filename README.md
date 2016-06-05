Scenariz
========

This plugin is an add-on for the framework [S.A.R.A.H.](http://encausse.net/s-a-r-a-h), an Home Automation project built 
on top of:
* C# (Kinect) client for Voice, Gesture, Face, QRCode recognition. 
* NodeJS (ExpressJS) server for Internet of Things communication

## Introduction
- Scenariz permet de créer des scénarios d'actions en utilisant les règles de plugins.
	- Si une action peut être jouée par une règle XML coté client où directement depuis le js coté serveur, alors Scenariz peut utiliser cette action comme une action de scénario. 
- Aucune limite au nombre de scénarios et d'actions dans un scénario.
- Gère le multi-room.
	- Un scénario ou une action dans un scénario peut être défini(e) pour n'être exécuté(e) que pour le(s) client(s) associé(s). 
	
##### Types de scénarios
- A exécution programmée, à l'heure et aux jours de la semaine de votre choix.
	- Réveil, tâches domotiques, programmation, etc...
- A exécution immédiate ou différée par règle.
	- Par exemple, si vous voulez exécuter immédiatement ce genre d'actions : 
		- Fermeture des volets puis extinction les lumières puis réduire le chauffage puis activer l'alarme, etc...
	- Possibilité de différer un scénario à une seule action en précisant:
		- L'heure ou les minutes.
		- Aujourd'hui, demain ou après-demain.
		
##### Gestion
- Gestion et modification des scénarios par dialogue.
	- Etat du scénario.
		- Si il est actif ou inactif.
		- Nombre d'actions dans le scénario.
		- Heure et jour(s) de la semaine de son exécution.
	- Activation/Désactivation d'un scénario.
	- Modification de l'heure et minutes.
		- par plage de 5mn ou 15mn.
		- par plage de 1h ou 5h.
	- Modification des jours d'exécution, soit:
		- La semaine de travail.
		- La semaine entière.
		- En précisant les jours de la semaine.
	- Suppression du scénario.

## Table des matières
- [Compatibilité](#compatibilité)	
- [Installation](#installation)		
- [Créer un scénario](#créer-un-scénario)	
	- [Créer une action](#créer-une-action)
	- [Modifier une action](#modifier-une-action)
	- [Exécuter le scénario](#exécuter-le-scénario)
	- [Créer une 2ème action](#créer-une-2ème-action)
	- [Créer une 3ème action](#créer-une-3ème-action)
	- [Optimiser le scénario](#optimiser-le-scénario)
	- [Changer le type du scénario](#optimiser-le-type-du-scénario)
	- [Tags spéciaux pour la création d'actions](#tags-spéciaux-pour-la-création-dactions)
- [Lancer un scénario à exécution immédiate avec un différé](#lancer-un-scénario-à-exécution-immédiate-avec-un-différé)
	- [Différé simple exprimé en minutes](#différé-simple-exprimé-en-minutes)
	- [Différé en précisant le jour et l'heure](#différé-en-précisant-le-jour-et-lheure)
- [Gestion vocale des scénarios](#gestion-vocale-des-scénarios)	
- [Propriétés scenariz.prop](#propriétés-scenarizprop)	
- [Le cron de l'exécution programmée](#le-cron-de-lexécution-programmée)
- [Problèmes connus](#problèmes-connus)
- [En plus...](#en-plus)
- [Versions](#versions)
	
## Compatibilité
- Scenariz V 3.0 est compatible Sarah V3 et Sarah V4.

## Installation
- Téléchargez et dézippez le fichier `SARAH-scenariz-master.zip` dans le répertoire plugins de Sarah.
	- Supprimez le dernier répertoire du chemin proposé pour ne pas avoir de doublon de répertoire.
- Renommez le répertoire créé en `scenariz`.
- Aucun paramètrage à faire.


##### sarah.js
Le plugin utilise la fonction askme de Sarah pour la gestion vocale des scénarios. Cette fonction a été corrigée et améliorée pour scenariz.
- Localisation du fichier sarah.js d'origine de Sarah:
	- Pour la V3: `SARAH/script/manager`
	- Pour la V4: `SARAH/server/app/server`
- Copiez le fichier `sarah.js` d'origine en `sarah.ori`
- Copiez/collez le fichier `SARAH/scenariz/install/'version'/sarah.js` dans son répertoire de localisation.
 
##### Important:
Si vous utilisez la fonction askme dans d'autres plugins, vous devrez modifier tous les appels à la fonction `end()` de la fonction `askme()` de vos plugins par `end(true)`.

**Notez** qu'il n'est pas nécessaire de faire cette action dans mes plugins qui ont déjà tous cette modification.

**Existant:**
```javascript
 SARAH.askme("message", {
	'rule1' : 'tag1',
	'rule2' : 'tag2'
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
**A modifier par:**
```javascript
 SARAH.askme("message", {
	'rule1' : 'tag1',
	'rule2' : 'tag2'
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

Enfin, redémarrez Sarah.


## Créer un scénario
- La création d'un scénario se fait par **règle(s)** dans le fichier `scenariz.xml`.
- Chaque action d'un scénario est une règle à définir.
- Après avoir créé une règle de scénario, vous devez la jouer pour l'ajouter dans la base de données de scenariz. Cette action n'est à faire qu'une seule fois.

### Créer une action	
Supposons un scénario dans lequel nous voudrions faire dire à Sarah une petite phrase.

Pour réaliser ce petit scénario à une seule action, il nous faut au minimum:
- Un nom pour le scénario, je vais l'appeler "Démonstration".
- Un nom pour l'action dans le scénario, je vais l'appeler "Phrase de début".
- Une date d'exécution en heure, minutes et jours de la semaine pour l'action.
- Le nom du plugin Sarah qui exécute l'action.
- Les paramètres nécessaires à l'action dans le plugin Sarah:
	- Coté client, les tags de la règle dans le xml du plugin.
	- Ou coté Serveur, les items de l'objet data (si il n'y a pas de règle XML pour l'action).

Traduisons ça par les tags de la règle de création de l'action du scénario dans le `scenariz.xml`.
- `out.action.program`="Démonstration"
	- **Obligatoire**.
	- Ce tag est le nom du scénario.
	- Toutes les actions dans un scénario doivent avoir le même nom de scénario.
- `out.action.name`="Phrase de début"
	- **Obligatoire**.
	- Ce tag est le nom de l'action dans le scénario.
	- Toutes les actions dans un scénario doivent avoir un nom différent.
- `out.action.clients`="SARAH1"
	- **Non obligatoire**, par défaut 'SARAH1'.
	- Ce tag est le nom du client Sarah qui exécute le scénario.
	- Comme je ne connais pas votre installation, je le défini sinon le scénario pourrait ne pas s'exécuter. Si votre client Sarah à un nom différent, remplacez SARAH1 par le nom de votre client.
- `out.action.start`="15:30-1111111"
	- **Obligatoire**.
	- Ce tag est la date d'exécution spécifiée en heure:minute et jours de la semaine commencant le lundi (7 jours: 1 actif, 0 inactif) séparés par un tiret (-).
	- Içi, défini à 15h30mn pour tous les jours de la semaine.
- `out.action.plug`="scenariz"
	- **Obligatoire**.
	- Ce tag est le nom du plugin qui exécute l'action du scénario.
		- Ne vous laissez pas perturber, içi c'est `scenariz` parce que j'utilise une action dans ce plugin...
- `out.action.key`="command=speech~text=c'est la phrase de début du scénario de démonstration."
	- **Non obligatoire** si le plugin n'a pas de paramètre(s) d'exécution.
	- Ce tag contient les tags dont le plugin a besoin pour s'exécuter.
	- Format: `Tag=Valeur` séparés par un tilde (~) sans le `out.action` qui apparait dans les xml
		- Par exemple, un `out.action.command="speech"` dans un xml devient `"command=speech"`
	- Vous pouvez utiliser ce tag pour faire dire une phrase à Sarah dans vos scénarios.
		
Il faut ensuite écrire une règle à jouer `Début de la démonstration` en y incluant ces tags:
```xml
 <rule id="rulescenariz">
    <tag>out.action=new Object()</tag>
	<item>Sarah</item>
	 
	<one-of>
		<!-- Gestion et modification des programmes, les programmes doivent exister-->		
		<item>gestion des programmes<tag>out.action.command="ManageCron"</tag></item>
		<item>Supprime tous les programmes<tag>out.action.command="RemoveAllCron"</tag></item>
		
		<!-- Clé de création du scénario Démonstration -->
		<item>Début de la démonstration<tag>out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="Phrase de début";out.action.clients="SARAH1";out.action.plug="scenariz";out.action.start="15:30-1111111";out.action.key="command=speech~text=c'est la phrase de début du scénario de démonstration."</tag></item>
```				
Dans la règle, nous pouvons voir un tag qui n'a pas eu d'explication plus haut:
- `out.action.command`="ScenarizCron".
	- **Obligatoire**
	- Ce tag est **LA** clé de création d'une action de scénario dans le plugin scenariz.
		
Il nous reste maintenant à jouer cette règle pour l'ajouter dans la base de données de scenariz.
- Dites: 
```text
SARAH Début de la démonstration
```
Sarah vous répond:
```text
Phrase de début enregistré
```
Vous venez de créer un scénario à une seule action qui s'exécute tous les jours à 15h30.

### Modifier une action	
Nous allons maintenant modifier la phrase et l'heure de l'action dans notre scénario parce que nous nous sommes trompés (Roooo ben quoi? , ça arrive...).
- Nouvelle heure dans le tag `out.action.start`: 20h15
- Nouvelle phrase dans le tag `out.action.key`: Bonjour, je dois dire quelque chose au début du scénario.

Pour modifier une action d'un scénario, modifiez les valeurs des tags associés directement dans la règle et rejouez la règle.
##### Important:
Ne modifiez jamais le nom du scénario et le nom d'une action sinon vous allez créer un nouveau scénario ou une nouvelle action. Pour un nouveau scénario ce n'est pas grave mais une autre action dans le scénario va créer un conflict de fonctionnement.

**Après modification**:
```xml	
<!-- Clé de création du scénario Démonstration --> -->
<item>Début de la démonstration<tag>out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="Phrase de début";out.action.clients="SARAH1";out.action.plug="scenariz";out.action.start="20:15-1111111";out.action.key="command=speech~text=Bonjour, je dois dire quelque chose au début du scénario."</tag></item>
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

### Exécuter le scénario
Nous venons de créer et modifier un scénario à exécution programmée (tous les jours à 20h15). 

Néanmoins, il faut savoir qu'un scénario peut être à exécution programmée ou à exécution immédiate par règle sans aucune modification.

Non ? si,si... Il suffit juste de créer une règle dans le `scenariz.xml` qui exécute ce scénario.

Il nous faut:
- Une règle à jouer `fais nous une petite démo`.
- Un tag `out.action.command`="ExecCron".
	- **Obligatoire**.
	- **LA** clé d'exécution d'un scénario.
- Un `tag out.action.program`="Démonstration".
	- **Obligatoire**.
	- Le nom du scénario à exécuter.
	
Ce qui donne dans le `scenariz.xml`:
```xml
 <rule id="rulescenariz">
    <tag>out.action=new Object()</tag>
	<item>Sarah</item>
	 
	<one-of>
		<!-- Gestion et modification des programmes, les programmes doivent exister-->		
		<item>gestion des programmes<tag>out.action.command="ManageCron"</tag></item>
		<item>Supprime tous les programmes<tag>out.action.command="RemoveAllCron"</tag></item>
		
		<!-- Clé de création du scénario Démonstration -->
		<item>Début de la démonstration<tag>out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="Phrase de début";out.action.clients="SARAH1";out.action.plug="scenariz";out.action.start="15:30-1111111";out.action.key="command=speech~text=Bonjour, je dois dire quelque chose au début du scénario."</tag></item>

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

### Créer une 2ème action
Supposons maintenant que nous voulons ajouter à notre scénario une 2ème action.

Pour avoir plusieurs actions dans un scénario, il y a une **question importante** à se poser:
- Les actions 1 puis 2 puis 3... doivent-elles s'enchaîner en démarrant à la même heure ou ont-elles des heures/minutes différentes d'exécutions?

##### Prenons un exemple:
- Un scénario où la 1ère action va me dire une phrase puis tout de suite après, une 2ème où Sarah met de la musique.
	- Pour ces 2 actions, l'heure d'exécution est identique, il faut donc préciser un ordre d'exécution:
		- ordre 1: la phrase.
		- ordre 2: la musique.
	- Ensuite, 10mn après, une 3ème action dans le même scénario va allumer la télé pour que je vois les infos.
		- Pour cette 3ème règle, on voit bien que l'heure d'exécution n'est pas identique aux 2 premières actions. Il n'y a donc pas d'ordre à gérer.
		- L'ordre dans ce cas est juste l'heure d'exécution.
		
##### En résumé:
- Pour des actions qui s'enchaînent à la même heure/minute:
	- On ajoutera un tag `out.action.order` dans chaque action avec l'ordre d'exécution.
- Pour des actions qui ne sont pas à la même heure, le tag `out.action.order` n'est pas obligatoire. 
- La valeur par défaut de `out.action.order` si le tag n'est pas ajouté = "1".
	
Revenons à notre 2ème action, nous allons ajouter quelque chose que beaucoup ont: `la météo`.	

J'utilise le plugin `météo 1` mais je suis persuadé qu'avec toutes ces explications, vous êtes capable de récupérer et d'ajouter le plugin `météo 2` et ses clés si vous l'avez.

Définition des clés :
- Le nom du plugin météo ? facile...
	- `out.action.plug`="meteo"
- Les clés dont "météo" a besoin ?
	- Le tag `out.action.zip`="315550" dans son xml représente la ville (Toulouse).
	- Le tag `out.action.date`="0" dans son xml représente la date.
	- Ce qui donne pour le tag `out.action.key` de scenariz:
		- `out.action.key`="zip=315550~date=0"
- Le plugin météo retourne la météo dans un tts callback, il faut donc la vocaliser par un nouveau tag:
	- `out.action.ttsCron`="La %s."
		- le tag `out.action.ttsCron` est un tag qui permet de faire dire un texte par Sarah avec l'action. 
		- Si l'action retourne un callback tts, celui-ci est récupéré et peut être vocalisé par un **%s** qui est remplacé par le callback tts qui est retourné, donc içi la météo.
		- Cette clé accepte du texte avant et après le %s.
		- Pour cet exemple, en ajoutant le texte 'La' devant ben c'est plus sympa.
- `out.action.order`="2"
	- Qui défini l'ordre d'exécution pour cette 2ème action qui est à la même heure que l'action 1 !
- `out.action.name`="La météo"
	- Le nom de cette 2ème action.
- Toutes les autres clés sont identiques à la 1ère action.

**Sans oublier** qu'il faut aussi modifier la 1ème action pour y ajouter:
- `out.action.order`="1"	
	- Pour la forme puisque c'est déjà la valeur par défaut pour cette règle.
	
Ce qui donne dans le `scenariz.xml`:
```xml
 <rule id="rulescenariz">
    <tag>out.action=new Object()</tag>
	<item>Sarah</item>
	 
	<one-of>
		<!-- Gestion et modification des programmes, les programmes doivent exister-->		
		<item>gestion des programmes<tag>out.action.command="ManageCron"</tag></item>
		<item>Supprime tous les programmes<tag>out.action.command="RemoveAllCron"</tag></item>
		
		<!-- Clé de création du scénario Démonstration -->
		<item>Début de la démonstration<tag>out.action.order="1";out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="Phrase de début";out.action.clients="SARAH1";out.action.plug="scenariz";out.action.start="15:30-1111111";out.action.key="command=speech~text=Bonjour, je dois dire quelque chose au début du scénario."</tag></item>
		<item>La météo dans la démonstration<tag>out.action.order="2";out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="La météo";out.action.clients="SARAH1";out.action.plug="meteo";out.action.start="15:30-1111111";out.action.key="zip=315550~date=0";out.action.ttsCron="La %s"</tag></item>
```		

Ca va ?, pas de surprises ?

Et bien jouons ces 2 règles !
- La 1ère pour la modifier.
- La 2ème pour la créer.

C'est fait ? et bien essayez !
- Dites:
```text
SARAH fais nous une petite démo
```
Sarah exécute:
```text
Bonjour, je dois dire quelque chose au début du scénario.
La météo: Toulouse: ce soir, Averses, température entre 18 et 13 degrés
```

### Créer une 3ème action
Pour compléter ce petit scénario, nous allons y ajouter une 3ème action qui donne l'heure courante après la météo.

##### Mémo:
Le plugin `Time` qui existe dans Sarah V4 n'existe pas dans la V3.
Par conséquent le plugin scenariz vous propose une commande `setTime` compatible V3,V4 qui retourne l'heure dans un callback tts.

Nous pouvons donc créer une 3ème action en utilisant cette commande:
- `out.action.plug`="scenariz"
- `out.action.key`="command=setTime"
	- `setTime` est la commande de scenariz qui retourne dans un callback tts l'heure courante.
	- Comme pour la fonction speech, pensez à utiliser cette fonction pour récupérer un callback tts de l'heure courante et la vocaliser dans vos scénarios.
- `out.action.ttsCron`="Il est %s"
	- Le %s est remplacé par le callback tts donc içi, l'heure.
- `out.action.order`="3"
	- Qui défini l'ordre d'exécution pour cette 3ème action.
- `out.action.name`="l'heure courante"
	- Ce tag est le nom de cette 3ème action.
- Toutes les autres clés sont identiques aux autres actions.

Ce qui donne dans le `scenariz.xml`:
```xml
 <rule id="rulescenariz">
    <tag>out.action=new Object()</tag>
	<item>Sarah</item>
	 
	<one-of>
		<!-- Gestion et modification des programmes, les programmes doivent exister-->		
		<item>gestion des programmes<tag>out.action.command="ManageCron"</tag></item>
		<item>Supprime tous les programmes<tag>out.action.command="RemoveAllCron"</tag></item>
		
		<!-- Clé de création du scénario Démonstration -->
		<item>Début de la démonstration<tag>out.action.order="1";out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="Phrase de début";out.action.clients="SARAH1";out.action.plug="scenariz";out.action.start="15:30-1111111";out.action.key="command=speech~text=Bonjour, je dois dire quelque chose au début du scénario."</tag></item>
		<item>La météo dans la démonstration<tag>out.action.order="2";out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="La météo";out.action.clients="SARAH1";out.action.plug="meteo";out.action.start="15:30-1111111";out.action.key="zip=315550~date=0";out.action.ttsCron="La %s"</tag></item>
		<item>L'heure dans la démonstration<tag>out.action.order="3";out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="l'heure courante";out.action.clients="SARAH1";out.action.plug="scenariz";out.action.start="15:30-1111111";out.action.key="command=setTime";out.action.ttsCron="Il est %s"</tag></item>
```		

Jouons les 2 règles
- "La météo dans la démonstration" pour la modifier.
- "L'heure dans la démonstration" pour la créer.

Et on essaye...
- Dites:
```text
SARAH fais nous une petite démo
```
Sarah exécute:
```text
Bonjour, je dois dire quelque chose au début du scénario.
La météo: Toulouse: ce soir, Averses, température entre 18 et 13 degrés
Il est 20 heure 15
```
		
### Optimiser le scénario
Nous avons créé un scénario à 3 actions pour l'exemple.

'Dans la vraie vie', nous aurions pû aussi ne faire que 2 actions dans le scénario, c'était largement suffisant. Quelque chose comme ca:
```text
Bonjour, il est NiaNia heures, quelques infos.
La météo: Toulouse: ce soir, Averses, température entre 18 et 13 degrés. Bonne Journée.
```

Comment faire pour supprimer le scénario et le refaire en 2 actions ?
- Utilisez la règle suivante:
```text
Sarah Supprime tous les programmes

// Retour de Sarah
J'ai supprimé tous les programmes.
```

##### Mémo:
Voir plus bas [Gestion vocale des scénarios](#gestion-vocale-des-scénarios) pour la commande qui permet de supprimer un seul scénario. 

Nous pouvons maintenant refaire le scénario avec 2 règles comme ci-dessous:
```xml
 <rule id="rulescenariz">
    <tag>out.action=new Object()</tag>
	<item>Sarah</item>
	 
	<one-of>
		<!-- Gestion et modification des programmes, les programmes doivent exister-->		
		<item>gestion des programmes<tag>out.action.command="ManageCron"</tag></item>
		<item>Supprime tous les programmes<tag>out.action.command="RemoveAllCron"</tag></item>
		
		<!-- Clé de création du scénario Démonstration -->
		<item>L'heure dans la démonstration<tag>out.action.order="1";out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="l'heure courante";out.action.clients="SARAH1";out.action.plug="scenariz";out.action.start="15:30-1111111";out.action.key="command=setTime";out.action.ttsCron="Bonjour, il est %s, quelques infos."</tag></item>
		<item>La météo dans la démonstration<tag>out.action.order="2";out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="La météo";out.action.clients="SARAH1";out.action.plug="meteo";out.action.start="15:30-1111111";out.action.key="zip=315550~date=0";out.action.ttsCron="La %s. Bonne journée."</tag></item>
```	
Vous pouvez rejouer les règles de créations et exécuter le scénario.

Pour finir avec cette 1ère partie de création et modification, nous allons créer une 3ème et dernière action dans le scénario qui s'exécute 10 minutes après.

Je vous laisse utiliser une de vos règles dans un de vos plugins pour ajouter une 'vraie' action.

Personnellement, je vais utiliser une règle qui lance un album de musique mais nous allons la détailler ensemble.

Dans mon plugin `sonosPlayer.xml`, la règle est définie comme ci-dessous:
```xml
<item>Supertramp<tag>out.action.command="set_media";out.action.type="favorite";out.action.title="Supertramp";out.action._attributes.tts="D'accord"</tag></item>	
```	

- Je prend les tags de la règle soit:
	- `out.action.command`="set_media"
	- `out.action.type`="favorite"
	- `out.action.title`="Supertramp"
	- Je ne prend pas le `out.action._attributes.tts`, ce n'est pas un tag nécessaire à la règle, c'est juste un message vocale!
- Je crée le tag `out.action.key` avec ces clés, soit:
	- `out.action.key`="command=set_media~type=favorite~title=Supertramp"

- Mon plugin s'appelle `sonosPlayer`:
	- `out.action.plug`="sonosPlayer"
- Démarrage de l'action dans la règle, 10mn après 15:30 soit:
	- `out.action.start`="15:40-1111111"
- Nom de l'action dans le scénario:
	- `out.action.name`="La musique"	
- Pour le fun, une phrase de Sarah !
	- `out.action.ttsCron`="je met un peu de musique."	
	
Comme vu précédemment (eh oui! sinon relisez le passage...), pas d'ordre puisque cette règle n'est pas à la même heure que les 2 premières.
	
Détail de la règle de création de l'action 3 `La musique dans la démonstration` dans le `scenariz.xml`:
```xml
 <rule id="rulescenariz">
    <tag>out.action=new Object()</tag>
	<item>Sarah</item>
	 
	<one-of>
		<!-- Gestion et modification des programmes, les programmes doivent exister-->		
		<item>gestion des programmes<tag>out.action.command="ManageCron"</tag></item>
		<item>Supprime tous les programmes<tag>out.action.command="RemoveAllCron"</tag></item>
		
		<!-- Clé de création du scénario Démonstration -->
		<item>L'heure dans la démonstration<tag>out.action.order="1";out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="l'heure courante";out.action.clients="SARAH1";out.action.plug="scenariz";out.action.start="15:30-1111111";out.action.key="command=setTime";out.action.ttsCron="Bonjour, il est %s, quelques infos."</tag></item>
		<item>La météo dans la démonstration<tag>out.action.order="2";out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="La météo";out.action.clients="SARAH1";out.action.plug="meteo";out.action.start="15:30-1111111";out.action.key="zip=315550~date=0";out.action.ttsCron="La %s"</tag></item>
		<item>La musique dans la démonstration<tag>out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="La musique";out.action.clients="SARAH1";out.action.plug="sonosPlayer";out.action.start="15:40-1111111";out.action.key="command=set_media~type=favorite~title=Supertramp";out.action.ttsCron="je met un peu de musique."</tag></item>
```		

Essayez avec votre action perso, ça doit matcher !

Jouer la 3ème règles de création et exécutez le scénario.


### Changer le type du scénario
Il nous reste une dernière chose à effectuer pour ce scénario.

Pour l'instant, ce scénario est à exécution programmée, tous les jours à 15h30 (et jusqu'à 15h40), ce qui est très génant si nous voulions que cet exemple soit uniquement à exécution immédiate par règle.

Pour définir le type de scénario, le tag `out.action.exec` est utilisé:
- `out.action.exec`="false"
	- Le scénario est à exécution immédiate uniquement.
- `out.action.exec`="true"
	- Le scénario est à exécution programmée et exécution immédiate.
	
Détail de la modification des règles de créations avec l'ajout de `out.action.exec`="false": 	
```xml
 <rule id="rulescenariz">
    <tag>out.action=new Object()</tag>
	<item>Sarah</item>
	 
	<one-of>
		<!-- Gestion et modification des programmes, les programmes doivent exister-->		
		<item>gestion des programmes<tag>out.action.command="ManageCron"</tag></item>
		<item>Supprime tous les programmes<tag>out.action.command="RemoveAllCron"</tag></item>
		
		<!-- Clé de création du scénario Démonstration -->
		<item>L'heure dans la démonstration<tag>out.action.exec="false";out.action.order="1";out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="l'heure courante";out.action.clients="SARAH1";out.action.plug="scenariz";out.action.start="15:30-1111111";out.action.key="command=setTime";out.action.ttsCron="Bonjour, il est %s, quelques infos."</tag></item>
		<item>La météo dans la démonstration<tag>out.action.exec="false";out.action.order="2";out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="La météo";out.action.clients="SARAH1";out.action.plug="meteo";out.action.start="15:30-1111111";out.action.key="zip=315550~date=0";out.action.ttsCron="La %s"</tag></item>
		<item>La musique dans la démonstration<tag>out.action.exec="false";out.action.command="ScenarizCron";out.action.program="Démonstration";out.action.name="La musique";out.action.clients="SARAH1";out.action.plug="sonosPlayer";out.action.start="15:40-1111111";out.action.key="command=set_media~type=favorite~title=Supertramp";out.action.ttsCron="je met un peu de musique."</tag></item>
```		
Rejouez les règles de création pour les modifier!

### Tags spéciaux pour la création d'actions
Il existe quelques tags qu'il est possible d'ajouter à la règle de création d'une action.

##### out.action.tempo
Utilisé pour spécifier un délais (en milli-secondes) pour exécuter l'action suivante.

Par exemple le tag `out.action.tempo`="10000" défini sur une action d'un scénario crée 10 secondes de temporisation avant d'exécuter la règle suivante.

- `out.action.tempo`="valeur"
	- Valeur par défaut: "1000"

##### out.action.clients
Utilisé pour préciser le nom du client ou dans le cas d'un multi-room avec une base de données scenariz partagée.

L'action ne sera exécutée **QUE** pour les clients définis dans ce tag séparés par une virgule (,).
- `out.action.clients`="CLIENT1,CLIENT2"
	- Valeur par défaut: SARAH1
	- Autres valeurs possibles:
		- "currentRoom":
			- Dans certain cas, on aimerait que Sarah exécute le scénario là où on se trouve. 
			- La pièce courante doit être mise dans un fichier `scenariz/scenarizConfig.json` par le retour d'un capteur de présence par exemple sous la forme:
				- {currentRoom: 'Salon'}
		- "ALL": tous les clients


##### out.action.autodestroy
Supprime le scénario après avoir été joué.

Utilisé par exemple pour une exécution [différé en précisant le jour et l'heure](#différé-en-précisant-le-jour-et-lheure) ou encore par un plugin. 

Par exemple, le plugin `tvSchedule` crée un scénario pour rappeler un programme TV.

- `out.action.autodestroy`="true"
	- Supprime le scénario après son exécution
- `out.action.autodestroy`="false"
	- Valeur par défaut.
	- Ne supprime pas le scénario.


##### out.action.mute
Permet de ne pas avoir le message de validation de Sarah `action enregistrée` lorsqu'une action est créée.

Utile par exemple si l'action est créer depuis un autre plugin par un SARAH.call en mode silence.
- `out.action.mute`="true"
	- Aucun message de validation.
- `out.action.mute`="false"
	- Valeur par défaut.
	- Message de validation.

##### out.action.fifo
Utilisé pour une action de scénario destinée à n'être exécutée qu'une seule fois dans le cas de plusieurs clients définis dans le tag `out.action.clients` et une base de données scenariz partagée. L'action sera exécutée par le 1er client à la lancer puis elle sera supprimée de la base de données.
- `out.action.fifo`="true"
	- Exécutée par le 1er client à la lancer puis détruite.
- `out.action.fifo`="false"
	- Valeur par défaut.
	
##### out.action.speechStartOnRecord
Utilisé dans le cas d'un scénario [Différé en précisant le jour et l'heure](#différé-en-précisant-le jour-et-lheure) pour que Sarah retourne la bonne prise en compte de l'heure et du jour.
- `out.action.speechStartOnRecord`="true"
	- Retourne le jour et l'heure du scénario.
- `out.action.speechStartOnRecord`="false"
	- Retourne la phrase normale.

## Lancer un scénario à exécution immédiate avec un différé
Il existe 2 types de différé d'exécution:
- Un type simple avec un différé exprimé en minutes.
- Un type plus élaboré en précisant:
	- Aujourd'hui, Demain, Après-demain ou un jour de la semaine et l'heure précise d'exécution.
		

### Différé simple exprimé en minutes
Ce type de différé est défini et actif dans le `scenariz.xml`.

Vous pouvez dire directement les minutes de différé après la règle de déclenchement d'un scénario.

Par exemple:
```text
SARAH fais nous une petite démo dans 10 minutes.

// Retour de Sarah
D'accord, j'exécute le scénario dans 10 minutes.
```
Toutes les plages horaires n'y sont pas. Retrouvez ces règles de différé simple dans le `scenariz.xml` en bas du fichier et modifiez-les ou ajoutez-en à votre convenance.


### Différé en précisant le jour et l'heure
Ce type de différé est associé à un scénario virtuel à une seule action.

Ce scénario n'existe pas dans la base de données de scenariz. Il est créé dynamiquement pendant l'activation de la règle et est supprimé ensuite.

Par exemple, supposons que nous voulons avoir la possibilité de lancer un système de chauffage au jour et l'heure qui nous convient:
```text
SARAH programme le chauffage demain à 15 heure 30.
ou
SARAH programme le chauffage mardi à 9 heure.
ou
SARAH programme le chauffage à 21 heures.
ou
SARAH programme le chauffage après-demain à 13 heures 22.
```

Ce type de différé est entièrement commenté dans le `scenariz.xml` afin de réduire les faux positifs.

**Pour l'utiliser**:
- Décommentez les 4 rules de gestion des jours et de l'heure:
	- `StartTimer`, `WeekDay`, `Hour`, `Minute` en haut du fichier.
	- Modifiez à votre convenance les règles dans le rule `StartTimer`.
- Décommentez la règle d'exécution dans le rule `rulescenariz`
- Dans la règle d'exécution, modifiez les tags suivant:
	- `out.action.program` avec le nom de votre scénario.
	- `out.action.name` avec le nom de l'action dans le scénario.
	- `out.action.plug` avec le plugin qui exécute l'action.
	- `out.action.key` avec les tags nécessaire à l'exécution du plugin. Si le plugin ne necessite pas de paramètres, supprimez entièrement le tag.

Il est possible d'avoir plusieurs scénario de ce type, il suffit simplement de créer une autre rule `StartTimer` avec un autre nom, d'autres grammaires et une autre règle d'exécution.

## Gestion vocale des scénarios
La gestion des scénarios est vocale par dialogue avec Sarah.

Elle permet de:
- Donner l'état d'un scénario.
	- Si il est actif ou inactif.
	- Le nombre d'actions dans le scénario.
	- l'heure et le(s) jour(s) de la semaine de son exécution.
- Activer/Désactiver un scénario.
	- Activé: devient un scénario à exécution programmée.
	- Désactivé: devient un scénario à exécution immédiate.
		- Un scénario à exécution programmée n'est plus exécuté.
- Modifier l'heure et minutes d'exécution.
	- par plage de 5mn ou 15mn
	- par plage de 1h ou 5h
- Modifier les jours d'exécution, soit:
	- La semaine de travail.
	- La semaine entière.
	- En précisant les jours de la semaine.
- Supprimer un scénario.

##### Mémo:
Il est très important de se rappeler que dans pratiquement tous les dialogues, vous pouvez dire:
- `qu'est ce que je peux dire ?`
Sarah vous énumérera tous les choix que vous avez pour le dialogue courant.

### Règle de gestion des programmes
Pour activer la gestion vocale:
- `SARAH gestion des programmes`
	- Si un seul programme est trouvé, Sarah vous demande directement si vous voulez le modifier.
	- Si plusieurs programmes sont trouvés, Sarah vous donne le nombre puis ennumère les programmes et attend un choix.

Pour apprendre comment gérer les scénarios vocalement, écoutez les enregistrements placés dans le répertoire scenariz/démo:
- Lancer la gestion vocale: `demarrage.mp3`
- Etat d'un scénario: `etat.mp3`
- Activer/Désactiver un scénario: `active-desactive.mp3`
- Modifier l'heure: `modification_heure.mp3`
- Modifier les minutes: `modification_minute.mp3`
- Modifier les jours: `modification_jour.mp3`
- Un enchainement de toutes les possibilités: `multi_actions.mp3`
- Suppression d'un scénario: `supression.mp3`


## Propriétés scenariz.prop

##### debug
- `debug`: true
	- Affiche les messages du debug dans la console Sarah.
- `debug`: false
	- Aucun message
	
##### multiRoom
- `multiRoom`: true
	- Cherche le nom du client Sarah dans son `custom.ini` pour matcher le nom du client avec l'action à exécuter. 
- `multiRoom`: false
	- Utilise la valeur de la propriété 'defaultRoom' pour matcher le nom du client avec l'action à exécuter.

## Modification des messages
Tous les messages de Sarah sont localisés dans le fichier de langage `scenariz/lib/lang/FR_fr.js`

##### Note:
La propriété `language` du fichier `scenariz.prop` définie le nom du fichier à charger, ce plugin est donc multi-langues.

Dans ce fichier, 2 tableaux `messages` et `error_messages` regroupent les messages pouvant être modifiés.
- Ouvrez ce fichier dans un éditeur de texte.
- Cherchez le message à modifier et changez sa valeur.
- A noter que certains messages sont multi-réponses aléatoires, visible par des pipes (|) dans les valeurs.
	- Exemple: `De rien|je t'en pris|Avec plaisir`

Pour les grammaires des askme, il est nécessaire de les modifier directement dans le fichier `scenariz/lib/db/scenarizdb.js`
- Ouvrez ce fichier dans un éditeur de texte.
- Cherchez toutes les chaines `askme`, retrouvez les grammaires et modifiez-les à votre convenance.


## Le cron de l'exécution programmée
Par défaut, la recherche de scénarios à exécutions programmées est lancée par un cron toutes les 5 minutes.

Si une heure est définie en non multiple de la valeur définie, scenariz activera automatiquement l'action pour le multiple inférieur.

Par exemple, pour une recherche toutes les 5mn, supposons que l'heure d'exécution d'un scénario est 20h43, le scénario s'exécutera alors à 20h40.

Pour modifier le délais d'exécution:
- Modifiez la valeur `time` de la section `cron` dans le `scenariz.prop`
- Modifiez la valeur de la variable cron dans la fonction istime() du fichier `scenariz/lib/db/scenarizdb.js` (~ à la ligne 1541)
	- pour un cron de 2 mn -> cron = 1
	- Pour un cron de 5 mn -> cron = 4
	- pour un cron de 10 mn -> cron = 9
	- pour un cron de 15 mn -> cron = 14

##### Note:
Ne modifiez cette valeur que pour des cas de figures très spécifiques. Une valeur de 5mn est fonctionnelle dans 99,9% des cas.


## Problèmes connus
- Pour Sarah V4:
	- La fonction askme de la V3 fonctionne mieux que la V4.
		- Apparamment les askme récursifs (nombreux dans ce plugin) avec des SARAH.speak en plus dans les réponses ne semblent pas trop bien gérés dans cette version.
		- Si vous constatez des problèmes d'exécutions de règles en parallèle, vérifiez qu'un mot unique ne soit pas matché avec une de vos règles et essayez de modifier les réponses de Sarah dans [le fichier lang](#modification-des-messages).
		- A défaut, installez la V3 et testez scenariz dans cette version.
- Le niveau de confidence en V3 et V4:
	- Si les erreurs de compréhensions sont trop importantes, que le dialogue est intérrompu ou qu'un choix est compris par Sarah alors que vous n'avez rien dit, pensez peut-être à augmenter le niveau de confidence.
	- Pensez aussi à réduire le son des périphériques pendant un dialogue.
- Kinect:
	- Avec une Kinect, il peut arriver que certains dialogues des askme ne soient pas prononcés par Sarah. A mon avis, c'est dû aux librairies de la Kinect qui ne sont pas forcément bien développées, sûrement lié à la libération de la mémoire. Avec un micro normal, je n'ai jamais rencontré le problème et ça fonctionne correctement.

Globalement, 9 fois sur 10, le dialogue fonctionne correctement mais si un problème survient (erreurs de compréhension, dialogue intérrompu, choix sélectionné sans avoir parlé), dans tous les cas ne desespérez pas, reprenez simplement le dialogue ou la commande normalement et persevérez. Ca arrive et cela suffit généralement à régler le 1 sur 10 qui reste... :-)

   
## En plus...
Une section spéciale est définie dans le scenariz.xml sous la forme:
```xml
<!-- AUTO WRITING - DO NOT REMOVE THIS LINE § -->
			
<!-- § AUTO WRITING - DO NOT REMOVE THIS LINE -->
```
Vous pouvez supprimer cette section si vous êtes en V4 ou si le module `moduleRecorder` n'est pas installé.

##### Pour info
Le plugin `moduleRecorder` permet d'enregistrer une séquence de règles et d'en faire un scénario automatiquement.
- Activez l'enregistreur.
- Jouez la série de règles du scénario.
- Arretez l'enregistreur.
	- Donnez un nom au scénario.
- Le scénario est automatiquement créé dans la bd de scenariz et une règle à exécution immédiate est ajoutée dans cette section du `scenariz.xml`.
	
Uniquement pour Sarah V3.

   
## Versions
Version 3.0 (01/06/2016)
- Compatibilité Sarah V3 et Sarah V4
	- Petits changements et stabilisation du code pour la V4
	- Librairie winston ajoutée

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
