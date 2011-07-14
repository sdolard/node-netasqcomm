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
*
*/
exports.createSession = function() {
  return new Session();
};

