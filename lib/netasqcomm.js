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
zlib = require('zlib'),

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

	// Contructor params 
	/**
	* @property {string} login. Default to 'admin'
	*/
	this.appName = config.appName || 'netasqcomm';
	
	/**
	* @property {Number} timeout in second. Default to 120s'
	*/
	this.timeout = config.timeout || 120;
	
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
	this.setRequiredLevel(config.requiredLevel || SESSION_LEVELS);

	
	// Properties
	/**
	* @property {boolean} authentication state
	*/
	this._authenticated = false;
	
	/**
	* @property {string} session id. Requiered by API.
	*/
	this.apiSessionId = ''; // session id

	/**
	* @property {object} of cookie. Requiered by authentication.
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
				if (!this._authenticated) {
				this._keepAlive.stop();	
					return;
				}
				this.exec('nop');
			}.bind(this)
	});
	
	EventEmitter.call(this); 
};
util.inherits(Session, EventEmitter); // http://nodejs.org/docs/latest/api/util.html#util.inherits


/**
* @static
* @param {String}
* @returns {String} Session instance id. Not unique.
*/
Session.getId = function (session) {
	return util.format('%s-%s-%s-%s', 
		session.appName, 
		session.host, 
		session.port || 443, 
		session.login
	);
};

/**
* @returns {String} Session instance id. Not unique.
*/
Session.prototype.getId = function () {
	return Session.getId(this);
};


