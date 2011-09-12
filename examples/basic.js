netasqComm = require('../lib/netasq-comm');

session = new netasqComm.Session('admin', 'adminadmin', '10.0.0.254');

//session.verbose = true; // true if you want debug logs

session.on('error', function(error) {
		if (error) {
			console.log('Session error (%s): %s', error.code, error.message);	
			return;
		}
		console.log('Session error occured (no details)');			
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
