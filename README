# node-netasq-comm

This is a NETASQ security appliance comm library based on node.js
	http://www.netasq.com
	http://nodejs.org

	

## Installation

### Installing npm (node package manager)
```
curl http://npmjs.org/install.sh || sudo sh	
```

### Installing prompt
```
sudo npm install netasq-comm -global
```

## Usage
'''
netasqComm = require('netasq-comm'),

session = new netasqComm.Session("admin", "password", "host");
//session.verbose = true; // uncomment if you want debug 

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
				console.log(data);				
		});
});
'''

	
## Known issues:
* limited to NETASQ V9+ firmware (https only on port 443, SRP is not supported)
* file transfert (download/upload) is not yet supported
  

## License

netasq-comm is licensed under the MIT license.