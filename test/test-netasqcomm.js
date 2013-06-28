/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
// node
assert = require('assert'),
// lib
netasqcomm = require('../lib/netasqcomm');

describe('Session class', function(){
	it ('should create a Session class with no argument', function(){
		var session = netasqcomm.createSession();
		assert.strictEqual(session.requiredLevel, netasqcomm.SESSION_LEVELS.join(','));
		assert.strictEqual(session.appName, 'netasqcomm');
		assert.strictEqual(session.timeout, 120);
		assert.strictEqual(session.login, '');
		assert.strictEqual(session.pwd, '');
		assert.strictEqual(session.host, '');
		assert.strictEqual(session.port, 443);
		assert(session.ssl);
		assert(!session.verbose);
		assert(!session._authenticated);
		assert.strictEqual(session.apiSessionId, '');
		assert.deepEqual(session.cookies, {});
		assert.strictEqual(session.lastCliCmd, '');
		assert.strictEqual(session.sessionLevel, '');
		assert.deepEqual(session.fw, {
			serial: '',
			protocol: '',
			command: '',
			needReboot: false
		});
	});

	it ('should throw when creating a Session class with invalid requiredLevel', function(){
		try{
			netasqcomm.createSession({
				requiredLevel: 'bar'
			});
		} catch (err){
			assert.strictEqual(err.message, 'invalid level: bar');
		}
	});

	it ('should create a Session class with set requiredLevel as Array', function(){
		var session = netasqcomm.createSession({
			requiredLevel: ['base', 'modify']
		});
		assert.strictEqual(session.requiredLevel, 'base,modify');
	});
	it ('should create a Session class with set requiredLevel as String', function(){
		var session = netasqcomm.createSession({
			requiredLevel: 'base,modify'
		});
		assert.strictEqual(session.requiredLevel, 'base,modify');
	});
});
