/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var 
https = require('https'),
prompt = require('prompt'),
fs = require('fs'),

// contrib
getopt = require('posix-getopt'), 
netasqComm = require('./netasqcomm'),

// gvar
optParser, opt, promptArray = [],

/**
* Session
*/
session = netasqComm.createSession({
		appName: 'nn2cli' 
});
session.on('error', function(error) {
		if (error) {
			console.error('Session error (%s): %s', error.code, error.message);	
			if (session.verbose && typeof error.stack === 'string') {
				console.log(error.stack);
			}
			process.exit(1);
			return;
		}
		console.log('Session error occured (no details)');
		process.exit(1);
});

session.on('disconnected', function() {
		console.log('Disconnected');
		process.exit(0);
});


/**
* Uncaught exception 
*/
process.on('uncaughtException', function (exception) {
		console.error('Process uncaught exception (%s): %s', exception.code, exception.message);	
		if (session.verbose && typeof exception.stack === 'string') {
			console.log(exception.stack);
		}
		process.exit(1);
});


/**
* Display help
*/
function displayHelp() {
	console.log('nncli [–v] [–h] [–s] [-d] [–a address] [-l login] [-p password] [-P port]');
	console.log('NETASQ Node CLI.');
	console.log('Options:');
	console.log('  v: enable verbose');
	console.log('  h: display this help');
	console.log('  a: firewall address');
	console.log('  l: login');
	console.log('  p: password');
	console.log('  P: port');
	console.log('  d: disable ssl');
}

/**
* Command line options
*/
optParser = new getopt.BasicParser(':hdva:l:p:P:', process.argv);
while ((opt = optParser.getopt()) !== undefined && !opt.error) {
	switch(opt.option) {
	case 'v': // verbose
		session.verbose = true;
		break;
		
	case 'h': // help
		displayHelp();
		process.exit(0);
		break;
		
	case 'a': // address
		session.host = opt.optarg;
		break;
		
	case 'l': // login
		session.login = opt.optarg;
		break;
		
	case 'p': // password
		session.pwd = opt.optarg;
		break;
		
	case 'P': // port
		session.port = opt.optarg;
		break;
		
	case 'd': // disable ssl
		session.ssl = false;
		break;
		
	default:
		console.log('Invalid or incomplete option');
		displayHelp();
		break;
	}
}

/**
* Verbose mode
*/
if (session.verbose) {
	console.log('Verbose enabled');
}

/**
* Prompt cli
*/
function promptCli() {
	prompt.get([
			{
				message: session.login + '@' + session.host,
				name: 'cmd', 
				'default': 'help'
			}
	], function(error, value){
		if (error) {
			return;
		}
		session.exec(value.cmd, manageResponse);
	});
}


function downloadFile(session, fileName, fileWs, size) {
	// create file
	fileWs = fs.createWriteStream(fileName, { 
			flags: 'w',
			encoding: 'binary',
			mode: 666 
	});
	fileWs.on('error', function (exception) {
			console.log('fileWs error', exception);
	});
	/*fileWs.on('close', function () {
	//		console.log('fileWs close');
	});*/
	console.log('Download pending...');
	session.download(fileWs, fileName, function(){
			console.log('%s downloaded.', fileName);
			console.log('Checking file size...');
			
			fs.stat(fileName, function(err, stats) {
					if (!err) { // no erro, "something" exists
						if (stats.size !== parseInt(size, 10)) {
							console.log('File size is not valid: %do instead of %do!', stats.size, size);
						} else  {
							console.log('File size is valid.');
						}
					} else {
						console.log('File %s not found!.', fileName);
					}
					promptCli();
			});
	});
}

