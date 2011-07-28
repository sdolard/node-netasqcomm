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
* Require: node
* @private
*/
util = require('util'),
http = require('http'),
https = require('https'),
EventEmitter = require('events').EventEmitter,
/**
* Require: libs
* @private
*/
XML2JSParser = require('./xml2jsparser').XML2JSParser,
b64 = require('./base64'),
/**
* CONSTS
*/
i = 0,
/**
* @public
* @const
* @event error
*/
SESSION_ERRORS = {
	AUTH_FAILED: i++,
	LOGIN_FAILED: i++,
	TOO_MANY_USER_AUTHENTICATED: i++
},
/**
* @public
* @const
* @event error
*/
SESSION_ERRORS_MSG = {
	AUTH_FAILED: 'Authentication failed',
	LOGIN_FAILED: 'Login failed',
	TOO_MANY_USER_AUTHENTICATED: 'Too many user authenticated'
},
/**
* Session levels
* @public
* @const
*/
SESSION_LEVELS = [
	'modify',
	'base',
	'contentfilter',
	'log',
	'filter',
	'vpn',
	'log_read',
	'pki',
	'object',
	'user',
	'admin',
	'network',
	'route',
	'maintenance',
	'asq',
	'pvm',
	'vpn_read',
	'filter_read',
	'globalobject',
	'globalfilter'
],
/**
* Serverd protocole consts
* @public
* @consts
*/
SERVERD = {
	/**
	* OK
	*/
	OK: 100, // Success one line 
	OK_MULTI_LINES: 101, // Success multiple lines
	OK_SERVER_WAITING_MULTI_LINES: 102, // Success: serverd is waiting for data
	OK_DISCONNECTED: 103, // Success: session is closed
	OK_SERVER_NEED_REBOOT: 104, // Success but appliance should be restarted (in order to apply modifications)
	
	/**
	* WARNING
	*/
	WARNING_OK: 110, // Success but one warning 
	WARNING_OK_MULTI_LINE: 111,// Success but multiple warning
	
	/**
	* KO
	*/
	KO: 200, // Failure one line 
	KO_MULTI_LINES: 201, // Failure multiple line 
	KO_AUTH: 202, // Authentication failed
	KO_TIMEOUT_DISCONNECTED: 203, // Failure: timout disonnected (no activity)
	KO_MAXIMUM_ADMIN_REACH: 204, // Failure: maximum administrator are connected to appliance
	KO_LEVEL: 205, // Administator do not have enought level to run specified command
	KO_LICENCE: 206// Appliance do not have licence option to run specified command
},
/**
* @private
* @params session, options, callback
* @see http.clientRequest
* @singleton
* @inherits EventEmitter
*/
NetasqRequest = function () {
	var me = this;
	this.request = function (session, options, callback) { 
		me.once('done', callback);
		session = session || {};
		options = options || {};
		var	r = https.request(options, function(response) {	
				// Only headers are set in this callback
				session.log('HTTP response version: %s', response.httpVersion);
				session.log('HTTP response status: %s (%d)', 
					http.STATUS_CODES[response.statusCode], 
					response.statusCode);
				session.log('HTTP response headers:', response.headers);		
				
				// Codec, NETASQ UTM speek UTF-8
				response.setEncoding('utf8');
				
				// Parser creation, not executed now.
				var parser;
				if (response.headers['content-type'].indexOf('text/xml') !== -1) {
					parser = new XML2JSParser();
					
					parser.ondone = function (data) {
						session.log('HTTP data (jsonified): ', util.inspect(data, false, 100));
						me.emit('done', data);
					};
				}
				
				// TODO: manager other status code
				// Response management
				if (response.statusCode === 200) { // HTTP OK	
					httpHeadersToSession(response, session);
				}
				
				response.on('data', function(chunk) {
						session.log('HTTP data (chunk): ', chunk);
						
						if (parser) {
							parser.write(chunk);
							return;
						}
						session.log(chunk);
				});
				
				response.on('end', function() {
						if (parser) {
							parser.close();
						}
				});
				
		});
		
		r.on('error', function(e) {
				session.emit('error', e);
		});
		r.on('continue', function() {
				session.log("NetasqRequest r.on continue' (TODO?)");
		});
		
		switch(options.method)
		{
		case 'POST':
			if (!options.postData) {
				throw 'options.postData do not exists!';
			}
			r.end(options.postData, 'utf8'); 
			break;
		case 'GET':
			r.end(); 
			break;
		default:
			session.log("NetasqRequest unmanaged request method: %s',", options.method);
		}
		
	};
	EventEmitter.call(this);
},
/**
* @class
* @inherits EventEmitter
* @event error({Error} error || {number} errorCode, {string} errorString)
* @event connected()
* @event commandResponse({string} session level)
* @params {string} login
* @params {string} pwd
* @params {string} host
* @params [{string} requiredLevel] default to all SESSION_LEVELS
* @see SESSION_ERRORS
* @see SESSION_ERRORS_MSG
* @see SESSION_LEVELS
*/
Session = function (login, pwd, host, requiredLevel) {
	var me = this;
	// Contructor params 
	this.login = login || 'admin';
	this.pwd = pwd || '';
	this.host = host || '';
	this.requiredLevel = requiredLevel || SESSION_LEVELS.join(',');
	
	// Properties
	this.authenticated = false;
	this.id = ''; // session id
	this.cookies = {};
	this.lastCliCmd = '';
	this.sessionLevel = '';
	this.fw = {
		serial: '',
		protocol: '',
		command: ''
	};
	/**
	* Set to true to enable log() method
	* @public
	* @see log()
	*/
	this.verbose = false; 
	
	/**
	* @public
	* @method
	* Connect to NETASQ appliance
	* @param [{function} callback], optionnal, use a callback or 'connected' event
	* @see SESSION_ERRORS,
	* @see connected event
	* @see error event
	*/
	this.connect = function(cb) {
		authenticate(me, cb);
	};
	
	// TODO: doc
	/**
	* 
	*/
	this.disconnect = function() {
		this.exec('quit');
	};
	
	/**
	* @public
	* @method
	* Run a command
	* @param {string} command
	* @param [{function} cb()], optionnal, use a callback or 'commandResponse' event
	* @see commandResponse event
	*/
	this.exec = function(cmd, cb) {
		runCommand(me, cmd, cb);
	};
	
	EventEmitter.call(this); 
};
util.inherits(NetasqRequest, EventEmitter); // http://nodejs.org/docs/latest/api/util.html#util.inherits
util.inherits(Session, EventEmitter); // http://nodejs.org/docs/latest/api/util.html#util.inherits
NetasqRequest = new NetasqRequest(); // singleton, must be done after util.inherits call



