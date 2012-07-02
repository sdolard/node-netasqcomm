/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
session = require('../lib/netasqcomm').createSession({
		login: 'admin',
		pwd: 'adminadmin',
		host: '10.0.0.254',
		verbose: false // true if you want debug logs
});


session.on('error', function(error) {
		if (error) {
			console.log('Session error (%s): %s', error.code, error.message);	
		} else {
			console.log('Session error occured (no details)');
		}
		process.exit(1);
});


session.on('connect', function(err) {
		console.log('Logged in.');
		console.log('Session level: %s', session.sessionLevel);		
		session.exec('help', function(response){
				response.dumpServerdData();
				session.exec('quit', function(response){
						response.dumpServerdData();
				});
		});
});

session.connect();

