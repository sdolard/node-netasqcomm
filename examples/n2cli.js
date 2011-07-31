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
netasqComm = require('../lib/netasq-comm'),
/**
* Session
*/
session = new netasqComm.Session();

session.verbose = true;
session.on('error', function(error, errorString) {
		if (isNaN(error)) {
			console.log('%s', error.message);
			return;
		}
		console.log('%s (%d)', errorString, error);		
});


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
		session.exec(value.cmd, function(data){
				var serverd, i;
				
				switch (netasqComm.getObjectValue('nws.code', data)) {
				case  '100': 
					serverd = netasqComm.getObjectValue('nws.serverd', data);
					if (serverd instanceof Array) {
						for (i = 0; i < serverd.length; i++) {
							manageServerdResponse(serverd[i]);
						}
					} else {
						manageServerdResponse(serverd);
					}
					break;
					
				case '203':
					console.log(netasqComm.getObjectValue('nws.msg', data));
					break;
					
				default:
					console.log(netasqComm.getObjectValue('nws.msg', data));
					promptCli();
				}
		});
	});
}

function manageServerdResponse(serverd)
{	
	switch(Number(serverd.ret)) {
		// NOT SUPPORTED
	case netasqComm.SERVERD.OK_SERVER_WAITING_MULTI_LINES: // Success: serverd is waiting for data
		console.log('NOT SUPPORTED!!!\ncode="%s" msg="%s"', serverd.code, serverd.msg);
		break;
		
		// Disconnected
	case netasqComm.SERVERD.OK_DISCONNECTED: // Success: Session is closed
	case netasqComm.SERVERD.KO_AUTH: // Authentication failed
	case netasqComm.SERVERD.KO_TIMEOUT_DISCONNECTED: // Failure: timout disonnected (no activity)
	case netasqComm.SERVERD.KO_MAXIMUM_ADMIN_REACH: // Failure: maximum administrator are connected to appliance
		console.log('code="%s" msg="%s"', serverd.code, serverd.msg);
		break;
		
		// Multiple lines
	case netasqComm.SERVERD.OK_MULTI_LINES: // Success multiple lines (+file download)
	case netasqComm.SERVERD.WARNING_OK_MULTI_LINE: // Success multiple lines but multiple warning
	case netasqComm.SERVERD.KO_MULTI_LINES:// Failure multiple line 
		console.log('code="%s" msg="%s"', serverd.code, serverd.msg);
		netasqComm.dumpServerdDataFormat(serverd.data);
		break;
		
		// One line
	case netasqComm.SERVERD.OK: // Success one line
	case netasqComm.SERVERD.OK_SERVER_NEED_REBOOT: // Success but appliance should be restarted (in order to apply modifications) 
	case netasqComm.SERVERD.WARNING_OK: // Success one line but one warning 
	case netasqComm.SERVERD.KO: // Failure one line
	case netasqComm.SERVERD.KO_LEVEL: // Administator do not have enought level to run specified command
	case netasqComm.SERVERD.KO_LICENCE: // Appliance do not have licence option to run specified command
		console.log('code="%s" msg="%s"', serverd.code, serverd.msg);
		promptCli();
		break;
		
		// Others
	default:
		console.log('manageServerdResponse default: ', util.inspect(serverd, false, 100));
		promptCli();
	}
}

prompt.start();
prompt.get([
		{
			message: 'You want to connect to',    
			name: 'host',                   
			default: '192.168.0.254'                      
		},{
			message: 'Login',     
			name: 'login',                   
			default: 'admin'                
		},{
			message: 'Password',    
			name: 'pwd',                          
			hidden: true
		}
], function (err, result) {
	if (err) {
		return;
	}
	session.host = result.host;
	session.login = result.login;
	session.pwd = result.pwd;
	
	console.log('Connecting to %s...', session.host);
	session.connect(function() {
			console.log('Logged in.');
			console.log('Session level: %s', session.sessionLevel);		
			promptCli();
	});
});

