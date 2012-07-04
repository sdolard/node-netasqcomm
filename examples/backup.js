/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
util = require('util'),
session = require('../lib/netasqcomm').createSession({
		login: 'admin',
		/*pwd: 'adminadmin',
		host: '10.0.0.254',*/
		pwd: 'simple1107',
		host: 'sdolard.dyndns.org',
		verbose: false // true if you want debug logs
});

console.log(util.format('Connecting to %s...', session.host));

session.connect(function(err) {
		if (err) {
			console.log(err.message);
			process.exit(1);
		}
		
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

