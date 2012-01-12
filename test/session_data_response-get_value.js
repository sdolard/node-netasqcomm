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
assert = require('assert'),
sdr = require('../lib/session_data_response').create(),
EUNDEFPROP_count = 0,
ENODATA_count = 0;

// ENODATA event
try { 
	sdr.getValue();
} catch(e) {
	if (e.code === 'ENODATA') {
		ENODATA_count++; 
	}
}

// empty data
sdr.data = {};
assert.strictEqual(sdr.getValue(), sdr.data);


// EUNDEFPROP event
try { 
	sdr.getValue(' ');
} catch(se) {
	if (se.code === 'EUNDEFPROP') {
		EUNDEFPROP_count++; 
	}
}


sdr.data = {
	bar: {
		a: 'b'
	}
};
assert.strictEqual(sdr.getValue('bar'), sdr.data.bar);
assert.strictEqual(sdr.getValue('bar.a'), sdr.data.bar.a);

// event
assert.strictEqual(ENODATA_count, 1, "ENODATA_count");
assert.strictEqual(EUNDEFPROP_count, 1, "EUNDEFPROP_count");
