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

var Session = function() {
	this.authenticated = false;
	this.id = ''; // session id
	this.cookies = {};
	this.login = '';
	this.pwd = '';
	this.host = '';
	this.lastCliCmd = '';
	this.fw = {};
};

/**
* @returns {string} Value to set in 'Set-Cookie' HTTP header
* @param {string} path, default to '/'
* @param {number} port, default to 80
*/
Session.prototype.cookieToHeaderString = function(path, port) {
	path = path || '/';
	port = port || 80;
	var r = '';
	// Adding cookies to request
	// TODO: add more intelligence > all cookies are served...
	for (p in this.cookies) {
		if (r.length !== 0) {
			r += '; ';
		}
		r += p;
		if (this.cookies[p].hasOwnProperty('value')) {
			r += "=" + this.cookies[p].value;
		}
	}
	return r;
};


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
* TODO
*/
exports.dumpServerdDataFormat = function (data) {
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
		
	case "list": // TODO: implement LIST format
		console.log('Unmanaged format: %s', data.format);
		console.log(util.inspect(data, false, 100));
		break;
	
	case "xml": // TODO: implement LIST format
		console.log('Unmanaged format: %s', data.format);
		console.log(util.inspect(data, false, 100));
		break;
		
	default:
		console.log('Unmanaged format: %s', data.format);
		console.log(util.inspect(data, false, 100));		
	}
};

/**
*
*/
exports.createSession = function() {
  return new Session();
};

/**
* Serverd protocole consts
*/
// OK
exports.SERVERD_OK = 100; // Success one line 
exports.SERVERD_OK_MULTI_LINES = 101; // Success multiple lines
exports.SERVERD_OK_SERVER_WAITING_MULTI_LINES = 102; // Success: serverd is waiting for data
exports.SERVERD_OK_DISCONNECTED = 103; // Success: Session is closed
exports.SERVERD_OK_SERVER_NEED_REBOOT = 104; // Success but appliance should be restarted (in order to apply modifications)
// WARNING
exports.SERVERD_WARNING_OK = 110; // Success one line but one warning 
exports.SERVERD_WARNING_OK_MULTI_LINE = 111;// Success multiple lines but multiple warning
// KO
exports.SERVERD_KO = 200; // Failure one line 
exports.SERVERD_KO_MULTI_LINES = 201; // Failure multiple line 
exports.SERVERD_KO_AUTH = 202; // Authentication failed
exports.SERVERD_KO_TIMEOUT_DISCONNECTED = 203; // Failure: timout disonnected (no activity)
exports.SERVERD_KO_MAXIMUM_ADMIN_REACH = 204; // Failure: maximum administrator are connected to appliance
exports.SERVERD_KO_LEVEL = 205; // Administator do not have enought level to run specified command
exports.SERVERD_KO_LICENCE = 206;// Appliance do not have licence option to run specified command