/**
* Manage response
*   - data to display
*   - file upload/download
*/
function manageResponse(response) {
	var serverd, fileSize, fileCRC, fileName, fileWs;
	
	switch (parseInt(response.getValue('nws.code'),10)) {
	case netasqComm.NWS_ERROR_CODE.OK: 
		serverd = response.getValue('nws.serverd');
		response.dumpServerdData();
		
		switch(parseInt(serverd.ret, 10)) {
			// Success: serverd is waiting for data
		case netasqComm.SERVERD.OK_SERVER_WAITING_MULTI_LINES: 
			prompt.get([
					{
						message: 'File to upload',    
						name: 'file'/*, 
						default: '/Users/sebastiend/Dev/perso/node/node-netasqcomm/download_config-backup-list=object_V50XXA0H0000003'  */         
					}
			], function (err, result) {
				if (err) {
					return;
				}
				console.log('Uploading %s...', result.file);
				session.upload(result.file, manageResponse);
			});
			
			break;
			
			// Disconnected
		case netasqComm.SERVERD.OK_DISCONNECTED: // Success: Session is closed
			process.exit(0);
			break;
			
		case netasqComm.SERVERD.KO_AUTH: // Authentication failed
		case netasqComm.SERVERD.KO_TIMEOUT_DISCONNECTED: // Failure: timout disconnected (no activity)
		case netasqComm.SERVERD.KO_MAXIMUM_ADMIN_REACH: // Failure: maximum administrator are connected to appliance
			process.exit(1);
			break;
			
			// Multiple lines
		case netasqComm.SERVERD.OK_MULTI_LINES: // Success multiple lines (+file download)
		case netasqComm.SERVERD.WARNING_OK_MULTI_LINE: // Success multiple lines but multiple warning
		case netasqComm.SERVERD.KO_MULTI_LINES:// Failure multiple line 
			fileSize = '';
			fileCRC = ''; 
			fileName = '';
			
			if (response.dataFollow()) {
				fileSize = response.getValue('nws.serverd.data.size');
				fileCRC = response.getValue('nws.serverd.data.crc');
				fileName = 'download_' + response.getValue('nws.id').replace(/\s/g, '-') + '_' + session.fw.serial;
				
				// We delete file if already exists
				fs.stat(fileName, function(err, stats) {
						if (!err) { // no erro, "something" exists
							if (stats.isFile()) {
								console.log('%s already exists. Deleting...', fileName);
								fs.unlink(fileName, function(exception){
										//console.log('in fs.unlink', exception);
										if (exception) {
											console.log('An error occured when trying to delete %s: ', fileName, exception);
										} else {
											downloadFile(session, fileName, fileWs, fileSize);
										}
								});
							}
						} else if (err.code === 'ENOENT') {
							downloadFile(session, fileName, fileWs, fileSize);
						} 
				});
				
			} else {
				promptCli();
			}
			break;
			
			// One line
		case netasqComm.SERVERD.OK: // Success one line
		case netasqComm.SERVERD.OK_SERVER_NEED_REBOOT: // Success but appliance should be restarted (in order to apply modifications) 
		case netasqComm.SERVERD.WARNING_OK: // Success one line but one warning 
		case netasqComm.SERVERD.KO: // Failure one line
		case netasqComm.SERVERD.KO_LEVEL: // Administator do not have enought level to run specified command
		case netasqComm.SERVERD.KO_LICENCE: // Appliance do not have licence option to run specified command
			promptCli();
			break;
			
			// Others
		default:
			promptCli();
		}
		break;
		
	case netasqComm.NWS_ERROR_CODE.INVALID_SESSION:
	case netasqComm.NWS_ERROR_CODE.REQUEST_ERROR: 
		console.log(response.getValue('nws.msg'));
		break;
		
	default:
		console.log(response.getValue('nws.msg'));
		promptCli();
	}
}



/**
* Prompt configuration
*/
prompt.start();

if (session.host === '') {	
	promptArray.push({
			message: 'You want to connect to',    
			name: 'host',                   
			'default': '10.0.0.254'                      
	});
}

if (session.login === '') {	
	promptArray.push({
			message: 'Login',     
			name: 'login',                   
			'default': 'admin'                
	});
}

if (session.pwd === '') {	
	promptArray.push({
			message: 'Password',    
			name: 'pwd',                          
			hidden: true,                   
			'default': 'admin'
	});
}

function connect() {
	console.log('Connecting to %s:%s...', session.host, session.port);
	session.connect(function() {
			session.exec('system property', function(response){
					console.log('Logged in firewall %s', session.fw.serial);
					console.log('Model: %s; Version: %s', 
						response.serverdData().Result.Model,
						response.serverdData().Result.Version);
					session.exec('system date', function(response){
							console.log('Date Time: %s', 
								response.serverdData().Result.Date);
							console.log('Session level: %s', session.sessionLevel);		
							if (session.fw.needReboot) {
								console.log('* This appliance require to reboot. *');	
							}
							promptCli();
					});
			});
	});
}

if (promptArray.length === 0) {
	connect();
} else {
	prompt.get(promptArray, function (err, result) {
			if (err) {
				return;
			}
			session.host = result.host || session.host;
			session.login = result.login || session.login;
			session.pwd = result.pwd || session.pwd;
			connect();
	});
}

