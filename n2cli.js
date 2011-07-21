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
xml2jsparser = require('./libs/xml2jsparser'),
prompt = require('./libs/prompt').prompt,
b64 = require('./libs/b64'),
u = require('./libs/utils'),
netasqComm = require('./libs/netasq_comm'),


/**
* Prompt 
*/
i = 0,
PSTATE_HOST=i,
PSTATE_LOGIN=++i,
PSTATE_PWD=++i,
PSTATE_CLI=++i,
MAX_PSTATE = i;

/**
* Session
*/
session = netasqComm.createSession();

/**
* Exception management
* TODO: Enable it only in verbose mode
*/
//process.on('uncaughtException', function (err) {
//  console.log('Caught exception: ' + err);
//});





function manageServerdResponse(serverd)
{	
	switch(Number(serverd.ret)) {
		// NOT SUPPORTED
	case netasqComm.SERVERD_OK_SERVER_WAITING_MULTI_LINES: // Success: serverd is waiting for data
		console.log('NOT SUPPORTED!!!\ncode="%s" msg="%s"', serverd.code, serverd.msg);
		break;
		
		// Disconnected
	case netasqComm.SERVERD_OK_DISCONNECTED: // Success: Session is closed
	case netasqComm.SERVERD_KO_AUTH: // Authentication failed
	case netasqComm.SERVERD_KO_TIMEOUT_DISCONNECTED: // Failure: timout disonnected (no activity)
	case netasqComm.SERVERD_KO_MAXIMUM_ADMIN_REACH: // Failure: maximum administrator are connected to appliance
		console.log('code="%s" msg="%s"', serverd.code, serverd.msg);
		break;
		
		// Multiple lines
	case netasqComm.SERVERD_OK_MULTI_LINES: // Success multiple lines (+file download)
	case netasqComm.SERVERD_WARNING_OK_MULTI_LINE: // Success multiple lines but multiple warning
	case netasqComm.SERVERD_KO_MULTI_LINES:// Failure multiple line 
		console.log('code="%s" msg="%s"', serverd.code, serverd.msg);
		netasqComm.dumpServerdDataFormat(serverd.data);
		break;
		
		// One line
	case netasqComm.SERVERD_OK: // Success one line
	case netasqComm.SERVERD_OK_SERVER_NEED_REBOOT: // Success but appliance should be restarted (in order to apply modifications) 
	case netasqComm.SERVERD_WARNING_OK: // Success one line but one warning 
	case netasqComm.SERVERD_KO: // Failure one line
	case netasqComm.SERVERD_KO_LEVEL: // Administator do not have enought level to run specified command
	case netasqComm.SERVERD_KO_LICENCE: // Appliance do not have licence option to run specified command
		console.log('code="%s" msg="%s"', serverd.code, serverd.msg);
		setPrompt(PSTATE_CLI);
		break;
		
		// Others
	default:
		console.log('manageServerdResponse default: ', util.inspect(serverd, false, 100));
		setPrompt(PSTATE_CLI);
	}
}




