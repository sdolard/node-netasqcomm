/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
/**
* Require: node
* @private
*/
util = require('util'),
EventEmitter = require('events').EventEmitter,
vm = require('vm'),

/**
* @private
*/
StrStream = function() {
	this.text = '';
},

/**
* @public
* TODO: emit error event?
*/
SessionDataResponse = function(config) {
	config = config || {};
	
	/**
	* @property {boolean} Set to true to enable log() method
	* @public
	* @see log()
	*/
	this.verbose =	config.verbose || false; 
	
	
	/** 
	* @public
	* @propery {object} data
	*/
	this.data = config.data;
	
	
	this.log('New SessionDataResponse > data: ', util.inspect(this.data, false, 100));
	
	EventEmitter.call(this); 
};
util.inherits(SessionDataResponse, EventEmitter); // http://nodejs.org/docs/latest/api/util.html#util.inherits


/** 
* Log only if verbose is positive
* @public
* @method
*/
SessionDataResponse.prototype.log = function() {
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
SessionDataResponse.prototype._eexception = function(exception) {
    var error;
    if (exception instanceof Error) {
        error = exception;
    } else {
        error = new Error(exception.message);
        Error.captureStackTrace(error, SessionDataResponse.prototype._eexception); // we do not trace this function
        error.code = exception.code;
    }
    
    this.emit('error', error);
    this.log(error.stack);
};


/**
* @public
* @returns obj reference value related to data ojbect properties
* @throw error if property does not exists
* @example
*	foo: {
*		bar: 'value'
*	}
*	getValue('foo.bar') returns 'value'
*	getValue('help') throw an error
* @see test/get-object-value.js
*/
SessionDataResponse.prototype.getValue = function(str) {
	if (this.data === undefined) { 
		this._eexception({
				code: 'ENODATA',
				message: 'data property is undefined'
		});
		return;
	}
	
	str = str || '';
	
	if (str.length === 0) {
		return this.data;
	}
	
	var 
	prop = str.split('.'),
	objRef = this.data,
	i, stackLevel = 0;
	
	for (i in prop) {
		if (objRef.hasOwnProperty(prop[i])) {
			objRef = objRef[prop[i]];
			stackLevel++;
		} else {
			this._eexception({
					code: 'EUNDEFPROP',
					message: '"' + prop[i] + '" property is not defined in "' + util.inspect(this.data, false, stackLevel) + '"'
			});
			return;
		}
	}
	return objRef;
};


/**
* @public
* @returns {boolean} true if a file is ready to be downloaded
* @exemple see bin/nncli.js
* TODO: attach to a responseObject
*/
SessionDataResponse.prototype.dataFollow = function() {
	if (!this.data.nws || !this.data.nws.serverd) {
		return false;
	}
	
	if (this.data.nws.serverd instanceof Array) {
		return false;
	}
	
	if (parseInt(this.data.nws.serverd.ret, 10) !== SessionDataResponse.SERVERD.OK_MULTI_LINES) {
		return false;
	}
	// TODO: what means 00a01c?
	if (this.data.nws.serverd.code.substr(0, 6) !== '00a01c') { 
		return false;
	}
	return true;
};

/**
* @public
* @returns {boolean} true if firewall is waiting for data (file) upload
* TODO: attach to a responseObject
*/
SessionDataResponse.prototype.waitingForData = function() {
	if (!this.data.nws || !this.data.nws.serverd) {
		return false;
	}
	
	if (this.data.nws.serverd instanceof Array) {
		return false;
	}
	
	if (parseInt(this.data.nws.serverd.ret, 10) !== SessionDataResponse.SERVERD.OK_SERVER_WAITING_MULTI_LINES) {
		return false;
	}
	
	// TODO: what means 00a003?
	if (this.data.nws.serverd.code.substr(0, 6) !== '00a003') {
		return false;
	}
	return true;
};





/**
* Dump to writable stream serverd object as a human readable format (ini style),
* function of serverd format
* @public 
* @param {object} serverd: part of returned data
* @param [{object}] ws: Writable Stream. Optionnal. Default to process.stdout
* @see Session.exec
* @see test/session_data_response-*_format.js
* @example
* session.exec('help', function(data){
*		netasqComm.dumpServerdData(); // This will dump data to stdout
* })
*/
SessionDataResponse.prototype.dumpServerdData = function(ws, mode) {
	if (!this.data || !this.data.nws || !this.data.nws.serverd) {
		return;
	}
	ws = ws || process.stdout;
	mode = mode || 'ini';
	if (mode !== 'ini' && mode !== 'json'){
		return this._eexception({
				code: 'EINVALIDMODE',
				message: 'mode param can only be "ini" (default) or "json"'
		});
	}
	var i;
	
	if (this.data.nws.serverd instanceof Array) {
		for (i = 0; i < this.data.nws.serverd.length; i++) {
			SessionDataResponse._dumpServerdItemErrorCode(this.data.nws.serverd[i], ws, mode);
		}
	} else {
		SessionDataResponse._dumpServerdItemErrorCode(this.data.nws.serverd, ws, mode);
	}
};


/**
* @private
* @static
*/
SessionDataResponse._dumpServerdItemErrorCode = function(s, ws, mode) {
	ws = ws || process.stdout;
	mode = mode || 'ini';
	
	switch(parseInt(s.ret, 10)) {
		// waiting for data
	case SessionDataResponse.SERVERD.OK_SERVER_WAITING_MULTI_LINES: // Success: serverd is waiting for data
		if (mode === 'ini') {
			ws.write('code="' + s.code + '" msg="' + s.msg + '"\n');
		}
		break;
		
		// Disconnected
	case SessionDataResponse.SERVERD.OK_DISCONNECTED: // Success: Session is closed
	case SessionDataResponse.SERVERD.KO_AUTH: // Authentication failed
	case SessionDataResponse.SERVERD.KO_TIMEOUT_DISCONNECTED: // Failure: timout disonnected (no activity)
	case SessionDataResponse.SERVERD.KO_MAXIMUM_ADMIN_REACH: // Failure: maximum administrator are connected to appliance
		if (mode === 'ini') {
			ws.write('code="' + s.code + '" msg="' + s.msg + '"\n');
		}
		break;
		
		// Multiple lines
	case SessionDataResponse.SERVERD.OK_MULTI_LINES: // Success multiple lines (+file download)
	case SessionDataResponse.SERVERD.WARNING_OK_MULTI_LINE: // Success multiple lines but multiple warning
	case SessionDataResponse.SERVERD.KO_MULTI_LINES:// Failure multiple line 
		if (mode === 'ini') {
			ws.write('code="' + s.code + '" msg="' + s.msg + '"\n');
		}
		SessionDataResponse._dumpServerdDataObject(s.data, ws, mode);
		break;
		
		// One line
	case SessionDataResponse.SERVERD.OK: // Success one line
	case SessionDataResponse.SERVERD.OK_SERVER_NEED_REBOOT: // Success but appliance should be restarted (in order to apply modifications) 
	case SessionDataResponse.SERVERD.WARNING_OK: // Success one line but one warning 
	case SessionDataResponse.SERVERD.KO: // Failure one line
	case SessionDataResponse.SERVERD.KO_LEVEL: // Administator do not have enought level to run specified command
	case SessionDataResponse.SERVERD.KO_LICENCE: // Appliance do not have licence option to run specified command
		if (mode === 'ini') {
			ws.write('code="' + s.code + '" msg="' + s.msg + '"\n');
		}
		break;
		
		// Others
	default:
		ws.write('_dumpServerdItemErrorCode default: ', util.inspect(s, false, 100));
	}
};


/**
* @private
* @static
* @param {object} ws Writable Stream, default to process.stdout
*/
// TODO: ws.write error (cf drain event)
// TODO: review this code
SessionDataResponse._dumpServerdDataObject = function(data, ws, mode) {
	ws = ws || process.stdout;
	mode = mode || 'ini';
	var i, j, e;
	
	switch(data.format) {
	case "section": //system property
		if (!data.section) {
			break;
		}
		
		if (data.section instanceof Array) {
			for (i in data.section) {
				if (data.section.hasOwnProperty(i)) {
					if (data.section[i].key === undefined) { // section without any key?
						continue;
					}
					SessionDataResponse._dumpServerdDataSectionObject(data.section[i], ws, mode);
					if (i < data.section.length - 1) { 
						if (mode === 'ini') {
							ws.write(' \n');
						} else {
							ws.write(',\n');
						}
					}
				}
			}
		} else {
			SessionDataResponse._dumpServerdDataSectionObject(data.section, ws, mode);
		}
		break;
		
	case "section_line": //monitor pvm host || log download name=alarm first="2010-01-01 00:00:00" last="2011-12-01 00:00:00"
		//log download name=alarm first="2010-09-03 14:30:00" last="2010-09-03 16:00:00"
	case "list": // config filter explicit type=filter useclone=1  index=9
		if (!data.section) {
			break;
		}
		
		if (data.section instanceof Array) {
			for (i = 0; i < data.section.length; i++) {
				SessionDataResponse._dumpSection(data.format, data.section[i], ws, mode);
				if (mode === 'json' && i <  data.section.length - 1) {
					ws.write(',');
				}	
			}
		} else {
			SessionDataResponse._dumpSection(data.format, data.section, ws, mode);
		}
		
		break;
		
	case "raw": // cdata or file dl, ex= help
		if (data.cdata) {
			if (mode === 'ini') {
				ws.write(data.cdata + '\n');
			} else {
				ws.rawData = data.cdata;
				//ws.write('"data": "' + data.cdata + '"');
				/*e = new Error('"raw" format is not support with json mode');
				e.code = 'ENOTSUPPORTEDFORMAT';
				throw e;*/
			}
			break;
		}
		if (data.crc && data.size) { 
			if (mode === 'ini') {
				ws.write('File is ready to be downloaded\ncrc: ' + data.crc + ', size: ' + data.size + '\n');
			} else {
				ws.crc = data.crc;
				ws.size = data.size;
			}
			return;
		}

		if (mode === 'ini') {
			ws.write('_dumpServerdDataObject: unsupported raw data\n');
			ws.write(util.inspect(data, false, 100) + '\n');
		}
		break;
		
	case "xml": // config filter explicit type=filter useclone=1 output=xml index=9
		ws.write('XML format. Render is done as javascript.\n');
		ws.write(util.inspect(data, false, 100) + '\n');
		break;
		
	default:
		ws.write('Unmanaged format: ' + data.format + '\n');
		ws.write(util.inspect(data, false, 100) + '\n');		
	}
};


/**
* @private
* @static
* @param {object} ws Writable Stream, default to process.stdout
*/
SessionDataResponse._dumpServerdDataSectionObject = function(section, ws, mode) {
	ws = ws || process.stdout;
	mode = mode || 'ini';
	if (section.title) {
		if (mode === 'ini') {	
			ws.write('[' + section.title + ']\n');
		} else {
			ws.write(section.title + ': {');
		}
	}
	
	if (section.key instanceof Array) {
		var i;
		for (i = 0; i < section.key.length; i++) {
			if (mode === 'ini') { 
				ws.write(section.key[i].name + '=' + section.key[i].value + '\n');
			} else {
				ws.write(section.key[i].name + ': "' + section.key[i].value + '"\n');
				if (i < section.key.length - 1) {
					ws.write(',');
				}
			}
		}
	} else {
		if (mode === 'ini') { 
			ws.write(section.key.name + '=' + section.key.value + '\n');
		} else {
			ws.write(section.key.name + ': "'+ section.key.value + '"\n');
		}
	}
	if (mode === 'json') {
		ws.write('}\n');
	}
};


/**
* @private
* @static
*/
SessionDataResponse._dumpSection = function(dataFormat, section, ws, mode) {
	ws = ws || process.stdout;
	mode = mode || 'ini';
	var i;
	if (section.title) {
		if (mode === 'ini') {
			ws.write('['+ section.title + ']\n');
		} else {
			ws.write(section.title + ': [\n');
		}
	}
	if (mode === 'json' && dataFormat === 'section_line') {
		ws.write('{\n');
	}
	if (section.line instanceof Array) {
		for (i = 0; i < section.line.length; i++) { 
			SessionDataResponse._dumpSectionLine(section.line[i], ws, mode);
			if (mode === 'json'  && i < section.line.length - 1) {
				if (dataFormat === 'section_line') {
					ws.write('\n},{\n');
				} else {
					ws.write('\n,\n');
				}
			}
		}
	} else {
		SessionDataResponse._dumpSectionLine(section.line, ws, mode);
	}
	if (mode === 'json') {
		if(dataFormat === 'section_line') {
			ws.write('}');
		}
		ws.write(']\n');
	}
};


/**
* @private
* @static
*/
SessionDataResponse._dumpSectionLine = function(sectionLine, ws, mode) {
	ws = ws || process.stdout;
	mode = mode || 'ini';
	var 
	line = '', i;
	if (sectionLine.hasOwnProperty('key')) {
		for (i in sectionLine.key) {
			if (sectionLine.key.hasOwnProperty(i)) {
				if (line.length !== 0) {
					if (mode === 'ini') {
						line += ' ';
					} else {
						line += ', ';
					}
				}
				if (mode === 'ini') {
					line += sectionLine.key[i].name + '=' + sectionLine.key[i].value;
				} else {
					line += sectionLine.key[i].name + ': "' + sectionLine.key[i].value + '"';
				}
			}
		}
	} else {
		line = sectionLine;
		if (mode === 'json') {
		line = '"' + line + '"';	
		}
	}
	ws.write(line);
	if (mode === 'ini') {
		ws.write('\n');
	}
};


/**
* @private
*/
StrStream.prototype.write = function(s) {
	this.text += s;
};



/**
* @public
*/
SessionDataResponse.prototype.serverdData = function() {
	if (this._serverdData) {
		return this._serverdData;
	}
	if (!this.data || !this.data.nws || !this.data.nws.serverd) {
		return undefined;
	}
	var 
	i, 
	result = new StrStream(), 
	sandbox = {
		result: undefined
	},
	rawData = {};
	if (this.data.nws.serverd instanceof Array) {
		for (i = 0; i < this.data.nws.serverd.length; i++) {
			SessionDataResponse._dumpServerdItemErrorCode(this.data.nws.serverd[i], result, 'json');
		}
	} else {
		SessionDataResponse._dumpServerdItemErrorCode(this.data.nws.serverd, result, 'json');
	}
	if (result.rawData) {
		rawData.rawData = result.rawData;
		if (result.crc !== undefined) {
			rawData.crc = result.crc;
		}
		if (result.size !== undefined) {
			rawData.size = result.size;
		}
		this._serverdData = rawData;
	} else {
		vm.runInNewContext('result = {' + result.text + '}', sandbox);
		this._serverdData = sandbox.result;
	}
	return this._serverdData;
};

/**
* Serverd protocole consts
* @public
* @consts
*/
SessionDataResponse.SERVERD = {
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
};


/**
* NWS protocol error code consts
* @public
* @consts
*/
SessionDataResponse.NWS_ERROR_CODE = {
	OK: 100,
	REQUEST_ERROR: 200,
	INVALID_SESSION: 203,
	TOO_MANY_USER_AUTHENTICATED: 500,
	SERVERD_DISCONNECTED: 502
};


/*******************************************************************************
* Exports
*******************************************************************************/
exports.create = function (config) {
	return new SessionDataResponse(config);
};
exports.SERVERD = SessionDataResponse.SERVERD;
exports.NWS_ERROR_CODE = SessionDataResponse.NWS_ERROR_CODE;

