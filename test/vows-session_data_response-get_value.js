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
