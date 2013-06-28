/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
// node
assert = require('assert'),

sdr = require('../lib/session_data_response').create();

describe ('SessionDataResponse class', function(){
	// order is important !
	it ('should throw when calling getValue with no params', function() {
		try {
			sdr.getValue();
		} catch (err) {
			assert.strictEqual(err.code, 'ENODATA');
			assert.strictEqual(err.message, 'data property is undefined');
		}
	});

	it ('should set getValue to data', function() {
		sdr.data = {};
		assert.strictEqual(sdr.getValue(), sdr.data);
	});


	it ('should throw when calling getValue with an empty string', function() {
		try {
			sdr.getValue(' ');
		} catch (err) {
			assert.strictEqual(err.code, 'EUNDEFPROP');
			assert.strictEqual(err.message, '" " property is not defined in "{}"');
		}
	});

	it ('should getValue', function() {
		sdr.data = {
			bar: {
				a: 'b'
			}
		};
		assert.strictEqual(sdr.getValue('bar'), sdr.data.bar);
		assert.strictEqual(sdr.getValue('bar.a'), sdr.data.bar.a);
	});
});