/** 
* Log only if verbose is positive
* @public
* @method
*/
Session.prototype.log = function() {
	if (!this.verbose) {
		return;
	}
	var 
	args = arguments,
	v = 'verbose# ';
	args[0] = args[0].replace('\n', '\n' + v);
	args[0] = v.concat(args[0]);
	console.log.apply(console, args);
};

/**
* @private
* @function
* @returns {string} Value to set in 'Set-Cookie' HTTP header
* @param {object} Session.cookies
* @param {string} path, default to '/'
* @param {number} port, default to 80
* @see Session.cookies
*/
function cookiesToHeaderString(cookies, path, port) {
	// TODO: add more intelligence > all cookies are served, for all port, domain, path...
	cookies = cookies || undefined;
	path = path || '/';
	port = port || 80;
	var r = '', p;
	
	for (p in cookies) {
		if (cookies.hasOwnProperty(p)) {
			if (r.length !== 0) {
				r += '; ';
			}
			r += p;
			if (cookies[p].hasOwnProperty('value')) {
				r += "=" + cookies[p].value;
			}
		}
	}
	return r;
}

/**
* Populate or update Session object function of header response
* @private
* @params {object} httpResponse
* @params {object} session Session
* @see node http.ClientResponse
* @see Session
* Support 'only' 'set-cookie' header for now
*/
function httpHeadersToSession(httpResponse, session) {
	
	// set-cookie header
	if(httpResponse.headers['set-cookie'] !== undefined) {
		var 
		setCookie = httpResponse.headers['set-cookie'],
		i,
		cookie, j, e, cookieName, key, value;
		for (i = 0; i < setCookie.length; i++) { // for each cookie
			cookie = setCookie[i].split('; ');
			for (j = 0; j < cookie.length; j++) { // for each couple key=value 
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



/**
* Authentication
* @function
* @private
*/
function authenticate (session, cb) {
	if (session.authenticated) {
		throw "Already authenticated";	
	}
	
	var 
	options = {
		host: session.host,
		path: '/auth/admin.html?uid='+ b64.encode(session.login) + '&pswd=' + b64.encode(session.pwd), 
		method: 'GET'
	};
	
	NetasqRequest.request(session, options, function (data){
			if(getObjectValue('nws.value', data) === 'ok') {
				session.authenticated = true;
				session.log('Authenticated!');
				login(session, cb);
			} else {
				session.log('Authentication failed (login or password is wrong)!');
				session.emit('error', SESSION_ERRORS.AUTH_FAILED, SESSION_ERRORS_MSG.AUTH_FAILED);
			}
	});
}

/**
* Login
* @method 
* @private
*/
function login (session,  cb) {
	if (!session.authenticated) {
		throw 'Not authenticated';
	}
	if (cb) {
		session.once('connected', cb);
	}
	var
	postData = '',
	options = {
		host: session.host,
		path: '/api/auth/login',
		method: 'POST',
		headers: {
			Cookie: cookiesToHeaderString(session.cookies)
		}, 
		postData: ''
	};                                                   
	
	options.postData += 'reqlevel=' + session.requiredLevel;
	options.postData += '&id=login';
	options.headers['Content-Length'] = options.postData.length;
	
	session.log('Required level: %s\nLogin...', session.requiredLevel);
	NetasqRequest.request(session, options, function (data){
			switch (getObjectValue('nws.code', data)) {
			case '100':
				session.id = getObjectValue('nws.sessionid', data);
				session.sessionLevel = getObjectValue('nws.sessionlevel', data);
				session.fw.serial = getObjectValue('nws.serial', data);
				session.fw.protocol = getObjectValue('nws.protocol', data);
				session.fw.command = getObjectValue('nws.command', data);
				session.log('Logged in.\nSession level: %s', session.sessionLevel);
				session.emit('connected');
				
				break;
				//setPrompt(PSTATE_CLI);
			case '500': // { nws: { code: '500', msg: 'Too many user authenticated' } }
				session.log('Login failed.');
				session.emit('error', SESSION_ERRORS.TOO_MANY_USER_AUTHENTICATED, 
					SESSION_ERRORS_MSG.TOO_MANY_USER_AUTHENTICATED);
				break;
				
			default: 
				session.log('Login failed.');
				session.emit('error', SESSION_ERRORS.LOGIN_FAILED, 
					SESSION_ERRORS_MSG.LOGIN_FAILED);
			}
	});
}

function runCommand(session, cmd, cb){
	if (!session.authenticated) {
		throw 'Not authenticated';
	}
	if (cb) {
		session.once('commandResponse', cb);
	}
	
	session.lastCliCmd = cmd;
	
	var
	options = {
		host: session.host,
		path: '/api/command',
		method: 'POST',
		headers: {
			Cookie: cookiesToHeaderString(session.cookies)
		}, 
		postData: ''
	};      
	
	// https://10.2.15.251/api/command?sessionid=6OhAqp5e0Ndc&command=help
	
	session.log('runCommand: %s', cmd);
	options.postData = 'sessionid=' + session.id;
	options.postData += '&cmd='+ cmd;
	options.postData += '&id='+ cmd;
	options.headers['Content-Length'] = options.postData.length;
	
	NetasqRequest.request(session, options, function (data){
			session.emit('commandResponse', data);
	});
}


// TODO implement
/*
function downloadfileCommand(fileName, path, size, crc){

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
}
*/


/**
* TODO
*/
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

/**
* @public
*/
function dumpServerdDataFormat(data) {
	var i, j, line;
	switch(data.format) {
	case "section":
		if (!data.section) {
			break;
		}
		
		if (data.section instanceof Array) {
			for (i in data.section) {
				if (data.section.hasOwnProperty(i)) {
					if (data.section[i].key === undefined) {
						continue;
					}
					dumpServerdDataFormatSection(data.section[i]);
					if (i < data.section.length - 1) { 
						console.log(' ');
					}
				}
			}
		} else {
			dumpServerdDataFormatSection(data.section);
		}
		break;
		
	case "section_line":
		if (!data.section) {
			break;
		}
		
		if (data.section.title) {
			console.log('[%s]', data.section.title);
		}
		for (i in data.section.line) { 
			if (data.section.line.hasOwnProperty(i)) {
				line = '';
				for (j in data.section.line[i].key) {
					if (data.section.line[i].key.hasOwnProperty(j)) {
						if (line.length !== 0) {
							line += ' ';
						}
						line += data.section.line[i].key[j].name + '=' + data.section.line[i].key[j].value;
					}
				}
				console.log(line);
			}	
		}
		break;
		
	case "raw": // cdata or file dl
		if (data.cdata) {
			console.log(data.cdata);
			break;
		}
		if (data.crc && data.size) { 
			console.log('File is ready to be downloaded\ncrc: %s, size: %s', 
				data.crc, data.size);
			return;
		}
		console.log('netasq_comm.dumpServerdDataFormat: unsupported raw data', util.inspect(data, false, 100));
		break;
		
	case "list": // TODO: implement LIST format
		//config filter explicit type=filter useclone=1  index=9
		console.log('Unmanaged format: %s', data.format);
		console.log(util.inspect(data, false, 100));
		break;
		
	case "xml": // TODO: implement XML format
		// config filter explicit type=filter useclone=1 output=xml index=9
		console.log('Unmanaged format: %s', data.format);
		console.log(util.inspect(data, false, 100));
		break;
		
	default:
		console.log('Unmanaged format: %s', data.format);
		console.log(util.inspect(data, false, 100));		
	}
}


/**
* @public
* @returns obj reference value related to str path
* @throw error if property does not exists
* @example
*	foo: {
*		bar: 'value'
* 	}
* 	getObjectValue('foo.bar', foo) returns 'value'
* 	getObjectValue('help', foo) throw an error
*/
function getObjectValue(str, obj) {
	str = str || '';
	if (obj === undefined) {
		throw new SyntaxError('getObjectValue(str, obj): obj argument is missing');
	}
	
	var 
	prop = str.split('.'),
	objRef = obj,
	i;
	
	for (i in prop) {
		if (objRef.hasOwnProperty(prop[i])) {
			objRef = objRef[prop[i]];
		} else {
			throw new Error('getObjectValue: "' + prop[i] + '" property is undefined!');
		}
	}
	return objRef;
}

/*******************************************************************************
* Exports
*******************************************************************************/
exports.Session = Session;
exports.SESSION_ERRORS = SESSION_ERRORS;
exports.SESSION_ERRORS_MSG = SESSION_ERRORS_MSG;
exports.SESSION_LEVELS = SESSION_LEVELS;
exports.SERVERD = SERVERD;
exports.dumpServerdDataFormat = dumpServerdDataFormat;
exports.getObjectValue = getObjectValue;
