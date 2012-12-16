/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
// node
util = require('util'),
EventEmitter = require('events').EventEmitter,

// lib
netasqcomm = require('./netasqcomm'),

/**
* @singleton
* @inherits EventEmitter
*/
sessionManager = (function() {

	function SessionManager() {
		this.sessions = {};

		EventEmitter.call(this); 
	}
	util.inherits(SessionManager, EventEmitter); 

	SessionManager.prototype.add = function(config) {
		var session = netasqcomm.createSession(config);
		this.sessions[session.uuid] = session;

		session.on('disconnected', this._onSessionDisconnected.bind(this));

		return session;
	};

	SessionManager.prototype.get = function(config) {
		var id = netasqcomm.getId(config);
		if (this.sessions.hasOwnProperty(id)) {
			return this.sessions[id];
		}
		return undefined;
	};

	SessionManager.prototype._onSessionDisconnected = function(session) {
		delete this.sessions[session.getId()];
		if (Object.keys(this.sessions).length > 0) {
			return;
		}
		this.emit('disconnected');
	};	

	SessionManager.prototype.disconnect = function(session) {
		var prop;
		for(prop in this.sessions){
			if (this.sessions.hasOwnProperty(prop)) {
				this.sessions[prop].disconnect();
			}
		}
	};	

	return new SessionManager();
}());

/*******************************************************************************
* Exports
*******************************************************************************/
exports.sessionManager = function () {
	return sessionManager;
};

