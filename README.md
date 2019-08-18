## Servidor para o projeto Olho na Rua
O servidor tem como funço armazenar logs referentes aos eventos das portarias e as portarias em sí.

## Server developed for the project of the Startup "Olho na Rua"
This server has the objective to store and manage the logs of different events related to ordinances and the ordinances itself
 
## Goal
This project was focused on a security solution for residential buildings in high occurrences of robberies and thief attacks. The main functionality is, through the porters, inform different events related to thievery in a building neighborhood through a network of ordinances, making possible a safe environment for the residents.
All the events have the same objective, inform the other porters about some happening in a specific location or in an ordinance.
The events are: 
+ Suspect
+ Occurrence
+ Panic

### Suspect Event
This event is triggered when the porter sees something strange happening or someone doing suspect acts in the neighborhood.

### Occurrence Event
This event is triggered when the porter sees some act of robbery or a assault.

### Panic Event
This event, also called silence alarm, is when the porter is surrendered or in the domain of bandits.

## The Events Structure
The body os the event log which is stored in the database is as follows:
```javascript
{
    //Field is responsible to store the ordinance number
 	portariaID: {
		type: String,
		minlength: 3,
		maxlength: 3,
		required: true
    },
    //Timestamp generated on the server when the log is created
	createdAt: {
		type: Number,
		default: null,
		required: true
    },
    //The code event itself
	evento: { 
		type: String,
		required: true
    },
    //Optional field that expresses a direction utilizing the ordinance as referential
	direcao: {
		type: String,
		default: 'X'
    },
    //Optional field that expresses the type of threat which has occurred
	ameaca: {
		type: String,
		default: "X"
	}
}
```

## How that works
Firstly the porter, depending on the nature of the event, informs the server via an embedded system utilizing an ESP32 the event itself. This system sends a JSON containing the field "portariaID", which is a string of three numbers because of the limitations of the ESP32, and the event, which is also a numerical string.

![alt text](https://github.com/EduardoModel/ServerESP/tree/master/images/firstFlowchart.png "First Flowchart")

Then the servers stores this log with the addition of the timestamp in the registry.

![alt text](https://github.com/EduardoModel/ServerESP/tree/master/images/secondFlowchart.png "Second Flowchart")

After that, the server returns an ACK ("acknowledgment") to the sender informing the stored log.

![alt text](https://github.com/EduardoModel/ServerESP/tree/master/images/thirdFlowchart.png "Third Flowchart")

After that, if the porter would add further information, for example, the direction or the type of the threat, he informs this information on the embedded system and sends again to the server.

![alt text](https://github.com/EduardoModel/ServerESP/tree/master/images/fourthFlowchart.png "Fourth Flowchart")

The server receives the optional information and the timestamp to use as a query parameter to actualize the log.

![alt text](https://github.com/EduardoModel/ServerESP/tree/master/images/fifthFlowchart.png "Fifth Flowchart")