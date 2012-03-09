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
xml2jsparser = require('./xml2jsparser'),
str = require('./str'),
ka = require('./keepalive'),
sdr = require('./session_data_response'),
/**
* CONSTS
*/
i = 0,
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
* @private
* @params session, options, callback
* @see http.clientRequest
* @singleton
* @inherits EventEmitter
*/
// TODO: add mimetype on 'done' event 
NetasqRequest = function () {
	var 
	me = this;
	this.request = function (session, options, callback) { 
		me.once('done', callback);
		options = options || {};
		session._keepAlive.stop();
		
		var	
		// ssl or not?
		r = session.ssl ? https.request(options): http.request(options);
		
		r.on('response', function(response) {
				// Only headers are set in this callback
				session.log('HTTP response version: %s', response.httpVersion);
				session.log('HTTP response status: %d %s', 
					response.statusCode,
					http.STATUS_CODES[response.statusCode]);
				session.log('HTTP response headers:', response.headers);		
				
				var 
				parser, // 'text/xml' > Parser creation, not executed now.
				data; // 'other type mime
				
				if (response.headers['content-type'].indexOf('text/xml') !== -1) {
					// upload cleanup (on upload response)
					// rSteam > stream we read and upload
					if (session.fileTransfer &&  session.fileTransfer.rStream) {
						delete session.fileTransfer.rStream;
						delete session.fileTransfer;
					}
					
					// Standart command response
					// Codec, NETASQ UTM speek UTF-8
					response.setEncoding('utf8');
					parser = xml2jsparser.create({
							verbose: session.verbose
					});
					parser.onerror = function (e) {
						// an error happened.
						session.log('parser.onerror (NetasqRequest.request) e:', e.message);
						session._eemit('error', e);
					};
					
					// parser 'ondone' event
					parser.ondone = function (data) {
						var sessionDataResponse = sdr.create({
								verbose: session.verbose,
								data: data
						}); 
						sessionDataResponse.on('error', function(err){
								session._eexception(err);	
						});
						
						me.emit('done', sessionDataResponse);
						
						// File upload or download
						if (!sessionDataResponse.dataFollow() && !sessionDataResponse.waitingForData()) {
							session._keepAlive.restart();
						}
						
						// 'disconnected' event
						if (!session._authenticated || !sessionDataResponse.data.nws || !sessionDataResponse.data.nws.code) {
							return;
						}
						switch (parseInt(sessionDataResponse.data.nws.code, 10)) {
						case sdr.NWS_ERROR_CODE.OK: 
							if(!sessionDataResponse.data.nws.serverd) {
								return;
							}
							switch(parseInt(sessionDataResponse.data.nws.serverd.ret, 10)) {
							case sdr.SERVERD.OK_DISCONNECTED:
							case sdr.SERVERD.KO_TIMEOUT_DISCONNECTED:
								session._setSessionDisconnected();
							}
							break;
							
						case sdr.NWS_ERROR_CODE.INVALID_SESSION:
							session._setSessionDisconnected();
							break;
						}
					};
					
				} else if (response.headers['content-type'].indexOf('application/force-download') !== -1) {
					// File download
					// session.fileTransfer.wStream has been assigned in downloadFileCommand() function
					response.setEncoding('binary');
					session.fileTransfer.wStream.on('close', function() {
							me.emit('done');
							session._keepAlive.restart();
					});
					
					// Resume the read stream when the write stream gets hungry 
					session.fileTransfer.wStream.on('drain', function() {
							response.resume();
							session.log('File download: kernel buffer is ready (resume)');
					});
				} else { // no type-mime test (html?)
					// Standart command response
					// Codec, NETASQ UTM speek UTF-8
					response.setEncoding('utf8');
				}
				
				// TODO: manage other status code, if there is
				// Response management
				if (response.statusCode === 200) { // HTTP OK	
					session._readHttpHeaders(response);
				}
				
				response.on('data', function(chunk) {
						
						// text/xml type mime: standart command response
						if (parser) {
							session.log('HTTP response data (chunk): ', chunk);
							// TODO: write error (cf drain event)
							parser.write(str.xmlTrimRight(chunk), 'utf8');
							return;
						}  
						//  application/force-download type mime: File download
						if (session.fileTransfer && session.fileTransfer.wStream) {
							if (!session.fileTransfer.wStream.write(chunk, 'binary')) {
								session.log('File download: kernel buffer is full (paused)');
								response.pause();
							} else {
								session.log('HTTP response data (file download)[...]');
							}
							return;
						}
						// Other type mime
						data += chunk;
						session.log('HTTP response data (chunk): ', chunk);
				});
				
				response.on('end', function() {
						session.log('Response end');
						if (parser) {
							parser.close();
							return;
						}
						if (session.fileTransfer && session.fileTransfer.wStream) {// download
							session.fileTransfer.wStream.end();
							delete session.fileTransfer.wStream;
							delete session.fileTransfer;
							return;
						}
						// others type mime
						var sessionDataResponse = sdr.create({
								verbose: session.verbose,
								data: data
						}); 
						sessionDataResponse.on('error', function(err){
								session._eexception(err);	
						});
						me.emit('done', sessionDataResponse);
						session._keepAlive.restart();
				});
				
				response.on('close', function() {
						// This should not occured, cf nodejs doc.
						session.log('Connection closed');
						session._eemit('error', {
								code: 'ECONNCLOSED',
								message: 'Connection closed'
						});
				});
				
		});
		
		// Socket error event
		r.on('error', function(e) {
				session.log("NetasqRequest r.on error", e);        
				session._eemit('error', e);	
				session._keepAlive.restart();
		});
		
		// Socket continue event
		r.on('continue', function() {
				session.log("NetasqRequest r.on 'continue' (TODO?)");
		});
		
		
		// HTTP method
		switch(options.method)
		{
		case 'POST':
			
			if (session.fileTransfer && session.fileTransfer.rStream) {
				// File upload
				session.log(session.fileTransfer.beginData);
				r.write(session.fileTransfer.beginData, 'binary');
				
				session.fileTransfer.rStream.on('end', function(){
						session.log('session.fileTransfer.rStream.on end');
						session.log(session.fileTransfer.endData);
						
						r.end(session.fileTransfer.endData, 'binary');
				});
				session.fileTransfer.rStream.pipe(r, { 
						end: false 
				});
				session.fileTransfer.rStream.resume();
			} else {
				if (!options.postData) {
					session._eexception({
							code: 'EPOSTDATA',
							message: 'options.postData property is missing'
					});
					return;
				}
				
				r.end(options.postData, 'utf8'); 
			}
			break;
		case 'GET':
			r.end(); 
			break;
		default:
			session.log("NetasqRequest unmanaged request method: %s',", options.method);
		}
		
	};
	EventEmitter.call(this);
};
util.inherits(NetasqRequest, EventEmitter); // http://nodejs.org/docs/latest/api/util.html#util.inherits
NetasqRequest = new NetasqRequest(); // singleton, must be done after util.inherits call



