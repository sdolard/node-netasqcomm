/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

/**
* @params {object} config
* @params {function} config.cb > callback
* @params {number} config.delay as milliseconds
*/
var KeepAlive = function(config) {
	config = config || {};
	var 
	me = this,
	start = config.start || false;
	
	/**
	* @private
	*/
	this.cb = config.cb || function() {return;};
	
	/**
	* @private
	*/
	this.timeoutId = -1;
	
	/**
	* @public read only
	*/
	this.timeoutDelay = config.delay || 30000; // ms > 1s 
	
	if (start) {
		process.nextTick(function(){
				me.start();
		});
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