/**
*
* @param {Function} callback{{Error} err = undefined, [{SessionDataResponse} response])
*/
Session.prototype._request = function (config, callback) { 
	var 
	me = this,
	r,
	timeout = false;
	
	config = config || {};
	
	this._keepAlive.stop();
	
	this.once('_request', callback); // because once only
	
	this.log(util.inspect(config));
	
	// ssl or not?
	r = this.ssl ? https.request(config): http.request(config);
	
	r.setTimeout(this.timeout * 1000, function(){
			timeout = true;
			try {
				// Node  doc: http://nodejs.org/api/net.html#net_socket_settimeout_timeout_callback
				// When an idle timeout is triggered the socket will receive a 
				// 'timeout' event but the connection will not be severed. 
				// The user must manually end() or destroy() the socket.
				r.destroy();
			} catch (e) {
				me.log('!!!!!! request.destroy() throw an error!');
				me.log(util.inspect(config));
				me.log(e.stack);
			}
			me.emit('_request', me._createError({
					code: 'ETIMEOUT',
					message: 'Timeout'
			}));
	});
	
	r.on('response', function(response) {
			// Only headers are set in this callback
			me.log('HTTP response version: %s', response.httpVersion);
			me.log('HTTP response status: %d %s', 
				response.statusCode,
				http.STATUS_CODES[response.statusCode]);
			me.log('HTTP response headers:', response.headers);		
			
			var 
			parser, // 'text/xml' > Parser creation, not executed now.
			data, // 'other type mime
			responseStream;
			
			function onData(chunk) {
				// text/xml type mime: standart command response
				if (parser) {
					me.log('HTTP response data (chunk): ', chunk.toString());
					// TODO: write error (cf drain event)
					parser.write(str.xmlTrimRight(chunk.toString()), 'utf8');
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
			}
			
			function onEnd() {
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
				sessionDataResponse.on('error', function(err) {
					me.emit('error', err); // should emit error cos this could already occured during _request event "emition"
				});
				me.emit('_request', undefined, sessionDataResponse);
				me._keepAlive.restart();
			}
			
			function onClose() {
				// This should not occured, cf nodejs doc.
				me.log('Connection closed');
				me.emit('_request', me._createError({
						code: 'ECONNCLOSED',
						message: 'Connection closed'
				}));
			}
			
			switch (response.headers['content-encoding']) {
				// or, just use zlib.createUnzip() to handle both cases
			case 'gzip':
				responseStream = response.pipe(zlib.createGunzip());
				break;
			case 'deflate':
				responseStream = response.pipe(zlib.createInflateRaw());
				break;
			default:
				responseStream = response;
				break;
			}
			responseStream.on('data', onData);
			responseStream.on('end', onEnd);
			responseStream.on('close', onClose);
			
			
			if (response.headers['content-type'].indexOf('text/xml') !== -1) {
				// upload cleanup (on upload response)
				// rSteam > stream we read and upload
				if (me.fileTransfer &&  me.fileTransfer.rStream) {
					delete me.fileTransfer.rStream;
					delete me.fileTransfer;
				}
				
				// Standart command response
				// Codec, NETASQ UTM speek UTF-8
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
					sessionDataResponse.on('error', function(err) {
						me.emit('error', err); // should emit error cos this could already occured during _request event "emition"
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
						case sdr.NWS_ERROR_CODE.EXPIRED_SESSION:
						case sdr.NWS_ERROR_CODE.AUTH_ERROR:
						case sdr.NWS_ERROR_CODE.SERVER_OVERLOADED:
						case sdr.NWS_ERROR_CODE.SERVER_UNREACHABLE:
						case sdr.NWS_ERROR_CODE.INTERNAL_ERROR:
							me._setSessionDisconnected();
							break;
							
						case sdr.NWS_ERROR_CODE.REQUEST_ERROR: 
						case sdr.NWS_ERROR_CODE.UNKNOWN_ACTION: 
						case sdr.NWS_ERROR_CODE.ACTION_ERROR: 
						case sdr.NWS_ERROR_CODE.DOWNLOAD_WAITING:
						case sdr.NWS_ERROR_CODE.WAITING_FOR_UPLOAD:
							break;
							
						default:
							me.log('Unknown NWS_ERROR_CODE: ' + sessionDataResponse.data.nws.code);
							return me.emit('_request', me._createError({
									code: 'EUNEXPECTEDNWSERRORCODE',
									message: 'Unexcpected NWS_ERROR_CODE: ' + sessionDataResponse.data.nws.code
							}));
						}
					}					
					me.emit('_request', undefined, sessionDataResponse);
				};
				
			} else if (response.headers['content-type'].indexOf('application/force-download') !== -1) {
				// File download
				// me.fileTransfer.wStream has been assigned in downloadFileCommand() function
				me.fileTransfer.wStream.on('close', function() {
						me.emit('_request');
						me._keepAlive.restart();
				});
				
				// Resume the read stream when the write stream gets hungry 
				me.fileTransfer.wStream.on('drain', function() {
						response.resume();
						me.log('File download: kernel buffer is ready (resume)');
				});
			}
			
			// TODO: manage other status code, if there is
			// Response management
			if (response.statusCode === 200) { // HTTP OK	
				me._readHttpHeaders(response);
			}	
	});
	
	// Socket error event
	r.on('error', function(e) {
			me.log("NetasqRequest r.on error", e);
			
			// Ensures that no more I/O activity happens on this socket. 
			// Only necessary in case of errors (parse error or so).
			r.destroy();
			
			if (!timeout) {
				me._keepAlive.restart();
				return me.emit('_request', e);
			}
			
			// Timeout > we do not forward ECONNRESET error
			if (e.code !== 'ECONNRESET'){
				me.emit('_request', e);
			}
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
		if (this.listeners('exec').length !== 0) {
			return this.emit('error', this._createError({
					code: 'EEXECERROR',
					message: 'Exec do not support command queue (exec)'
			}));
		}

		this.once('exec', cb);
	}
	
	if (!this._authenticated) {
		return this.emit('exec', this._createError({
				code: 'ENOAUTH',
				message: 'Not authenticated (exec)'
		}));
	}
	
	var
	me = this,
	options = {
		host: this.host,
		port:  this.port,
		path: '/api/command',
		method: 'POST',
		headers: {
			Cookie: this._cookiesToHeaderString(),
			Connection: 'Keep-Alive',
			'Accept-Encoding': 'gzip, deflate'
		}, 
		postData: ''
	};      
	
	this.log('runCommand: %s', cmd);
	options.postData = 'sessionid=' + this.apiSessionId;
	options.postData += '&cmd='+ cmd;
	options.postData += '&id='+ cmd;
	options.headers['Content-Length'] = options.postData.length;
	
	this._request(options, function (err, sessionDataResponse){
			me.lastCliCmd = cmd;
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
		path: '/api/download/' + fileName + '?sessionid=' + this.apiSessionId, // OK
		method: 'GET',
		headers: {
			Cookie: this._cookiesToHeaderString(),
			Connection: 'Keep-Alive',
			'Accept-Encoding': 'gzip, deflate'
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
					path: '/api/upload?sessionid=' + me.apiSessionId, // OK
					method: 'POST',
					port:  me.port,
					headers: { 
						'Content-Type': 'multipart/form-data; boundary=' + boundary,
						'Content-Length' : me.fileTransfer.beginData.length + stats.size + me.fileTransfer.endData.length, 
						Cookie: me._cookiesToHeaderString(),
						Connection: 'Keep-Alive',
						'Accept-Encoding': 'gzip, deflate'
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
			Connection: 'Keep-Alive',
			'Accept-Encoding': 'gzip, deflate'
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
			Connection: 'Keep-Alive', 
			'Accept-Encoding': 'gzip, deflate'			
		}, 
		postData: ''
	};                                                   
	
	options.postData += 'app=' + this.appName;
	options.postData += '&reqlevel=' + this.requiredLevel;
	options.postData += '&id=login';
	options.headers['Content-Length'] = options.postData.length;
	
	this.log('Required level: %s\nLogin...', this.requiredLevel);
	this._request(options, this._loginRequestResponse.bind(this));
};

/**
* Login
* @method 
* @private
*/
Session.prototype._loginRequestResponse = function (err, sessionDataResponse){
	if (err) {
		this.log('Login failed.');
		return this.emit('connect', err);
	}
	
	var nwsCode = parseInt(sessionDataResponse.getValue('nws.code'), 10);
	if  (nwsCode === sdr.NWS_ERROR_CODE.OK) {
		this.apiSessionId = sessionDataResponse.getValue('nws.sessionid');
		this.sessionLevel = sessionDataResponse.getValue('nws.sessionlevel');
		this.fw.serial = sessionDataResponse.getValue('nws.serial');
		this.fw.protocol = sessionDataResponse.getValue('nws.protocol');
		this.fw.command = sessionDataResponse.getValue('nws.command');
		if(sessionDataResponse.data.nws.need_reboot) {
			this.fw.needReboot = sessionDataResponse.getValue('nws.need_reboot') === '1';
		}
		this.log('Logged in.\nSession level: %s', this.sessionLevel);
		this.emit('connect', undefined, this);
	} else {
		this.log('Login failed.');
		if (sdr.NWS_ERROR_CODE_MSG.hasOwnProperty(nwsCode)) {
			return this.emit('connect', this._createError({
					code: 'ELOGINFAILED', 
					thisssage: util.format('%s (%d)', sdr.NWS_ERROR_CODE_MSG[nwsCode], nwsCode)
			}));
		}
		
		this.emit('connect', this._createError({
				message: 'Unexpected nws.code: ' + nwsCode,
				code: 'EUNEXPECTEDNWSERRORCODE'
		}));
	}
};

/**
* Logout
* @method 
* @private
*/
Session.prototype._logout = function() {	
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
			Connection: 'close',
			'Accept-Encoding': 'gzip, deflate'
		}, 
		postData: 'sessionid=' + this.apiSessionId
	};                                                   
	options.headers['Content-Length'] = options.postData.length;
	
	this.log('Logout...');
	this._request(options, this._logoutRequestResponse.bind(this));
};

/*
* @private
*/
Session.prototype._logoutRequestResponse = function (err, sessionDataResponse){
	this._authenticated = false;
	if (err) {
		this.log('Logout failed');
		return this.emit('disconnected', err);
	}
	
	var nwsCode = parseInt(sessionDataResponse.getValue('nws.code'), 10);
	switch (nwsCode) {
	case sdr.NWS_ERROR_CODE.OK:
		this.log('Logout succeed');
		this.emit('disconnected', undefined, this);
		break;
		
	case sdr.NWS_ERROR_CODE.INVALID_SESSION:
		this.log('Session invalid');
		this.emit('disconnected', undefined, this);
		break;
		
	case sdr.NWS_ERROR_CODE.SERVERD_DISCONNECTED:
		this.log('Serverd disconnected');
		this.emit('disconnected', undefined, this);
		break;		
		
	default:
		this.log('Logout failed.');
		if (sdr.NWS_ERROR_CODE_MSG.hasOwnProperty(nwsCode)) {
			return this.emit('disconnected', this._createError({
					code: 'ELOGOUTFAILED', 
					message: util.format('%s (%d)', sdr.NWS_ERROR_CODE_MSG[nwsCode], nwsCode)
			}));
		}
		
		this.emit('disconnected', this._createError({
				message: 'Unexpected nws.code: ' + nwsCode,
				code: 'EUNEXPECTEDNWSERRORCODE'
		}));
	}
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
	cmd = util.format('config backup list=%s', what);
	
	this.exec(cmd, this._onDownloadBackupResponse.bind(this, fileName));
};


Session.prototype._onDownloadBackupResponse = function(fileName, err, response){
	if (err) {
		return this.emit('backup',err, response);
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
					this.log('%s already exists. Deleting...', fileName);
					fs.unlink(fileName, function(exception){
							//console.log('in fs.unlink', exception);
							if (exception) {
								this.emit('backup', exception, response);
							} else {
								this._downloadToFile(fileName, fileSize, fileCRC, 'backup');
							}
					}.bind(this));
				} else if (err.code === 'ENOENT') {
					this._downloadToFile(fileName, fileSize, fileCRC, 'backup');
				} 
		}.bind(this));
	} else {
		console.log(response);
		this.emit('backup', this._createError({
				message: 'Backup failed. See response.',
				code: 'EDLFAILED'
		}), response);
	}	
};

/**
* @returns {Boolean} authenticated state.
*/
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
			mode: '0644'
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

/**
* @param {String|Array} level
*/
Session.prototype.setRequiredLevel = function (level) {
	var 
	levelArray,
	i = 0;
	
	if (level instanceof Array) {
		levelArray = level;
	} else if(typeof level === 'string') {
		levelArray = level.split(',');
	} else {
		throw new Error('invalid type');
	}
	
	if (levelArray.length === 0) {
		this.requiredLevel = SESSION_LEVELS.join(',');
	} else {
		for(i = 0; i < levelArray.length; i++){
			if (SESSION_LEVELS.indexOf(levelArray[i]) === -1) {
				throw new Error('invalid level: ' +  levelArray[i]);
			}
		}
		this.requiredLevel = levelArray.join(',');
	}
};


/*******************************************************************************
* Exports
*******************************************************************************/
exports.createSession = function (config) {
	return new Session(config);
};

exports.getId = function (config) {
	return Session.getId(config);
};

exports.SESSION_LEVELS = SESSION_LEVELS;
exports.SERVERD = sdr.SERVERD;
exports.NWS_ERROR_CODE = sdr.NWS_ERROR_CODE;