function downloadfileCommand(fileName, path, size, crc){
	/*
	https://10.0.0.254/api/download/U70XXA9M1000019_16_Juil_2011.na?sessionid=IH02c7KChvmP
	Response header
	Cache-Control:no-cache, must-revalidate
	Connection:keep-alive
	Content-Disposition:attachment; filename="U70XXA9M1000019_16_Juil_2011.na"
	Content-Encoding:deflate
	Content-Length:79926
	Content-Type:application/force-download; name="U70XXA9M1000019_16_Juil_2011.na"
	Expires:0
	Pragma:no-cache
	Transfer-Encoding:chunked
	*/
	
	session.lastCliCmd = cmd;
	var
	postData = '',
	options = {
		host: session.host,
		path: 'api/download', // OK
		method: 'GET',
		headers: {
			Cookie: session.cookieToHeaderString()
		}
	};
	
	
	//console.log('options', options);
	//console.log('postData', postData);
	var request = https.request(options, function(response) {
			
			// Codec
			response.setEncoding('utf8');
			
			// Parser
			var parser = undefined;
			if (response.headers['content-type'].indexOf('text/xml') !== -1 ) {
				parser = xml2jsparser.createXML2JSParser();
				
				parser.onerror = function (e) {
					console.log('parser.onerror e:', e);
				};
				
				parser.ondone = function (data) {
					// Todo, enable in verbose mode?
					// console.log('parser.onend data:', util.inspect(data, false, 100));
					if (u.getObjectValue('nws.code', data) === '100') {
						
						var serverd = u.getObjectValue('nws.serverd', data);
						if (serverd instanceof Array) {
							var i;
							for (i in serverd) {
								manageServerdResponse(serverd[i]);
							}
						} else {
							manageServerdResponse(serverd);
						}
					} else {
						console.log(u.getObjectValue('nws.msg', data));
						setPrompt(PSTATE_CLI);
					}
				};
			}
			
			// Response
			if (response.statusCode !== 200) { // HTTP KO
				console.log('runCommand statusCode= %d', response.statusCode);
			}
			
			response.on('data', function(chunk) {
					if (parser) {
						parser.write(chunk);
						return;
					}
					console.log(chunk);
			});
			
			response.on('end', function(chunk) {
					if (parser) {
						parser.close();
					}
			});
			
	});
	
	request.end(postData, 'utf8');
	
	request.on('error', function(e) {
			console.log(e.message);
	});
}


function runCommand(cmd){
	// https://10.2.15.251/api/command?sessionid=6OhAqp5e0Ndc&command=help
	
	session.lastCliCmd = cmd;
	var
	postData = '',
	options = {
		host: session.host,
		path: '/api/command', // OK
		method: 'POST',
		headers: {
			Cookie: session.cookieToHeaderString()
		}
	};
	
	postData = 'sessionid=' + session.id;
	postData += '&cmd='+ cmd;
	postData += '&id='+ cmd;
	options.headers['Content-Length'] = postData.length;
	
	//console.log('options', options);
	//console.log('postData', postData);
	var request = https.request(options, function(response) {
			
			// Codec
			response.setEncoding('utf8');
			
			// Parser
			var parser = undefined;
			if (response.headers['content-type'].indexOf('text/xml') !== -1 ) {
				parser = xml2jsparser.createXML2JSParser();
				
				parser.onerror = function (e) {
					console.log('parser.onerror e:', e);
				};
				
				parser.ondone = function (data) {
					// Todo, enable in verbose mode?
					// console.log('parser.onend data:', util.inspect(data, false, 100));
					if (u.getObjectValue('nws.code', data) === '100') {
						
						var serverd = u.getObjectValue('nws.serverd', data);
						if (serverd instanceof Array) {
							var i;
							for (i in serverd) {
								manageServerdResponse(serverd[i]);
							}
						} else {
							manageServerdResponse(serverd);
						}
					} else {
						console.log(u.getObjectValue('nws.msg', data));
						setPrompt(PSTATE_CLI);
					}
				};
			}
			
			// Response
			if (response.statusCode !== 200) { // HTTP KO
				console.log('runCommand statusCode= %d', response.statusCode);
			}
			
			response.on('data', function(chunk) {
					if (parser) {
						parser.write(chunk);
						return;
					}
					console.log(chunk);
			});
			
			response.on('end', function(chunk) {
					if (parser) {
						parser.close();
					}
			});
			
	});
	
	request.end(postData, 'utf8');
	
	request.on('error', function(e) {
			console.log(e.message);
	});
}



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
				auth();
		});
		break;
	case PSTATE_CLI:
		prompt(session.login + '@' + session.host + '>', 'help', false, function(error, value){
				if (error) {
					return;
				}
				runCommand(value);
		});
		break;
	}
}

setPrompt(PSTATE_HOST);

