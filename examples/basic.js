/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
util = require('util'),

session = require('../lib/netasqcomm').createSession({
		login: 'admin',
		pwd: 'adminadmin',
		host: '10.0.0.254',
		verbose: false // true if you want debug logs
});

console.log(util.format('Connecting to %s...', session.host));
session.connect(function(err) {
		if (err) {
			console.log(err.message);
			process.exit(1);
		}
		
		console.log('Logged in.');
		console.log('Session level: %s', session.sessionLevel);	
		console.log('> HELP');
		session.exec('help', function(err, response){
				if (err) {
					console.log(err.message);
				} else {
					response.dumpServerdData();
				}
				console.log('> QUIT');
				session.exec('quit', function(err, response){
						if (err) {
							console.log(err.message);
						} else {
							response.dumpServerdData();
						}
				});
		});
});

