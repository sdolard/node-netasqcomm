# node-netasq-comm

This is a NETASQ security appliance comm library for node.js
* http://www.netasq.com
* http://nodejs.org

## Installation

### Installing npm (node package manager: http://npmjs.org/)

```
curl http://npmjs.org/install.sh || sh	
```

### Installing prompt
```
[sudo] npm install netasq-comm (not yet)
```

## Usage
### Basic 
```
netasqComm = require('netasq-comm'),

session = new netasqComm.Session();

// session.verbose = true; // true if you want debug logs

session.on('error', function(error, errorString) {
		if (isNaN(error)) {
			console.log('session error: %s', error.message);
			return;
		}
		console.log('session error: %s (%d)', errorString, error);		
});
session.exec(value.cmd, function(data){
		console.log(netasqComm.getObjectValue('nws.msg', data));
});                                             
		
```

### Example
See examples/n2cli.js (or run it)

## Exports 

### Session object
#### Methods
* connect
* disconnect
* exec

#### Events
* error
* connected
* commandResponse

#### Properties

### Functions
* `dumpServerdDataFormat`
* `getObjectValue`

### Consts
* `SESSION_ERRORS`: Object. Properties:
	- AUTH_FAILED,
	- LOGIN_FAILED,
	- TOO_MANY_USER_AUTHENTICATED
* `SESSION_ERRORS_MSG` 
	- AUTH_FAILED
	- LOGIN_FAILED
	- TOO_MANY_USER_AUTHENTICATED

* `SESSION_LEVELS`: Array of String:
	- modify
	- base
	- contentfilter
	- log
	- filter
	- vpn
	- log_read
	-pki
	-object
	-user
	-admin
	-network
	-route
	-maintenance
	-asq
	-pvm
	-vpn_read
	-filter_read
	-globalobject
	-globalfilter
	
* `SERVERD`: Object. Properties:
	-OK: 100// Success one line 
	-OK_MULTI_LINES: 101// Success multiple lines
	-OK_SERVER_WAITING_MULTI_LINES: 102// Success: serverd is waiting for data
	-OK_DISCONNECTED: 103// Success: session is closed
	-OK_SERVER_NEED_REBOOT: 104// Success but appliance should be restarted (in order to apply modifications)
	-WARNING_OK: 110// Success but one warning 
	-WARNING_OK_MULTI_LINE: 111,// Success but multiple warning
	-KO: 200// Failure one line 
	-KO_MULTI_LINES: 201// Failure multiple line 
	-KO_AUTH: 202// Authentication failed
	-KO_TIMEOUT_DISCONNECTED: 203// Failure: timout disonnected (no activity)
	-KO_MAXIMUM_ADMIN_REACH: 204// Failure: maximum administrator are connected to appliance
	-KO_LEVEL: 205// Administator do not have enought level to run specified command
	-KO_LICENCE: 206// Appliance do not have licence option to run specified command
	

## Known issues
* Not yet available with npm (on the road)
* Limited to NETASQ V9+ firmware (https only on port 443, SRP is not supported)
* File transfert (download/upload) is not yet supported
  

## License
netasq-comm is licensed under the MIT license.