# node-netasq-comm

This is a NETASQ security appliance comm library based for node.js
	http://www.netasq.com
	http://nodejs.org

## Installation

### Installing npm (node package manager)
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
`dumpServerdDataFormat`
`getObjectValue`
### Consts
* `SESSION_ERRORS` 
* `SESSION_ERRORS_MSG` 
* `SESSION_LEVELS` 
* `SERVERD` 

## Known issues
* Not yet available with npm (on the road)
* limited to NETASQ V9+ firmware (https only on port 443, SRP is not supported)
* file transfert (download/upload) is not yet supported
  

## License
netasq-comm is licensed under the MIT license.