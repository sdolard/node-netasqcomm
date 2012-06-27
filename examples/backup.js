/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
util = require('util'),
session = require('../lib/netasqcomm').createSession({
		login: 'admin',
		pwd: 'simple1107',
		//host: '10.0.0.254', 
		host: 'sdolard.dyndns.org',
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


session.on('connected', function() {
		console.log('Logged in.');
		var 
		now = new Date(),
		fileName = util.format('%s_backup_%s.na', 
			session.host,
			now.toISOString());
		
		
		console.log('Downloading backup for %s...', session.host);
		session.downloadBackup(fileName, 'all', function(err, size, crc){
				if (err) {
					console.log(err);
				} else {
					console.log('Backup downloaded: %s (size: %s, crc: %s)', fileName, size, crc);
				}
				session.exec('quit', function(response){
						response.dumpServerdData();
				});
		});
});

session.connect();

