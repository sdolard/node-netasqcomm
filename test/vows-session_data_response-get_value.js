/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
// node
assert = require('assert'),

// contrib 
vows = require('vows'),

sdr = require('../lib/session_data_response').create();


// Create a Test Suite
exports.suite1 =  vows.describe('SessionDataResponse class').addBatch({
		'when calling getValue when data is undefined': {
			topic: function () { 
				return sdr.getValue();
			},
			'it throw a ENODATA error': function (err) {
				assert.strictEqual(err.code, 'ENODATA');
			},
			'message is: \'data property is undefined\'': function (err) {
				assert.strictEqual(err.message, 'data property is undefined');
			}
		},
		'when calling getValue when data is an empty object': {
			topic: function () {
				sdr.data = {};
				return sdr;
			},
			'getValue equal sdr.data': function (topic) {
				assert.strictEqual(sdr.getValue(), topic.data);
			}
		},
		'when calling getValue of a undefined property': {
			topic: function () {
				return sdr.getValue(' ');
			},
			'it throw a EUNDEFPROP error': function (topic) {
				assert.strictEqual(topic.code, 'EUNDEFPROP');
			},
			'Message is :" " property is not defined in "{}"': function (topic) {
				assert.strictEqual(topic.message, '" " property is not defined in "{}"');
			}
		},
		'when data is set with {bar:{a: \'b\'}}': {
			topic: function () {
				sdr.data = {
					bar: {
						a: 'b'
					}
				};
				return sdr;
			},
			'getValue(\'bar\') equal data.bar': function (topic) {
				assert.strictEqual(topic.getValue('bar'), topic.data.bar);
			},
			'getValue(\'bar.a\') equal data.bar.a': function (topic) {
				assert.strictEqual(topic.getValue('bar.a'), topic.data.bar.a);
			}
		}
		
});