/**
* @class
* @inherits EventEmitter
* @event connected()
* @event commandResponse({string} session level)
* @event downloaded()
* @event uploaded()
* @event diconnected()
* @event error({object} exception)
* @params {object} config
* @see SESSION_LEVELS
*/
var Session = function (config) {
	config = config || {};
	var 
	me = this;
	
	// Contructor params 
	/**
	* @property {string} login. Default to 'admin'
	*/
	this.appName = config.appName || 'netasqcomm';
	
	/**
	* @property {string} login. Default to 'admin'
	*/
	this.login = config.login || '';
	
	/**
	* @property {string} auth password
	*/
	this.pwd = config.pwd || '';
	
	/**
	* @property {string} firewall address
	*/
	this.host = config.host || '';
	
	/**
	* @property {number} communication port
	*/
	this.port = config.port || 443;
	
	/**
	* @property {boolean} use ssl
	*/
	this.ssl = config.ssl === undefined ? true : config.ssl;
	
	/**
	* @property {boolean} Set to true to enable log() method
	* @public
	* @see log()
	*/
	this.verbose =  config.verbose || false; 
	
	/**
	* @property default to all SESSION_LEVELS
	*/
	this.requiredLevel = config.requiredLevel || SESSION_LEVELS.join(',');
	
	// Properties
	/**
	* @property {boolean} authentication state
	*/
	this._authenticated = false;
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
		command: '',
		/**
		* @property {bool} true if a configuration modification require to reboot appliance
		* TODO: check every return?
		*/
		needReboot: false
	};
	
	/**
	* @private
	* Comm keep alive
	*/
	this._keepAlive = ka.create({
			delay: 30000, // 30s
			cb: function() {
				if (!me._authenticated) {
					me._keepAlive.stop();	
					return;
				}
				me.exec('nop');
			}
	});
	
	
	EventEmitter.call(this); 
};
util.inherits(Session, EventEmitter); // http://nodejs.org/docs/latest/api/util.html#util.inherits


