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
fs = require('fs'),
EventEmitter = require('events').EventEmitter,
/**
* Require: libs
* @private
*/
XML2JSParser = require('./xml2jsparser').XML2JSParser,
b64 = require('./base64'),
str = require('./str'),
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
				session.log('HTTP response status: %d %s', 
					response.statusCode,
					http.STATUS_CODES[response.statusCode]);
				session.log('HTTP response headers:', response.headers);		
				
				
				// Parser creation, not executed now.
				var parser;
				if (response.headers['content-type'].indexOf('text/xml') !== -1) {
					// Standart command response
					// Codec, NETASQ UTM speek UTF-8
					response.setEncoding('utf8');
					parser = new XML2JSParser();
					
					parser.onerror = function (e) {
						// an error happened.
						session.log('parser.onerror (NetasqRequest.request) e:', e);
					};
					
					parser.ondone = function (data) {
						session.log('HTTP data (jsonified): ', util.inspect(data, false, 100));
						me.emit('done', data);
					};
				} else if (response.headers['content-type'].indexOf('application/force-download') !== -1) {
					// File download
					// session.fileDlWStream has been assigned in downloadFileCommand() function
					response.setEncoding('binary');
					session.fileDlWStream.on('close', function() {
							me.emit('done');
					});
				}
				
				// TODO: manager other status code
				// Response management
				if (response.statusCode === 200) { // HTTP OK	
					updateSessionWithHttpHeaders(session, response);
				}
				
				response.on('data', function(chunk) {
						session.log('HTTP data (chunk): ', chunk);
						// Standart command response
						if (parser) { 
							parser.write(str.xmlTrimRight(chunk), 'utf8');
							return;
						}  
						// File download
						if (session.fileDlWStream && session.fileDlWStream.writable) {
							if (!session.fileDlWStream.write(chunk, 'binary')) {
								session.log('Write pending dl file error (kernel buffer is full)');
							}
						}
				});
				
				response.on('end', function() {
						if (parser) {
							parser.close();
							return;
						}
						if (session.fileDlWStream) {
							session.fileDlWStream.end();
							delete session.fileDlWStream;
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
* @event downloaded()
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
	/**
	* @property {string} login. Default to 'admin'
	*/
	this.login = login || 'admin';
	/**
	* @property {string} auth password
	*/
	this.pwd = pwd || '';
	/**
	* @property {string} firewall address
	*/
	this.host = host || '';
	/**
	* @property default to all SESSION_LEVELS
	*/
	this.requiredLevel = requiredLevel || SESSION_LEVELS.join(',');
	
	// Properties
	/**
	* @property {boolean} authentication state
	*/
	this.authenticated = false;
	/**
	* @property {string} session id. Needed by API.
	*/
	this.id = ''; // session id
	/**
	* @property {object} of cookie.  Needed by authentication.
	*/
	this.cookies = {};
	/**
	* @property {string} last executed command
	*/
	this.lastCliCmd = '';
	/**
	* @property {string} of level separated with a ',' delimitor
	*/
	this.sessionLevel = '';
	/**
	* @property
	*/
	this.fw = {
		/**
		* @property {string} firewall serial
		*/
		serial: '',
		/**
		* @property {string} firewall protocol version
		*/
		protocol: '',
		/**
		* @property {string} firewall command version
		*/
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
	* @see 'connected' event
	* @see 'error' event
	*/
	this.connect = function(cb) {
		authenticate(me, cb);
	};
	
	/**
	* @public
	* Run exec() with quit command 
	* @param [{function} cb({object} data)], optionnal, use a callback or 'commandResponse' event
	*/
	this.disconnect = function(cb) {
		this.exec('quit', cb);
	};
	
	/**
	* @public
	* @method
	* Run a command
	* @param {string} command
	* @param [{function} cb({object}data)], optionnal, use a callback or 'commandResponse' event
	* @see 'commandResponse' event
	*/
	this.exec = function(cmd, cb) {
		runCommand(me, cmd, cb);
	};
	
	
	/**
	* @public
	* @params {object} wStream: Writable Stream
	* @params {string} fileName
	* @param [{function} cb({object}data)], optionnal, use a callback or 'downloaded' event
	*/
	this.download = function(wStream, fileName, cb){
		downloadFileCommand(this, wStream, fileName, cb);
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
* @params {object} session Session
* @params {object} httpResponse
* @see node http.ClientResponse
* @see Session
* Support 'only' 'set-cookie' header for now
*/
function updateSessionWithHttpHeaders(session, httpResponse) {
	
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

/**
* @public
* @returns {boolean} true if a file is ready to be downloaded
* @params {object} data
* @exemple see exemples/n2cli.js
*/
function dataFollow(data) {
	if (data.nws.serverd instanceof Array) {
		return false;
	}
	
	if (data.nws.serverd.ret !== '101') {
		return false;
	}
	
	if (data.nws.serverd.code.substr(0, 6) !== '00a01c') {
		return false;
	}
	return true;
}


/**
* @private
* @params {Object} session
* @params {object} wStream: Writable Stream
* @params {string} fileName
* @param [{function} cb({object}data)], optionnal, use a callback or 'commandResponse' event
*/
function downloadFileCommand(session, wStream, fileName, cb){
	
	fileName = fileName || "defaultFileName.txt";
	session.log('downloadfileCommand wStream: ', wStream);
	session.log('downloadfileCommand fileName: ', fileName);
	
	
	// CONFIG BACKUP list=all	
	
	// Request URL:https://192.168.0.254/api/download/U70XXA9M1000019_07_Ao%C3%BBt_2011.na?sessionid=cgUoq4p1EExN
	// Request Method:GET
	// Status Code:200 OK
	
	// Request Headers
	// Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
	// Accept-Charset:ISO-8859-1,utf-8;q=0.7,*;q=0.3
	// Accept-Encoding:gzip,deflate,sdch
	// Accept-Language:fr-FR,fr;q=0.8,en-US;q=0.6,en;q=0.4
	// Connection:keep-alive
	// Cookie:U70XXA9M1000019_admin=admin,yefGrmsIh4e66yC8xP9xg0Q7wYy5xuAa/ElCTcGDu/Q=; netasq-nws-read-only=-1; netasq-nws-auth-certificate=-1
	// Host:192.168.0.254
	// Referer:https://192.168.0.254/admin/admin.html?nc=1312731467586
	// User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/13.0.782.109 Safari/535.1
	
	// Query String Parameters
	// sessionid:cgUoq4p1EExN
	
	// Response Headers
	// Cache-Control:no-cache, must-revalidate
	// Connection:keep-alive
	// Content-Disposition:attachment; filename="U70XXA9M1000019_07_Août_2011.na"
	// Content-Encoding:deflate
	// Content-Length:82662
	// Content-Type:application/force-download; name="U70XXA9M1000019_07_Août_2011.na"
	// Expires:0
	// Pragma:no-cache
	// Transfer-Encoding:chunked
	
	
	if (!session.authenticated) {
		throw 'Not authenticated';
	}
	if (session.hasOwnProperty('fileDlWStream')) {
		throw "Busy (A download is already pending)";
	}
	session.fileDlWStream = wStream;
	
	if (cb) {
		session.once('downloaded', cb);
	}
	
	var
	options = {
		host: session.host,
		path: '/api/download/' + fileName + '?sessionid=' + session.id , // OK
		method: 'GET',
		headers: {
			Cookie: cookiesToHeaderString(session.cookies)
		}
	};
	
	session.log('downloadFileCommand query: ', util.inspect(options, false, 100));
	
	NetasqRequest.request(session, options, function (data){
			session.emit('downloaded', data);
	});
}



/**
* TODO
*/
function dumpServerdDataSectionObject(section, ws) {
	ws = ws || process.stdout;
	if (section.title) {
		ws.write('[' + section.title + ']\n');
	}
	
	if (section.key instanceof Array) {
		var i;
		for (i = 0; i < section.key.length; i++) {
			ws.write(section.key[i].name + '=' + section.key[i].value + '\n');
		}
	} else {
		ws.write(section.key.name + '='+ section.key.value + '\n');
	}
}

/**
* @private
* @param {object} data
* @param {object} ws Writable Stream, default to process.stdout
*
*/
function dumpServerdDataObject(data, ws) {
	ws = ws || process.stdout;
	var i, j, line, tmp;
	switch(data.format) {
	case "section": //system property
		if (!data.section) {
			break;
		}
		
		if (data.section instanceof Array) {
			for (i in data.section) {
				if (data.section.hasOwnProperty(i)) {
					if (data.section[i].key === undefined) {
						continue;
					}
					dumpServerdDataSectionObject(data.section[i], ws);
					if (i < data.section.length - 1) { 
						ws.write(' \n');
					}
				}
			}
		} else {
			dumpServerdDataSectionObject(data.section, ws);
		}
		break;
		
	case "section_line": //monitor pvm host || log download name=alarm first="2010-01-01 00:00:00" last="2011-12-01 00:00:00"
	case "list": // config filter explicit type=filter useclone=1  index=9
		if (!data.section) {
			break;
		}
		
		if (data.section.title) {
			ws.write('['+ data.section.title + ']\n');
		}
		if (data.section.line instanceof Array) {
			for (i = 0; i < data.section.line.length; i++) { 
				tmp = data.section.line[i];
				line = '';
				if (tmp.hasOwnProperty('key')) {
					for (j in tmp.key) {
						if (tmp.key.hasOwnProperty(j)) {
							if (line.length !== 0) {
								line += ' ';
							}
							line += tmp.key[j].name + '=' + tmp.key[j].value;
						}
					}
				} else {
					line = tmp;
				}
				ws.write(line + '\n');	
			}
		} else {
			tmp = data.section.line;
			line = '';
			for (j in tmp.key) {
				if (tmp.key.hasOwnProperty(j)) {
					if (line.length !== 0) {
						line += ' ';
					}
					line += tmp.key[j].name + '=' + tmp.key[j].value;
				}
			}
			ws.write(line + '\n');
		}
		break;
		
	case "raw": // cdata or file dl, ex= help
		if (data.cdata) {
			ws.write(data.cdata + '\n');
			break;
		}
		if (data.crc && data.size) { 
			ws.write('File is ready to be downloaded\ncrc: ' + data.crc + ', size: ' + data.size + '\n');
			return;
		}
		ws.write('netasq_comm.dumpServerdDataObject: unsupported raw data\n');
		ws.write(util.inspect(data, false, 100) + '\n');
		break;
		
	case "xml": // config filter explicit type=filter useclone=1 output=xml index=9
		ws.write('XML format. Render is done as javascript.\n');
		ws.write(util.inspect(data, false, 100) + '\n');
		break;
		
	default:
		ws.write('Unmanaged format: ' + data.format + '\n');
		ws.write(util.inspect(data, false, 100) + '\n');		
	}
}

/**
* Dump to writable stream serverd object as a human readable format (ini style),
* function of served format
* @public 
* @param {object} serverd: part of returned data
* @param [{object}] ws: Writable Stream. Optionnal. Default to process.stdout
* @see Session.exec
* @see test/netasq-comm-*-format.js
* @example
* session.exec('help', function(data){
* 		netasqComm.dumpServerdObject(data.nws.serverd); // This will dump data to stdout
* })
*/
function dumpServerdObject(serverd, ws) {	
	ws = ws || process.stdout;
	var i;
	
	function dump(s) {
		switch(parseInt(s.ret, 10)) {
			// NOT SUPPORTED
		case SERVERD.OK_SERVER_WAITING_MULTI_LINES: // Success: serverd is waiting for data
			ws.write('NOT SUPPORTED!!!\ncode="' + s.code + '" msg="' + s.msg + '"\n');
			break;
			
			// Disconnected
		case SERVERD.OK_DISCONNECTED: // Success: Session is closed
		case SERVERD.KO_AUTH: // Authentication failed
		case SERVERD.KO_TIMEOUT_DISCONNECTED: // Failure: timout disonnected (no activity)
		case SERVERD.KO_MAXIMUM_ADMIN_REACH: // Failure: maximum administrator are connected to appliance
			ws.write('code="' + s.code + '" msg="' + s.msg + '"\n');
			break;
			
			// Multiple lines
		case SERVERD.OK_MULTI_LINES: // Success multiple lines (+file download)
		case SERVERD.WARNING_OK_MULTI_LINE: // Success multiple lines but multiple warning
		case SERVERD.KO_MULTI_LINES:// Failure multiple line 
			ws.write('code="' + s.code + '" msg="' + s.msg + '"\n');
			dumpServerdDataObject(s.data, ws);
			break;
			
			// One line
		case SERVERD.OK: // Success one line
		case SERVERD.OK_SERVER_NEED_REBOOT: // Success but appliance should be restarted (in order to apply modifications) 
		case SERVERD.WARNING_OK: // Success one line but one warning 
		case SERVERD.KO: // Failure one line
		case SERVERD.KO_LEVEL: // Administator do not have enought level to run specified command
		case SERVERD.KO_LICENCE: // Appliance do not have licence option to run specified command
			ws.write('code="' + s.code + '" msg="' + s.msg + '"\n');
			break;
			
			// Others
		default:
			ws.write('dumpServerdObject default: ', util.inspect(serverd, false, 100));
		}
	}
	
	if (serverd instanceof Array) {
		for (i = 0; i < serverd.length; i++) {
			dump(serverd[i]);
		}
	} else {
		dump(serverd);
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
* @see test/get-object-value.js
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
exports.dumpServerdObject = dumpServerdObject;
exports.getObjectValue = getObjectValue;
exports.dataFollow = dataFollow;
