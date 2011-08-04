# node-netasq-comm

This is a NETASQ security appliance comm library for node.js.

* http://www.netasq.com
* http://nodejs.org

## Installation with npm
This is not yet available.

### Installing npm (node package manager: http://npmjs.org/)

```
curl http://npmjs.org/install.sh || sh	
```

### Installing netasq-comm
```
[sudo] npm install netasq-comm (not yet)
```

## Usage
### Basic 
```
netasqComm = require('../lib/netasq-comm');

session = new netasqComm.Session('admin', 'adminadmin', '10.0.0.254');

//session.verbose = true; // true if you want debug logs

session.on('error', function(error, errorString) {
		if (isNaN(error)) {
			console.log('session error: %s', error.message);
			return;
		}
		console.log('session error: %s (%d)', errorString, error);		
});

session.connect(function() {
		console.log('Logged in.');
		console.log('Session level: %s', session.sessionLevel);		
		session.exec('help', function(data){
				netasqComm.dumpServerdObject(data.nws.serverd);
				session.exec('quit', function(data){
						netasqComm.dumpServerdObject(data.nws.serverd);
				})
		})
});                                          
		
```

### Examples
* examples/basic.js
* examples/n2cli.js

## Exports 

### Session class
```
/**
* @class
* @inherits EventEmitter
* @event error({Error} error || {number} errorCode, {string} errorString)
* @event connected()
* @event commandResponse({string} session level)
* @params {string} login
* @params {string} pwd
* @params {string} host
* @params [{string} requiredLevel] default to all SESSION_LEVELS
* @see SESSION_ERRORS
* @see SESSION_ERRORS_MSG
* @see SESSION_LEVELS
*/
```
#### Session Methods
* connect

```
/**
* @public
* @method
* Connect to NETASQ appliance
* @param [{function} callback], optionnal, use a callback or 'connected' event
* @see SESSION_ERRORS,
* @see 'connected' event
* @see 'error' event
*/
```

* disconnect

* exec

```
/**
* @public
* @method
* Run a command
* @param {string} command
* @param [{function} cb({object}data)], optionnal, use a callback or 'commandResponse' event
* @see 'commandResponse' event
*/
```
	
#### Session Events
* error
* connected
* commandResponse

#### Session Properties
* TODO

### Functions
* `dumpServerdObject`

```
/**
* Dump to writable stream serverd object as a human readable format (ini style),
* function of served format
* @public 
* @param {object} serverd: part of returned data
* @param [{object}] ws: Writable Stream. Optionnal. Default to process.stdout
* @see Session.exec
* @see test/netasq-comm-*-format.js
* @example
* session.exec('help', function(data){
* 		netasqComm.dumpServerdObject(data.nws.serverd); // This will dump data to stdout
* })
*/
```

* `getObjectValue`

```
/**
* @public
* @returns obj reference value related to str path
* @throw error if property does not exists
* @example
*	foo: {
*		bar: 'value'
* 	}
* 	getObjectValue('foo.bar', foo) returns 'value'
* 	getObjectValue('help', foo) throw an error
* @see test/get-object-value.js
*/
```

### Consts
* `SESSION_ERRORS`: Object of Number properties.
	- AUTH_FAILED
	- LOGIN_FAILED
	- TOO_MANY_USER_AUTHENTICATED
* `SESSION_ERRORS_MSG`: Object of String properties.
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
	- pki
	- object
	- user
	- admin
	- network
	- route
	- maintenance
	- asq
	- pvm
	- vpn_read
	- filter_read
	- globalobject
	- globalfilter
	
* `SERVERD`: Object of Number properties.
	- OK: 100// Success one line 
	- OK_MULTI_LINES: 101// Success multiple lines
	- OK_SERVER_WAITING_MULTI_LINES: 102// Success: serverd is waiting for data
	- OK_DISCONNECTED: 103// Success: session is closed
	- OK_SERVER_NEED_REBOOT: 104// Success but appliance should be restarted (in order to apply modifications)
	- WARNING_OK: 110// Success but one warning 
	- WARNING_OK_MULTI_LINE: 111,// Success but multiple warning
	- KO: 200// Failure one line 
	- KO_MULTI_LINES: 201// Failure multiple line 
	- KO_AUTH: 202// Authentication failed
	- KO_TIMEOUT_DISCONNECTED: 203// Failure: timout disonnected (no activity)
	- KO_MAXIMUM_ADMIN_REACH: 204// Failure: maximum administrator are connected to appliance
	- KO_LEVEL: 205// Administator do not have enought level to run specified command
	- KO_LICENCE: 206// Appliance do not have licence option to run specified command
	

## Known issues
* Not yet available with npm (on the road)
* Limited to NETASQ V9+ firmware (https only on port 443, SRP is not supported)
* File transfert (download/upload) is not yet supported


## Test
Just run test/run_test.js


## License
node-netasq-comm is licensed under the MIT license.