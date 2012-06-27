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
keepAlive = require('../lib/keepalive');


exports.suite1 = vows.describe('KeepAlive class').addBatch({
		'when creating a stopped KeepAlive instance': {
			topic: function () { 
				return keepAlive.create({
						cb: function() {
						},
						delay: 1, 
						start: false
				});
			},
			
			'keepalive is not running': function (topic) {
				assert.ok(!topic.isRunning());
			}
		},
		'when creating a running KeepAlive instance': {
			topic: function () { 
				var 
				promise = new EventEmitter(),
				ka = keepAlive.create({
						cb: function() {
							promise.emit('success', ka);
						},
						delay: 1, 
						start: true
				});
				return promise;
			},
			'keepalive is running': function (ka) {
				assert.ok(ka.isRunning());
				ka.stop();
				assert.ok(!ka.isRunning());
			}
		}
});
