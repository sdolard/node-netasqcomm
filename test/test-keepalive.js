/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
// node
assert = require('assert'),
// lib
keepAlive = require('../lib/keepalive');


describe('KeepAlive class', function(){
	it('should not run', function(){
		var ka = keepAlive.create({
			cb: function() { 
				return;
			},
			delay: 1,
			start: false
		});
		assert(!ka.isRunning());
	});

	it('should run', function(done){
		var ka = keepAlive.create({
			cb: function() {
				assert(ka.isRunning());
				ka.stop();
				assert(!ka.isRunning());
				done();
			},
			delay: 1,
			start: true
		});
	});
});
