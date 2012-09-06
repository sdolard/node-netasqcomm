/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/


var
// node
util = require('util'),
http = require('http'),
https = require('https'),
fs = require('fs'),
EventEmitter = require('events').EventEmitter,


// contrib
/*nodetime = require('nodetime').profile({
		accountKey: '7f699878c6b0a4f44e04f8da2f7ea4284c6e77d0', 
		appName: 'Node.js Application'
}),*/
// lib
xml2jsparser = require('./xml2jsparser'),
str = require('./str'),
ka = require('./keepalive'),
sdr = require('./session_data_response'),

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
Session = function (config) {
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
*
* @param {Function} callback{{Error} err = undefined, [{SessionDataResponse} response])
*/
Session.prototype._request = function (config, callback) { 
	var 
	me = this,
	r;
	config = config || {};
	this._keepAlive.stop();
	
	this.once('_request', callback); // because once only
	
	// ssl or not?
	r = this.ssl ? https.request(config): http.request(config);
	
	r.on('response', function(response) {
			// Only headers are set in this callback
			me.log('HTTP response version: %s', response.httpVersion);
			me.log('HTTP response status: %d %s', 
				response.statusCode,
				http.STATUS_CODES[response.statusCode]);
			me.log('HTTP response headers:', response.headers);		
			
			var 
			parser, // 'text/xml' > Parser creation, not executed now.
			data; // 'other type mime
			
			if (response.headers['content-type'].indexOf('text/xml') !== -1) {
				// upload cleanup (on upload response)
				// rSteam > stream we read and upload
				if (me.fileTransfer &&  me.fileTransfer.rStream) {
					delete me.fileTransfer.rStream;
					delete me.fileTransfer;
				}
				
				// Standart command response
				// Codec, NETASQ UTM speek UTF-8
				response.setEncoding('utf8');
				parser = xml2jsparser.create({
						verbose: me.verbose
				});
				parser.onerror = function (e) {
					// an error happened.
					me.log('parser.onerror (Session._request) e:', e.message);
					me.emit('_request', e);
				};
				
				// parser 'ondone' event
				parser.ondone = function (data) {
					var sessionDataResponse = sdr.create({
							verbose: me.verbose,
							data: data
					}); 

					// File upload or download
					if (!sessionDataResponse.dataFollow() && !sessionDataResponse.waitingForData()) {
						me._keepAlive.restart();
					}
					
					// 'disconnected' event
					if (me._authenticated && sessionDataResponse.data.nws && sessionDataResponse.data.nws.code) {
						switch (parseInt(sessionDataResponse.data.nws.code, 10)) {
						case sdr.NWS_ERROR_CODE.OK: 
							if(!sessionDataResponse.data.nws.serverd) {
								break;
							}
							switch(parseInt(sessionDataResponse.data.nws.serverd.ret, 10)) {
							case sdr.SERVERD.OK_DISCONNECTED:
							case sdr.SERVERD.KO_TIMEOUT_DISCONNECTED:
								me._setSessionDisconnected();
								break;
							}
							break;
							
						case sdr.NWS_ERROR_CODE.INVALID_SESSION:
						case sdr.NWS_ERROR_CODE.SERVERD_DISCONNECTED:
							me._setSessionDisconnected();
							break;
						}
					}					
					me.emit('_request', undefined, sessionDataResponse);
				};
				
			} else if (response.headers['content-type'].indexOf('application/force-download') !== -1) {
				// File download
				// me.fileTransfer.wStream has been assigned in downloadFileCommand() function
				response.setEncoding('binary');
				me.fileTransfer.wStream.on('close', function() {
						me.emit('_request');
						me._keepAlive.restart();
				});
				
				// Resume the read stream when the write stream gets hungry 
				me.fileTransfer.wStream.on('drain', function() {
						response.resume();
						me.log('File download: kernel buffer is ready (resume)');
				});
			} else { // no type-mime test (html?)
				// Standart command response
				// Codec, NETASQ UTM speek UTF-8
				response.setEncoding('utf8');
			}
			
			// TODO: manage other status code, if there is
			// Response management
			if (response.statusCode === 200) { // HTTP OK	
				me._readHttpHeaders(response);
			}
			
			response.on('data', function(chunk) {
					
					// text/xml type mime: standart command response
					if (parser) {
						me.log('HTTP response data (chunk): ', chunk);
						// TODO: write error (cf drain event)
						parser.write(str.xmlTrimRight(chunk), 'utf8');
						return;
					}  
					//  application/force-download type mime: File download
					if (me.fileTransfer && me.fileTransfer.wStream) {
						if (!me.fileTransfer.wStream.write(chunk, 'binary')) {
							me.log('File download: kernel buffer is full (paused)');
							response.pause();
						} else {
							me.log('HTTP response data (file download)[...]');
						}
						return;
					}
					// Other type mime
					data += chunk;
					me.log('HTTP response data (chunk): ', chunk);
			});
			
			response.on('end', function() {
					me.log('Response end');
					if (parser) {
						parser.close();
						return;
					}
					if (me.fileTransfer && me.fileTransfer.wStream) {// download
						me.fileTransfer.wStream.end();
						delete me.fileTransfer.wStream;
						delete me.fileTransfer;
						return;
					}
					// others type mime
					var sessionDataResponse = sdr.create({
							verbose: me.verbose,
							data: data
					}); 
					me.emit('_request', undefined, sessionDataResponse);
					me._keepAlive.restart();
			});
			
			response.on('close', function() {
					// This should not occured, cf nodejs doc.
					me.log('Connection closed');
					me.emit('_request', me._createError({
							code: 'ECONNCLOSED',
							message: 'Connection closed'
					}));
			});	
	});
	
	// Socket error event
	r.on('error', function(e) {
			me.log("NetasqRequest r.on error", e);
			me.emit('_request', e);
			me._keepAlive.restart();
	});
	
	// Socket continue event
	r.on('continue', function() {
			me.log("NetasqRequest r.on 'continue' (TODO?)");
	});
	
	
	// HTTP method
	switch(config.method)
	{
	case 'POST':
		
		if (me.fileTransfer && me.fileTransfer.rStream) {
			// File upload
			me.log(me.fileTransfer.beginData);
			r.write(me.fileTransfer.beginData, 'binary');
			
			me.fileTransfer.rStream.on('end', function(){
					me.log('me.fileTransfer.rStream.on end');
					me.log(me.fileTransfer.endData);
					
					r.end(me.fileTransfer.endData, 'binary');
			});
			me.fileTransfer.rStream.pipe(r, { 
					end: false 
			});
			me.fileTransfer.rStream.resume();
		} else {
			if (!config.postData) {
				return me.emit('_request', me._createError({
						code: 'EPOSTDATA',
						message: 'config.postData property is missing'
				}));
			}
			
			r.end(config.postData, 'utf8'); 
		}
		break;
		
	case 'GET':
		r.end(); 
		break;
		
	default:
		me.log("NetasqRequest unmanaged request method: %s',", config.method);
	}
};


/**
* @public
* @method
* Connect to NETASQ appliance
* @param [{function} callback({Error} err = undefined)], optionnal, use a callback or 'connect' event
* @see 'connect' event
*/
Session.prototype.connect = function(cb) {
	//debugger;
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
	if (cb) {
		this.once('exec', cb);
	}
	
	if (!this._authenticated) {
		return this.emit('exec', this._createError({
				code: 'ENOAUTH',
				message: 'Not authenticated (exec)'
		}));
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
	
	this._request(options, function (err, sessionDataResponse){
			me.emit('exec', err, sessionDataResponse);
	});
};



/**
* @public
* Use to download a file (Ex: backup)
* This must be called after a command result followed by data
* Only one file can be dl at time
* @params {object} wStream: Writable Stream
* @params {string} fileName, default to 'defaultFileName.txt'
* @param [{function} cb({Error} err = undefined, {object}data)], optionnal, use a callback or 'downloaded' event
* @throw ENOAUTH, Not authenticated
* @throw EBUSY, Busy (File transfer pending)
* @throw EWSTREAM, 'wStream is not writable'
* @see dataFollow
*/
Session.prototype.download = function(wStream, fileName, cb){	
	fileName = fileName || "defaultFileName.txt";
	this.log('downloadfileCommand wStream: ', wStream);
	this.log('downloadfileCommand fileName: ', fileName);
	
	if (cb) {
		this.once('download', cb);
	}
	
	if (!this._authenticated) {
		return this.emit('download', this._createError({
				code: 'ENOAUTH',
				message: 'Not authenticated (download)'
		}));
	}
	if (this.hasOwnProperty('fileTransfer')) {
		return this.emit('download', this._createError({
				code: 'EBUSY',
				message: 'Busy (File transfer pending)'
		}));
	}
	if(!wStream.writable) {
		return this.emit('download', this._createError({
				code: 'EWSTREAM',
				message: 'wStream is not writable'
		}));
	}
	
	this.fileTransfer = {
		wStream: wStream
	};
	
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
	
	this._request(options, function (err, sessionDataResponse){
			me.emit('download', err, sessionDataResponse);
	});
};


/**
* @public
* @params {string} fileName
* @param [{function} cb({Error} err = undefined, {Object} data)], optionnal, use a callback or 'uploaded' event
*/
Session.prototype.upload = function(fileName, cb){
	var 
	me = this;
	fileName = fileName || '';
	this.log('uploadFileCommand fileName: ', fileName);
	
	if (cb) {
		this.once('upload', cb);
	}
	if (!this._authenticated) {
		return this.emit('upload', this._createError({
				code: 'ENOAUTH',
				message: 'Not authenticated (upload)'
		}));
	}
	if (this.hasOwnProperty('fileTransfer')) {
		return this.emit('upload', this._createError({
				code: 'EBUSY',
				message: 'Busy (File transfer pending)'
		}));
	}

	
	fs.stat(fileName, function(err, stats) {
			if (err) { // no erro, "something" exists
				me.log('%s not found!', fileName);
				return me.emit('upload', err);	
			}
			
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
						me.emit('upload', exception);
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
				Copyright © 2011 by Sebastien Dolard (sdolard@gmail.com)  
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
				
				me._request(options, function (err, sessionDataResponse){
						me.emit('upload', err, sessionDataResponse);
				});
			}
	});
};



/**
* @private
*/
Session.prototype._setSessionDisconnected = function (){
	this._logout();
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
    var error;
    if (exception instanceof Error) {
        error = exception;
    } else {
        error = new Error(exception.message);
        Error.captureStackTrace(error, Session.prototype._eexception); // we do not trace this function
        error.code = exception.code;
    }
    
    this.emit('error', error);
    this.log(error.stack);
};

/**
* @private
* create Error
* @param {String} config.message
* @param {String} config.code
*/
Session.prototype._createError = function(config) {
	var error = new Error(config.message);
	Error.captureStackTrace(error, Session.prototype._createError); // we do not trace this function
	error.code = config.code;
	return error;
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
* @param {Function} cb([{Error} err])
*/
Session.prototype._authenticate = function (cb) {
	var 
	me = this,
	loginBuffer,
	pwdBuffer,
	options;
	
	if (cb) {
		this.once('connect', cb);
	}

	if (this._authenticated) {
		return this.emit('connect', this._createError({
				code: 'EALREADYAUTH',
				message: 'Already authenticated'
		}));	
	}
	this.log('session: ', util.inspect(this));
	
	loginBuffer = new Buffer(this.login);
	pwdBuffer = new Buffer(this.pwd);
	options = {
		host: this.host,
		path: util.format('/auth/admin.html?app=%s&uid=%s&pswd=%s',
			this.appName, 
			loginBuffer.toString('base64'),
			pwdBuffer.toString('base64')), 
		method: 'GET',
		port:  this.port,
		headers: {
			Connection: 'Keep-Alive'
		} 
	};
	
	this._request(options, function (err, sessionDataResponse){
			if(err) {
				return me.emit('connect', err);
			}
			
			var msg = '';
			if(sessionDataResponse.getValue('nws.value') === 'ok') {
				me._authenticated = true;
				me.log('Authenticated!');
				me._login(cb);
				return;
			} 
			
			// Error
			try {
				return me.emit('connect', me._createError({
						code: "EAUTH", 
						message: 'Authentication failed: ' + sessionDataResponse.getValue('nws.msg')
				}));
			} catch(e) {
				if (e.code === 'EUNDEFPROP') {
					return me.emit('connect', me._createError({
							code: "EAUTH", 
							message: 'Authentication failed (invalid login or password)!'
					}));
				} 
				// Other cases
				me.emit('connect', e);
			}
	});
};

/**
* Login
* @method 
* @private
*/
Session.prototype._login = function() {
	if (!this._authenticated) {
		return this.emit('connect', this._createError({
				code: 'ENOAUTH',
				message: 'Not authenticated (_login)'
		}));
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
	this._request(options, function (err, sessionDataResponse){
			if (err) {
				me.log('Login failed.');
				return me.emit('connect', err);
			}
			
			var nwsCode = parseInt(sessionDataResponse.getValue('nws.code'), 10);
			switch (nwsCode) {
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
				me.emit('connect', undefined, me);
				break;
				
			case sdr.NWS_ERROR_CODE.TOO_MANY_USER_AUTHENTICATED: 
				me.log('Login failed.');
				me.emit('connect', me._createError({
						code: 'ETOOMANYUSER', 
						message: 'Too many user authenticated'
				}));
				break;
				
			default: 
				me.emit('connect', me._createError({
						message: 'Unexpected nws.code: ' + nwsCode,
						code: 'EUNEXPECTEDNWSCODE'
				}));
			}
	});
};

/**
* Logout
* @method 
* @private
*/
Session.prototype._logout = function() {	
	debugger;
	this._keepAlive.stop();
	if (!this._authenticated) {
		return this.emit('disconnected', this._createError({
				code: 'ENOAUTH',
				message: 'Not authenticated (_logout)'
		}));
	}
	
	var
	me = this,
	postData = '',
	options = {
		host: this.host,
		port:  this.port,
		path: '/api/auth/logout',
		method: 'POST',
		headers: {
			Cookie: this._cookiesToHeaderString(),
			Connection: 'close'
		}, 
		postData: 'sessionid=' + this.id
	};                                                   
	options.headers['Content-Length'] = options.postData.length;
	
	this.log('Logout...');
	this._request(options, function (err, sessionDataResponse){
			debugger;
			this._authenticated = false;
			if (err) {
				me.log('Logout failed');
				return me.emit('disconnected', err);
			}
			
			var nwsCode = parseInt(sessionDataResponse.getValue('nws.code'), 10);
			switch (nwsCode) {
			case sdr.NWS_ERROR_CODE.OK:
				me.log('Logout succeed');
				me.emit('disconnected', undefined, me);
				break;
			
			case sdr.NWS_ERROR_CODE.INVALID_SESSION:
				me.log('Session invalid');
				me.emit('disconnected', undefined, me);
				break;
				
			case sdr.NWS_ERROR_CODE.SERVERD_DISCONNECTED:
				me.log('Serverd disconnected');
				me.emit('disconnected', undefined, me);
				break;		
				
			default: 
				me.log('Logout failed');
				me.emit('disconnected', me._createError({
						message: 'Unexpected nws.code: ' + nwsCode,
						code: 'EUNEXPECTEDNWSCODE'
				}));
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

/**
* @public
* Use to download a backup file
* Only one file can be dl at time
* @params {string} fileName
* @params {string} what default to 'all'
* @param {function} cb({Error} err = undefined, {Object} response)
*/
Session.prototype.downloadBackup = function(fileName, what, cb){
	what = what || 'all';
	this.once('backup', cb);
	
	if (!this._authenticated) {
		return this.emit('backup', this._createError({
				code: 'ENOAUTH',
				message: 'Not authenticated (downloadBackup)'
		}));
	}
	
	var 
	me = this,
	cmd = util.format('config backup list=%s', what);
	
	this.exec(cmd, function(err, response){
			
			if (err) {
				return me.emit('backup',err, response);
			}
			
			var
			exception,
			fileSize,
			fileCRC,
			nwsCode = parseInt(response.getValue('nws.code'),10),
			serverdRet = nwsCode === sdr.NWS_ERROR_CODE.OK ? parseInt(response.getValue('nws.serverd.ret'),10): -1;
			
			if (serverdRet === sdr.SERVERD.OK_MULTI_LINES && 
				response.dataFollow())
			{
				fileSize = response.getValue('nws.serverd.data.size');
				fileCRC = response.getValue('nws.serverd.data.crc');
				
				// We delete file if already exists
				fs.stat(fileName, function(err, stats) {
						if (!err) { // no erro, "something" exists
							//if (stats.isFile()) {
							me.log('%s already exists. Deleting...', fileName);
							fs.unlink(fileName, function(exception){
									//console.log('in fs.unlink', exception);
									if (exception) {
										me.emit('backup', exception, response);
									} else {
										me._downloadToFile(fileName, fileSize, fileCRC, 'backup');
									}
							});
							//}
						} else if (err.code === 'ENOENT') {
							me._downloadToFile(fileName, fileSize, fileCRC, 'backup');
						} 
				});
			} else {
				console.log(response);
				me.emit('backup', me._createError({
						message: 'Backup failed. See response.',
						code: 'EDLFAILED'
				}), response);
			}	
	});
};

Session.prototype.isAuthenticated = function() {
	return this._authenticated;
};

/**
* @private
*/
Session.prototype._downloadToFile = function(fileName, size, crc, event) {
	var 
	me = this,
	fileWs = fs.createWriteStream(fileName, { 
			flags: 'w',
			encoding: 'binary',
			//mode: 0666 
			mode: 666
	});
	fileWs.on('error', function (exception) {
			me.log('fileWs error', exception);
			me.emit(event, exception);
	});
	me.log('Download pending...');
	this.download(fileWs, fileName, function(err, response){
			me.log('%s downloaded.', fileName);
			me.log('Checking file size...');
			
			fs.stat(fileName, function(err, stats) {
					var exception;
					if (!err) { // no erro, "something" exists
						if (stats.size !== parseInt(size, 10)) {
							me.emit(event, me._createError({
									message: util.format('File size is not valid: %do instead of %do!', stats.size, size),
									code: 'EINVALIDSIZE'
							}), size, crc);
						} else  {
							me.log('File size is valid.');
							me.emit(event, exception, size, crc);
						}
					} else {
						me.emit(event, me._createError({
								message: util.format('File %s not found!', fileName),
								code: 'EFILENOTFOUND'
						}), size, crc);
					}
			});
	});
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
