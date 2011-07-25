var nc = require('../netasq_comm.js');

session = new nc.Session('admin', 'pareil1908', '10.0.0.254');
session.verbose = true;

session.on('error', function(error, errorString) {
		if (isNaN(error)) {
			console.log('session error: %s', error.message);
			return;
		}
		console.log('session error: %s (%d)', errorString, error);		
});

session.on('connected', function() {
		console.log('(0)Logged in.');
		console.log('(0)Session level: %s', session.sessionLevel);		
});

console.log('Connecting to %s as %s...', session.host, session.login);

session.connect(function() {
		console.log('(1)Logged in.');
		console.log('(1)Session level: %s', session.sessionLevel);	
});
