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
