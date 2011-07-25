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
netasqComm = require('./libs/netasq_comm'),
prompt = require('./libs/prompt').prompt,
u = require('./libs/utils'),


/**
* Prompt 
*/
i = 0,
PSTATE_HOST=i,
PSTATE_LOGIN=++i,
PSTATE_PWD=++i,
PSTATE_CLI=++i,
MAX_PSTATE = i,

/**
* Session
*/
session = new netasqComm.Session();
//session.verbose = true;
session.on('error', function(error, errorString) {
		if (isNaN(error)) {
			console.log('session error: %s', error.message);
			return;
		}
		console.log('session error: %s (%d)', errorString, error);		
});


/**
* Exception management
* TODO: Enable it only in verbose mode
*/
//process.on('uncaughtException', function (err) {
//  console.log('Caught exception: ' + err);
//});




/**
* Prompt
*/
function setPrompt(state) {
	switch(state)
	{
	case PSTATE_HOST: 
		prompt('You want to connect to:', '10.0.0.254', false, function(error, value){
				if (error) {
					return;
				}
				session.host = value;
				setPrompt(PSTATE_LOGIN);
		});
		break;
	case PSTATE_LOGIN: 
		prompt('login:', 'admin', false, function(error, value){
				if (error) {
					return;
				}
				session.login = value;
				setPrompt(PSTATE_PWD);
		});
		break;
	case PSTATE_PWD: 
		prompt('password:', '', true, function(error, value){
				if (error) {
					return;
				}
				session.pwd = value;
				session.connect(function() {
						console.log('Logged in.');
						console.log('Session level: %s', session.sessionLevel);		
						setPrompt(PSTATE_CLI);
				});
		});
		break;
	case PSTATE_CLI:
		prompt(session.login + '@' + session.host + '>', 'help', false, function(error, value){
				if (error) {
					return;
				}
				session.exec(value, function(data){
						if (u.getObjectValue('nws.code', data) === '100') {
							var serverd = u.getObjectValue('nws.serverd', data);
							if (serverd instanceof Array) {
								var i;
								for (i = 0; i < serverd.length; i++) {
									manageServerdResponse(serverd[i]);
								}
							} else {
								manageServerdResponse(serverd);
							}
						} else {
							console.log(u.getObjectValue('nws.msg', data));
							setPrompt(PSTATE_CLI);
						}
				});
		});
		break;
	}
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
		setPrompt(PSTATE_CLI);
		break;
		
		// Others
	default:
		console.log('manageServerdResponse default: ', util.inspect(serverd, false, 100));
		setPrompt(PSTATE_CLI);
	}
}


setPrompt(PSTATE_HOST);