/**
* @public
* @method
* Connect to NETASQ appliance
* @param [{function} callback], optionnal, use a callback or 'connected' event
* @see 'connected' event
* @see 'error' event
*/
Session.prototype.connect = function(cb) {
	this._authenticate(cb);
};


/**
* @public
* Run exec() with quit command 
* @param [{function} cb({object} data)], optionnal, use a callback or 'commandResponse' event
* @see 'disconnected' event
*/
Session.prototype.disconnect = function(cb) {
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
Session.prototype.exec = function(cmd, cb) {
	if (!this._authenticated) {
		this._eexception({
				code: 'ENOAUTH',
				message: 'Not authenticated'
		});
		return;
	}
	if (cb) {
		this.once('commandResponse', cb);
	}
	
	this.lastCliCmd = cmd;
	
	var
	me = this,
	options = {
		host: this.host,
		port:  this.port,
		path: '/api/command',
		method: 'POST',
		headers: {
			Cookie: this._cookiesToHeaderString(),
			Connection: 'Keep-Alive'
		}, 
		postData: ''
	};      
	
	this.log('runCommand: %s', cmd);
	options.postData = 'sessionid=' + this.id;
	options.postData += '&cmd='+ cmd;
	options.postData += '&id='+ cmd;
	options.headers['Content-Length'] = options.postData.length;
	
	NetasqRequest.request(this, options, function (sessionDataResponse){
			me._eemit('commandResponse', sessionDataResponse);
	});
};



/**
* @public
* Use to download a file (Ex: backup)
* This must be called after a command result followed by data
* Only one file can be dl at time
* @params {object} wStream: Writable Stream
* @params {string} fileName, default to 'defaultFileName.txt'
* @param [{function} cb({object}data)], optionnal, use a callback or 'downloaded' event
* @throw ENOAUTH, Not authenticated
* @throw EBUSY, Busy (File transfer pending)
* @throw EWSTREAM, 'wStream is not writable'
* @see dataFollow
*/
Session.prototype.download = function(wStream, fileName, cb){	
	fileName = fileName || "defaultFileName.txt";
	this.log('downloadfileCommand wStream: ', wStream);
	this.log('downloadfileCommand fileName: ', fileName);
	
	if (!this._authenticated) {
		this._eexception({
				code: 'ENOAUTH',
				message: 'Not authenticated'
		});
		return;
	}
	if (this.hasOwnProperty('fileTransfer')) {
		this._eexception({
				code: 'EBUSY',
				message: 'Busy (File transfer pending)'
		});
		return;
	}
	if(!wStream.writable) {
		this._eexception({
				code: 'EWSTREAM',
				message: 'wStream is not writable'
		});
		return;
	}
	
	this.fileTransfer = {
		wStream: wStream
	};
	
	if (cb) {
		this.once('downloaded', cb);
	}
	
	var
	me = this,
	options = {
		host: this.host,
		port:  this.port,
		path: '/api/download/' + fileName + '?sessionid=' + this.id, // OK
		method: 'GET',
		headers: {
			Cookie: this._cookiesToHeaderString(),
			Connection: 'Keep-Alive'
		}
	};
	
	this.log('downloadFileCommand query: ', util.inspect(options, false, 100));
	
	NetasqRequest.request(this, options, function (sessionDataResponse){
			me._eemit('downloaded', sessionDataResponse);
	});
};


/**
* @public
* @params {string} fileName
* @param [{function} cb({object}data)], optionnal, use a callback or 'uploaded' event
*/
Session.prototype.upload = function(fileName, cb){
	var 
	me = this;
	fileName = fileName || '';
	this.log('uploadFileCommand fileName: ', fileName);
	
	if (!this._authenticated) {
		this._eexception({
				code: 'ENOAUTH',
				message: 'Not authenticated'
		});
		return;
	}
	if (this.hasOwnProperty('fileTransfer')) {
		this._eexception({
				code: 'EBUSY',
				message: 'Busy (File transfer pending)'
		});
		return;
	}
	if (cb) {
		this.once('uploaded', cb);
	}
	
	fs.stat(fileName, function(err, stats) {
			if (!err) { // no erro, "something" exists
				if (stats.isFile()) {
					me.log('%s found', fileName);
					
					// We create readStream
					me.fileTransfer ={
						rStream:  fs.createReadStream(fileName, { 
								flags: 'r'
						}),
						beginData: '',
						endData: '',
						fileName: fileName
					};
					
					me.fileTransfer.rStream.pause();
					me.fileTransfer.rStream.on('error', function (exception) {
							me.log('session.fileTransfer.rStream error', exception);
					});
					me.fileTransfer.rStream.on('close', function () {
							me.log('session.fileTransfer.rStream close');
					}); 
					me.fileTransfer.rStream.on('data', function (data) {
							me.log('session.fileTransfer.rStream writing data[...]');
					});
					
					/*
					// Header
					Content-Type: multipart/form-data; boundary=---------------------------168072824752491622650073 
					Content-Length: 1439 
					
					// Data
					-----------------------------168072824752491622650073 
					Content-Disposition: form-data; name="upload"; filename="LICENSE" 
					
					Content-Type: application/octet-stream 
					Copyright © 2011 by Sebastien Dolard (sdolard@gmail.com) Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN 
					-----------------------------168072824752491622650073 
					
					Content-Disposition: form-data; name="restore-action-firewall-selection" U70XXA9M1000019 
					-----------------------------168072824752491622650073-- 
					*/
					
					var
					boundary = '--------------' + parseInt(Math.random()*99999999999999999, 10),
					options;
					
					me.fileTransfer.beginData = '--' + boundary + '\r\n';
					me.fileTransfer.beginData += 'Content-Disposition: form-data; name="upload"; filename="'+ fileName + '"\r\n';
					me.fileTransfer.beginData += 'Content-Type: application/octet-stream\r\n\r\n';
					me.fileTransfer.endData += '\r\n--' + boundary + '--\r\n';
					
					options = {
						host: me.host,
						path: '/api/upload?sessionid=' + me.id, // OK
						method: 'POST',
						port:  me.port,
						headers: { 
							'Content-Type': 'multipart/form-data; boundary=' + boundary,
							'Content-Length' : me.fileTransfer.beginData.length + stats.size + me.fileTransfer.endData.length, 
							Cookie: me._cookiesToHeaderString(),
							Connection: 'Keep-Alive'
						}
					};
					
					me.log('uploadFileCommand query: ', util.inspect(options, false, 100));
					
					NetasqRequest.request(me, options, function (sessionDataResponse){
							me._eemit('uploaded', sessionDataResponse);
					});
				}
			} else {
				me.log('%s not found!', fileName);
				me._eemit('error', err);
			} 
	});
};



/**
* @private
*/
Session.prototype._setSessionDisconnected = function (){
	this._authenticated = false;
	this._keepAlive.stop();
	this._eemit('disconnected');
};


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
	console.error.apply(console, args);
};


