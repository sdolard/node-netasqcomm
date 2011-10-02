/*
Copyright © 2011 by Sebastien Dolard (sdolard@gmail.com)


Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*/

var 
/**
* requirements
*/
util = require('util'),
https = require('https'),
prompt = require('prompt'),
fs = require('fs'),
netasqComm = require('../lib/netasq-comm'),
getopt = require('posix-getopt'),
optParser, opt, promptArray = [],

/**
* Session
*/
session = new netasqComm.Session();
session.on('error', function(error) {
		if (error) {
			console.log('Session error (%s): %s', error.code, error.message);	
			process.exit(1);
			return;
		}
		console.log('Session error occured (no details)');
		process.exit(1);
});

/**
* Uncaught exception 
*/
process.on('uncaughtException', function (exception) {
		console.error('Process uncaught exception: ', exception.message);
});


/**
* Display help
*/
function displayHelp() {
	console.log('n2cli.js [–v] [–h] [–s] [-d] [–a address] [-l login] [-p password] [-P port]');
	console.log('NETASQ node cli example.');
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
		return;
		
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
		return;
	}
}

/**
* Verbose mode
*/
if (session.verbose) {
	console.log('Verbose enabled');
}

/**
* Manage response
*   - data to display
*   - file upload/download
*/
function manageResponse(data) {
	var serverd, fileSize, fileCRC, fileName, fileWs;
	
	switch (parseInt(netasqComm.getObjectValue('nws.code', data),10)) {
	case netasqComm.NWS_ERROR_CODE.OK: 
		serverd = netasqComm.getObjectValue('nws.serverd', data);
		netasqComm.dumpServerdObject(serverd);
		
		switch(parseInt(serverd.ret, 10)) {
			// Success: serverd is waiting for data
		case netasqComm.SERVERD.OK_SERVER_WAITING_MULTI_LINES: 
			prompt.get([
					{
						message: 'File to upload',    
						name: 'file'/*, 
						default: '/Users/sebastiend/Dev/perso/node/node-netasq-comm/download_config-backup-list=object_V50XXA0H0000003'  */         
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
		case netasqComm.SERVERD.KO_TIMEOUT_DISCONNECTED: // Failure: timout disonnected (no activity)
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
			
			if (netasqComm.dataFollow(data)) {
				fileSize = data.nws.serverd.data.size;
				fileCRC = data.nws.serverd.data.crc;
				fileName = 'download_' + data.nws.id.replace(/\s/g, '-') + '_' + session.fw.serial;
				
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
		console.log(netasqComm.getObjectValue('nws.msg', data));
		break;
		
	default:
		console.log(netasqComm.getObjectValue('nws.msg', data));
		promptCli();
	}
}

/**
* Prompt cli
*/
function promptCli() {
	prompt.get([
			{
				message: session.login + '@' + session.host,
				name: 'cmd', 
				default: 'help'
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
			mode: 0666 
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
* Prompt configuration
*/
prompt.start();

if (session.host === '') {	
	promptArray.push({
			message: 'You want to connect to',    
			name: 'host',                   
			default: '192.168.115.128'                      
	});
}

if (session.login === '') {	
	promptArray.push({
			message: 'Login',     
			name: 'login',                   
			default: 'admin'                
	});
}

if (session.pwd === '') {	
	promptArray.push({
			message: 'Password',    
			name: 'pwd',                          
			hidden: true,                   
			default: 'adminadmin'
	});
}

function connect() {
	console.log('Connecting to %s:%s...', session.host, session.port);
	session.connect(function() {
			console.log('Logged in.');
			console.log('Session level: %s', session.sessionLevel);		
			promptCli();
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
