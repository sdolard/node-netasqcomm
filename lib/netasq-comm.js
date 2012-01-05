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
* NWS protocol error code consts
* @public
* @consts
*/
NWS_ERROR_CODE = {
	OK: 100,
	REQUEST_ERROR: 200,
	INVALID_SESSION: 203,
	TOO_MANY_USER_AUTHENTICATED: 500
};




/**
* @public
* @returns {boolean} true if a file is ready to be downloaded
* @params {object} data
* @exemple see bin/nncli.js
* TODO: attach to a responseObject
*/
function dataFollow(data) {
	if (!data.nws || !data.nws.serverd) {
		return false;
	}
	
	if (data.nws.serverd instanceof Array) {
		return false;
	}
	
	if (parseInt(data.nws.serverd.ret, 10) !== SERVERD.OK_MULTI_LINES) {
		return false;
	}
	// TODO: what means 00a01c?
	if (data.nws.serverd.code.substr(0, 6) !== '00a01c') { 
		return false;
	}
	return true;
}

/**
* @public
* @returns {boolean} true if firewall is waiting for data (file) upload
* @params {object} data
* TODO: attach to a responseObject
*/
function waitingForData(data) {
	if (!data.nws || !data.nws.serverd) {
		return false;
	}
	
	if (data.nws.serverd instanceof Array) {
		return false;
	}
	
	if (parseInt(data.nws.serverd.ret, 10) !== SERVERD.OK_SERVER_WAITING_MULTI_LINES) {
		return false;
	}
	
	// TODO: what means 00a003?
	if (data.nws.serverd.code.substr(0, 6) !== '00a003') {
		return false;
	}
	return true;
}


/**
* @private
* @params session, options, callback
* @see http.clientRequest
* @singleton
* @inherits EventEmitter
*/
// TODO: add mimetype on 'done' event 
var NetasqRequest = function () {
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
						session.log('HTTP data (jsonified): ', util.inspect(data, false, 100));
						me.emit('done', data);
						
						// File upload or download
						if (!dataFollow(data) && !waitingForData(data)) {
							session._keepAlive.restart();
						}
						
						// 'disconnected' event
						if (!session._authenticated || !data.nws || !data.nws.code) {
							return;
						}
						switch (parseInt(data.nws.code, 10)) {
						case NWS_ERROR_CODE.OK: 
							if(!data.nws.serverd) {
								return;
							}
							switch(parseInt(data.nws.serverd.ret, 10)) {
							case SERVERD.OK_DISCONNECTED:
							case SERVERD.KO_TIMEOUT_DISCONNECTED:
								session._setSessionDisconnected();
							}
							break;
							
						case NWS_ERROR_CODE.INVALID_SESSION:
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
						me.emit('done', data);
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
* @private
*/
function createBoundary() {
	return '--------------' + parseInt(Math.random()*99999999999999999, 10);  
}




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
	
	NetasqRequest.request(this, options, function (data){
			me._eemit('commandResponse', data);
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
	
	NetasqRequest.request(this, options, function (data){
			me._eemit('downloaded', data);
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
					boundary = createBoundary(),
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
					
					NetasqRequest.request(me, options, function (data){
							me._eemit('uploaded', data);
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
Session.prototype._eexception = function(exception, more) {
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
		path: '/auth/admin.html?uid=' + loginBuffer.toString('base64') + '&pswd=' + pwdBuffer.toString('base64'), 
		method: 'GET',
		port:  this.port,
		headers: {
			Connection: 'Keep-Alive'
		} 
	};
	
	NetasqRequest.request(this, options, function (data){
			if(me.getObjectValue('nws.value', data) === 'ok') {
				me._authenticated = true;
				me.log('Authenticated!');
				me._login(cb);
			} else {
				me.log('Authentication failed (login or password is wrong)!');
				me._eemit('error', { 
						code: "EAUTH", 
						message: "Authentication failed"
				});
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
	
	options.postData += 'reqlevel=' + this.requiredLevel;
	options.postData += '&id=login';
	options.headers['Content-Length'] = options.postData.length;
	
	this.log('Required level: %s\nLogin...', this.requiredLevel);
	NetasqRequest.request(this, options, function (data){
			switch (parseInt(me.getObjectValue('nws.code', data), 10)) {
			case NWS_ERROR_CODE.OK:
				me.id = me.getObjectValue('nws.sessionid', data);
				me.sessionLevel = me.getObjectValue('nws.sessionlevel', data);
				me.fw.serial = me.getObjectValue('nws.serial', data);
				me.fw.protocol = me.getObjectValue('nws.protocol', data);
				me.fw.command = me.getObjectValue('nws.command', data);
				if(data.nws.need_reboot) {
					me.fw.needReboot = me.getObjectValue('nws.need_reboot', data) === '1';
				}
				me.log('Logged in.\nSession level: %s', me.sessionLevel);
				me._eemit('connected');
				break;
				
			case NWS_ERROR_CODE.TOO_MANY_USER_AUTHENTICATED: 
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
Session.prototype.getObjectValue = function(str, obj) {
	str = str || '';
	obj = obj || {};
	
	var 
	prop = str.split('.'),
	objRef = obj,
	i, stackLevel = 0;
	
	for (i in prop) {
		if (objRef.hasOwnProperty(prop[i])) {
			objRef = objRef[prop[i]];
			stackLevel++;
		} else {
			this._eexception({
					code: 'EUNDEFPROP',
					message: '"' + prop[i] + '" property is not defined in "' + util.inspect(obj, false, stackLevel) + '"'
			});
		}
	}
	return objRef;
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


/**
* @private
* @param {object} data
* @param {object} ws Writable Stream, default to process.stdout
*/
// TODO: ws.write error (cf drain event)
// TODO: review this code
function dumpServerdDataObject(data, ws) {
	ws = ws || process.stdout;
	var i, j, line, tmp;
	switch(data.format) {
	case "section": //system property
		if (!data.section) {
			break;
		}
		
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
		//log download name=alarm first="2010-09-03 14:30:00" last="2010-09-03 16:00:00"
	case "list": // config filter explicit type=filter useclone=1  index=9
		if (!data.section) {
			break;
		}
		function dumpSection(section) {
			if (section.title) {
				ws.write('['+ section.title + ']\n');
			}
			if (section.line instanceof Array) {
				for (i = 0; i < section.line.length; i++) { 
					tmp = section.line[i];
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
				tmp = section.line;
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
		}
		if (data.section instanceof Array) {
			for (i in data.section) {
				if (data.section.hasOwnProperty(i)) {
					dumpSection(data.section[i]);
				}
			}
		} else {
			dumpSection(data.section);
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
* function of serverd format
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
// TODO: ws.write error (cf drain event)
function dumpServerdObject(serverd, ws) {	
	ws = ws || process.stdout;
	var i;
	
	function dump(s) {
		switch(parseInt(s.ret, 10)) {
		case SERVERD.OK_SERVER_WAITING_MULTI_LINES: // Success: serverd is waiting for data
			ws.write('code="' + s.code + '" msg="' + s.msg + '"\n');
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



/*******************************************************************************
* Exports
*******************************************************************************/
exports.createSession = function (config) {
	return new Session(config);
};

exports.SESSION_LEVELS = SESSION_LEVELS;
exports.SERVERD = SERVERD;
exports.NWS_ERROR_CODE = NWS_ERROR_CODE;
exports.dumpServerdObject = dumpServerdObject;
exports.dataFollow = dataFollow;
exports.waitingForData = waitingForData;