/**
* @private
*/
Session.prototype._eexception = function(exception) {
	// TODO: check if exception is an Error to just forward it
	var 
	error = new Error(exception.message);
	error.code = exception.code;
	
	this.emit('error', error);
	if (this.verbose && typeof error.stack === 'string') {
		console.log(error.stack);
	}
};

/**
*@private
*/
Session.prototype._eemit = function(){
	switch(arguments.length) {
	case 1:
		this.emit(arguments[0]);
		break;
	case 2:
		this.emit(arguments[0], arguments[1]);
		break;
	case 3:
		this.emit(arguments[0], arguments[1], arguments[2]);
		break;
	default:
		throw new Error('Session.prototype._eemit: invalid argument(s)');
	}	
};


/**
* Populate or update Session object function of header response
* @private
* @params {object} httpResponse
* @see node http.ClientResponse
* @see Session
* Support 'only' 'set-cookie' header for now
*/
Session.prototype._readHttpHeaders = function(httpResponse) {
	// set-cookie header
	if(httpResponse.headers['set-cookie'] === undefined) {
		this.log('"set-cookie" header not found.');
		return;
	}
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
				this.cookies[cookieName] = {};
				if (cookieName !== value) { // is there a value?
					this.cookies[cookieName].value = value;
				}
			} else {
				if (e === -1) {
					key = cookie[j];
					value = true;
				} else {
					key = cookie[j].slice(0, e);
					value = cookie[j].slice(++e, cookie[j].length);
				}
				this.cookies[cookieName][key] = value;
			}
		} 
	}
};


