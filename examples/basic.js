/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
util = require('util'),

//profiler = require('v8-profiler'),


session = require('../lib/netasqcomm').createSession({
		login: 'admin',
		pwd: 'adminadmin',
		host: '10.0.0.254',
		/*pwd: 'simple1107',
		host: '192.168.0.254',*/
		verbose: false // true if you want debug logs
});

//console.log(profiler.takeSnapshot('foo'));
//profiler.startProfiling('bar');                   //begin cpu profiling

console.log(util.format('Connecting to %s...', session.host));
session.connect(function(err) {
		if (err) {
			console.log(err.message);
	//		console.log(util.inspect(profiler.stopProfiling('bar'), true, null));
			
	//		console.log(profiler.takeSnapshot('baz'));
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

