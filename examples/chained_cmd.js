/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
util = require('util'),
session = require('../lib/netasqcomm').createSession({
		//host: '10.0.0.254',
		host: '10.2.15.254',
		login: 'admin',
		pwd: 'keepsafe',
		//pwd: 'adminamdin',
		verbose: false // true if you want debug logs
});


session.on('connect', function(err) {
	if (err) {
		console.log(err.message);
		process.exit(1);
	}

	var 
	now = new Date(),
	fileName = util.format('%s_backup_%s.na', 
		session.host,
		now.toISOString());

	console.log('Logged in.');
	console.log('Session level: %s', session.sessionLevel);		

	session.exec('list', function(err, response){
			if (err) {
				console.log(err.message);
			} else {
				response.dumpServerdData();
			}
	});
	session.exec('help', function(err, response){
			if (err) {
				console.log(err.message);
			} else {
				response.dumpServerdData();
			}			
	});
	
	session.downloadBackup(fileName, 'all', function(err, size, crc){
			if (err) {
				console.log(err);
			} else {
				console.log('Backup downloaded: %s (size: %s, crc: %s)', fileName, size, crc);
			}
	});

	session.exec('config restore list=object', function(err, response){
			if (err) {
				console.log(err.message);
			} else {
				response.dumpServerdData();
			}			
	});

	session.upload(fileName, function(err, response){
			if (err) {
				console.log(err);
			} else {
				response.dumpServerdData();
				console.log('Backup restored', fileName);
			}
	});

	session.exec('quit', function(err, response){
			if (err) {
				console.log(err.message);
			} else {
				response.dumpServerdData();
			}
	});

	// should failed
	session.exec('monitor host', function(err, response){
			if (err) {
				console.log(err.message);
			} else {
				response.dumpServerdData();
			}			
	});
	// should failed
	session.exec('quit', function(err, response){
			if (err) {
				console.log(err.message);
			} else {
				response.dumpServerdData();
			}
	});
});

session.connect();