/**
* Authentication
* @function
* @private
*/
Session.prototype._authenticate = function (cb) {
	var 
	me = this;
	if (this._authenticated) {
		this._eexception({
				code: 'EALREADYAUTH',
				message: 'Already authenticated'
		});	
		return;
	}
	this.log('session: ', util.inspect(this, false, 1));
	
	var 
	loginBuffer = new Buffer(this.login),
	pwdBuffer = new Buffer(this.pwd),
	options = {
		host: this.host,
		path: '/auth/admin.html?app=' + this.appName +'&uid=' + loginBuffer.toString('base64') + '&pswd=' + pwdBuffer.toString('base64'), 
		method: 'GET',
		port:  this.port,
		headers: {
			Connection: 'Keep-Alive'
		} 
	};
	
	NetasqRequest.request(this, options, function (sessionDataResponse){
			var msg = '';
			if(sessionDataResponse.getValue('nws.value') === 'ok') {
				me._authenticated = true;
				me.log('Authenticated!');
				me._login(cb);
				return;
			} 
			
			// Error
			try {
				msg = 'Authentication failed: ' + sessionDataResponse.getValue('nws.msg');
				//me.log(msg);
				me._eemit('error', { 
						code: "EAUTH", 
						message: msg
				});
			} catch(e) {
				if (e.code === 'EUNDEFPROP') {
					msg = 'Authentication failed (invalid login or password)!';
					me._eemit('error', { 
							code: "EAUTH", 
							message: msg
					});
					return;
				} else {
					me._eemit('error', e);
				}
			}
	});
};

/**
* Login
* @method 
* @private
*/
Session.prototype._login = function(cb) {
	if (!this._authenticated) {
		this._eexception({
				code: 'ENOAUTH',
				message: 'Not authenticated'
		});
		return;
	}
	if (cb) {
		this.once('connected', cb);
	}
	var
	me = this,
	postData = '',
	options = {
		host: this.host,
		port:  this.port,
		path: '/api/auth/login',
		method: 'POST',
		headers: {
			Cookie: this._cookiesToHeaderString(), 
			Connection: 'Keep-Alive'
		}, 
		postData: ''
	};                                                   
	
	options.postData += 'app=' + this.appName;
	options.postData += '&reqlevel=' + this.requiredLevel;
	options.postData += '&id=login';
	options.headers['Content-Length'] = options.postData.length;
	
	this.log('Required level: %s\nLogin...', this.requiredLevel);
	NetasqRequest.request(this, options, function (sessionDataResponse){
			switch (parseInt(sessionDataResponse.getValue('nws.code'), 10)) {
			case sdr.NWS_ERROR_CODE.OK:
				me.id = sessionDataResponse.getValue('nws.sessionid');
				me.sessionLevel = sessionDataResponse.getValue('nws.sessionlevel');
				me.fw.serial = sessionDataResponse.getValue('nws.serial');
				me.fw.protocol = sessionDataResponse.getValue('nws.protocol');
				me.fw.command = sessionDataResponse.getValue('nws.command');
				if(sessionDataResponse.data.nws.need_reboot) {
					me.fw.needReboot = sessionDataResponse.getValue('nws.need_reboot') === '1';
				}
				me.log('Logged in.\nSession level: %s', me.sessionLevel);
				me._eemit('connected');
				break;
				
			case sdr.NWS_ERROR_CODE.TOO_MANY_USER_AUTHENTICATED: 
				me.log('Login failed.');
				me._eemit('error', {
						code: 'ETOOMANYUSER', 
						message: 'Too many user authenticated'
				});
				me._eemit('disonnected');
				break;
				
			default: 
				me.log('Login failed.');
				me._eemit('error', { 
						code: 'ELOGIN', 
						message: 'Login failed (invalid login or password)'
				});
			}
	});
};



/**
* @private
* @function
* @returns {string} Value to set in 'Set-Cookie' HTTP header request
* @param {object} Session.cookies
* TODO: @param {string} path, default to '/'
* TODO: @param {number} port, default to 443
* @see Session.cookies
*/
Session.prototype._cookiesToHeaderString = function () {
	var r = '', p;
	
	for (p in this.cookies) {
		if (this.cookies.hasOwnProperty(p)) {
			if (r.length !== 0) {
				r += '; ';
			}
			r += p;
			if (this.cookies[p].hasOwnProperty('value')) {
				r += "=" + this.cookies[p].value;
			}
		}
	}
	return r;
};




/*******************************************************************************
* Exports
*******************************************************************************/
exports.createSession = function (config) {
	return new Session(config);
};

exports.SESSION_LEVELS = SESSION_LEVELS;
exports.SERVERD = sdr.SERVERD;
exports.NWS_ERROR_CODE = sdr.NWS_ERROR_CODE;
