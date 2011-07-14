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
netasq_session = require('./libs/netasq_session'),


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
session = netasq_session.createSession();

/**
* Exception management
* TODO: Enable it only in verbose mode
*/
//process.on('uncaughtException', function (err) {
//  console.log('Caught exception: ' + err);
//});




/**
* Login
*/
function login() {
	var
	requiredLevel = 'modify,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter',
	postData = '',
	options = {
		host: session.host,
		path: '/api/auth/login', // OK
		method: 'POST',
		headers: {
			Cookie: session.cookieToHeaderString()
		}
	}, p;
	
	// Adding cookies to request
	// TODO: add more intelligence > all cookies are served...
	/*for (p in session.cookies) {
	if (options.headers.Cookie.length !== 0) {
	options.headers.Cookie += '; ';
	}
	options.headers.Cookie += p;
	if (session.cookies[p].hasOwnProperty('value')) {
	options.headers.Cookie += "=" + session.cookies[p].value;
	}
	
	}*/
	//console.log('options', options);
	
	postData += 'reqlevel=' + requiredLevel;
	postData += '&id=login';
	options.headers['Content-Length'] = postData.length;
	
	console.log('Login...\nRequired level: %s', requiredLevel);
	//console.log("login query:", options);
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
				
				parser.ondone = function (json) {
					// Todo, enable in verbose mode?
					//console.log('parser.onend json:', util.inspect(json, false, 100));
					session.id = u.getObjectValue('nws.sessionid', json);
					if (u.getObjectValue('nws.code', json) === '100') {
						console.log('Logged in.\nSession level: %s', 
							u.getObjectValue('nws.sessionlevel', json));
						setPrompt(PSTATE_CLI);
					} else {
						console.log('Login failed.\n>');
					}
					
				};
			}
			
			// Response
			if (response.statusCode === 200) { // HTTP OK
				
			}
			
			response.on('data', function(chunk) {
					if (parser) {
						parser.write(chunk);
						//console.log(chunk); // tmp
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
* Authentication
*/
function auth() {
	
	// https://10.0.0.254/auth/admin.html?&pswd=cGFyZWlsMTkwOA%3D%3D&uid=YWRtaW4%3D
	session.login = 'admin';	
	var
	//pswd = 'pareil1908',
	uidB64 = b64.encode(session.login),
	pswdB64= b64.encode(session.pwd),
	url= '/auth/admin.html',
	options = {
		host: session.host,
		path: url + '?uid='+ uidB64 + '&pswd=' + pswdB64, // OK
		method: 'GET'
	};
	
	//console.log("query:", options);
	console.log("Connecting to %s as %s...", options.host, session.login);
	var request = https.request(options, function(response) {
			
			// Codec
			response.setEncoding('utf8');
			
			// Log
			//console.log("response statusCode: ", response.statusCode);
			//console.log("response headers: ", response.headers);
			
			// Parser
			var parser = undefined;
			if (response.headers['content-type'] === 'text/xml') {
				parser = xml2jsparser.createXML2JSParser();
				
				parser.ondone = function (json) {
					if(json.nws.value === 'ok') {
						session.authenticated = true;
						console.log('Authenticated!');
						//console.log('Authenticated!', session);
						login();
					} else {
						console.log('Authentication failed!');
					}
				};
			}
			
			
			// Response
			if (response.statusCode === 200) { // HTTP OK	
				// set-cookie header
				if(response.headers['set-cookie'] !== undefined) {
					var setCookie = response.headers['set-cookie'];
					var i;
					for (i = 0; i < setCookie.length; i++) { // for each cookie
						var cookie = setCookie[i].split('; ');
						var j, e, cookieName, key, value;  
						for (j = 0; j < cookie.length; j++) { // for each cople key=value 
							e = cookie[j].indexOf('=', 0);
							if (j === 0) { // cookie name is first property
								if (e === -1) {
									cookieName = cookie[j];
									value = '';
								} else {
									cookieName = cookie[j].slice(0, e);
									value = cookie[j].slice(++e, cookie[j].length);
								}
								session.cookies[cookieName] = {};
								if (cookieName !== value) { // is there a value?
									session.cookies[cookieName].value = value;
								}
							} else {
								if (e === -1) {
									key = cookie[j];
									value = true;
								} else {
									key = cookie[j].slice(0, e);
									value = cookie[j].slice(++e, cookie[j].length);
								}
								session.cookies[cookieName][key] = value;
							}
						} 
					}
				}
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
	
	request.end();
	request.on('error', function(e) {
			console.log(e.message);
	});
}

function dumpServerdDataFormatSection(section) {
	
	if (section.title) {
		console.log('[%s]', section.title);
	}
	
	if (section.key instanceof Array) {
		var i;
		for (i = 0; i < section.key.length; i++) {
			console.log('%s=%s', section.key[i].name, section.key[i].value);
		}
	} else {
		console.log('%s=%s', section.key.name, section.key.value);
	}
}

function manageServerdDataFormat(data) {
	var i;
	switch(data.format) {
	case "section":
		if (data.section instanceof Array) {
			for (i in data.section) {
				if (data.section[i].key === undefined) {
					continue;
				}
				dumpServerdDataFormatSection(data.section[i]);
				if (i < data.section.length - 1) { 
					console.log(' ');
				}
			}
		} else {
			dumpServerdDataFormatSection(data.section);
		}
		break;
		
	case "section_line":
		if (data.section.title) {
			console.log('[%s]', data.section.title);
		}
		for (i in data.section.line) {
			var j, 
			line = '';
			for (j in data.section.line[i].key) {
				if (line.length !== 0) {
					line += ' ';
				}
				line += data.section.line[i].key[j].name + '=' + data.section.line[i].key[j].value;
			}
			console.log(line);
			
		}
		break;
		
	case "raw":
		console.log(data.cdata);
		break;
	default:
		console.log('Unmanaged format: %s', data.format);
		console.log(util.inspect(data, false, 100));		
	}
}

function manageServerdResponse(serverd)
{
	switch(serverd.ret) {
	case '103': // Disconnected
		console.log('code="%s" msg="%s"', serverd.code, serverd.msg);
		break;
		
	case '101': // Start 
		console.log('code="%s" msg="%s"', serverd.code, serverd.msg);
		manageServerdDataFormat(serverd.data);
		break;
		
	case '200': // Unknown command
	case '100': // Ok 
	case '104': // Need reboot 
		console.log('code="%s" msg="%s"', serverd.code, serverd.msg);
		setPrompt(PSTATE_CLI);
		break;
		
	default:
		console.log(util.inspect(serverd, false, 100));
		setPrompt(PSTATE_CLI);
	}
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
			Cookie: ''
		}
	}, p;
	
	// Adding cookies to request
	// TODO: add more intelligence > all cookies are served...
	for (p in session.cookies) {
		if (options.headers.Cookie.length !== 0) {
			options.headers.Cookie += '; ';
		}
		options.headers.Cookie += p;
		if (session.cookies[p].hasOwnProperty('value')) {
			options.headers.Cookie += "=" + session.cookies[p].value;
		}
		
	}
	//console.log('options', options);
	
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
				
				parser.ondone = function (json) {
					// Todo, enable in verbose mode?
					//console.log('parser.onend json:', util.inspect(json, false, 100));
					if (u.getObjectValue('nws.code', json) === '100') {
						
						var serverd = u.getObjectValue('nws.serverd', json);
						if (serverd instanceof Array) {
							var i;
							for (i in serverd) {
								manageServerdResponse(serverd[i]);
							}
						} else {
							manageServerdResponse(serverd);
						}
					} else {
						console.log(u.getObjectValue('nws.msg', json));
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

