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

/**
* @params {object} config
* @params {function} config.cb > callback
* @params {number} config.delay as milliseconds
*/
var KeepAlive = function(config) {
	config = config || {};
	var start = config.start || false;
	
	/**
	* @private
	*/
	this.cb = config.cb || function() {};
	
	/**
	* @private
	*/
	this.timeoutId = -1;
	
	/**
	* @public read only
	*/
	this.timeoutDelay = config.delay || 30000; // ms > 1s 
	
	if (start) {
		this.start();
	}
};

/**
* @public
*/
KeepAlive.prototype.start = function () {
	if (this.timeoutId !== -1) {
		return;
	}
	
	this.timeoutId = setInterval(this.cb, this.timeoutDelay);
	//console.log('keep alive: start');
};

/**
* @public
*/
KeepAlive.prototype.stop = function () {
	if (this.timeoutId === -1) {
		return;
	}
	
	clearInterval(this.timeoutId);
	this.timeoutId = -1;
	//console.log('keep alive: stop');
};

/**
* @public
*/
KeepAlive.prototype.restart = function () {
	this.stop();
	this.start();
};

/**
* @public
*/
KeepAlive.prototype.isRunning = function () {
	return this.timeoutId !== -1;
};


/*******************************************************************************
* Exports
*******************************************************************************/
exports.create = function(config) {
	return new KeepAlive(config);
};

