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
session = require('../lib/netasq-comm').createSession(),
EUNDEFPROP_count = 0;


try { 
	session.getObjectValue();
} catch(e) {
	if (e.code === 'EUNDEFPROP') {
		EUNDEFPROP_count++; 
	}
}


var foo = {
	bar: 'toto'
};
assert.equal(session.getObjectValue('bar', foo), 'toto');

try { 
	session.getObjectValue('bar.foo', foo);
} catch(se) {
	if (se.code === 'EUNDEFPROP') {
		EUNDEFPROP_count++; 
	}
}


foo = {
	bar: {
		a: 'b'
	}
};
assert.strictEqual(session.getObjectValue('bar', foo), foo.bar);
assert.strictEqual(session.getObjectValue('bar.a', foo), 'b');

assert.strictEqual(EUNDEFPROP_count, 2, "EUNDEFPROP_count");
