/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var 
// node
assert = require('assert'),
EventEmitter = require('events').EventEmitter,

// contrib 
vows = require('vows'),

// lib
netasqcomm = require('../lib/netasqcomm');


exports.suite1 = vows.describe('Session class').addBatch({
		'when creating a Session class with no argument': {
			topic: function () { 
				return netasqcomm.createSession();
			},
			
			'Default requiredLevel equal SESSION_LEVELS': function (session) {
				assert.strictEqual(session.requiredLevel, netasqcomm.SESSION_LEVELS.join(','));
			},
			'appName is valid': function (session) {
				assert.strictEqual(session.appName, 'netasqcomm');
			},
			'Defaut timeout equal 120': function (session) {
				assert.strictEqual(session.timeout, 120);
			},
			'login is empty': function (session) {
				assert.strictEqual(session.login, '');
			},
			'pwd is empty': function (session) {
				assert.strictEqual(session.pwd, '');
			},
			'host is empty': function (session) {
				assert.strictEqual(session.host, '');
			},
			'port equal 443': function (session) {
				assert.strictEqual(session.port, 443);
			},
			'ssl is true': function (session) {
				assert.isTrue(session.ssl);
			},			
			'verbose is disabled': function (session) {
				assert.isFalse(session.verbose);
			},			
			'_authenticated is false': function (session) {
				assert.isFalse(session._authenticated);
			},			
			'id is empty': function (session) {
				assert.strictEqual(session.id, '');
			},			
			'cookies equal {}': function (session) {
				assert.deepEqual(session.cookies, {});
			},			
			'lastCliCmd is empty': function (session) {
				assert.strictEqual(session.lastCliCmd, '');
			},			
			'sessionLevel is empty': function (session) {
				assert.strictEqual(session.sessionLevel, '');
			},			
			'fw is valid': function (session) {
				assert.deepEqual(session.fw, {
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
				});
			}
		},
		'when creating a Session class with invalid requiredLevel': {
			topic: function () { 
				return netasqcomm.createSession({
						requiredLevel: 'bar'
				});
			},
			
			'Default requiredLevel equal SESSION_LEVELS': function (err) {
				assert.strictEqual(err.message, 'invalid level: bar');
			}
		},
		'when creating a Session class with valid requiredLevel (Array)': {
			topic: function () { 
				return netasqcomm.createSession({
						requiredLevel: ['base', 'modify']
				});
			},
			
			'requiredLevel equal \'base,modify\'': function (session) {
				assert.strictEqual(session.requiredLevel, 'base,modify');
			}
		},
		'when creating a Session class with valid requiredLevel (string)': {
			topic: function () { 
				return netasqcomm.createSession({
						requiredLevel: 'base,modify'
				});
			},
			
			'requiredLevel equal \'base,modify\'': function (session) {
				assert.strictEqual(session.requiredLevel, 'base,modify');
			}
		}
});
