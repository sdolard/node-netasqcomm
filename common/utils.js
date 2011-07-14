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
util = require('util');


/**
* @returns obj reference value related to str path
* @throw error if proprety does not exists
* @example
*	foo: {
*		bar: 'value'
* 	}
* 	getObjectValue('foo.bar', foo) returns 'value'
* 	getObjectValue('help', foo) throw an error
*/
exports.getObjectValue = function (str, obj) {
	str = str || '';
	obj = obj; 
	if (obj === undefined) {
		throw new SyntaxError('getObjectValue(str, obj): obj argument is missing');
	}
	
	var 
	prop = str.split('.'),
	objRef = obj,
	i;
	
	for (i in prop) {
		//console.log('prop[i] %d', i, prop[i]);
		if (objRef.hasOwnProperty(prop[i])) {
			objRef = objRef[prop[i]];
		} else {
			throw new Error('getObjectValue:' + prop[i] + ' property is undefined');
		}
	}
	return objRef;
};

(function test_getObjectValueUnitTest() {
		try { 
			exports.getObjectValue();
		} catch(e) {
			if (!e instanceof SyntaxError) {
				console.log('!e instanceof SyntaxError');
				throw e;
			}
		}
		
		try { 
			exports.getObjectValue('');
		} catch(se) {
			if (!se instanceof SyntaxError) {
				console.log('!e instanceof SyntaxError');
				throw se;
			}
		}
		
		
		var foo = {
			bar: 'toto'
		};
		if (exports.getObjectValue('bar', foo) !== 'toto') {
			throw "getObjectValue('bar', foo) !== 'toto'";
		}
		
		try {
			exports.getObjectValue('bar.foo', foo);
		} catch(e1) {
			if (!e1 instanceof Error) {
				throw e1;
			}
		}
		
		foo = {
			bar: {
				a: 'b'
			}
		};
		if (exports.getObjectValue('bar.a', foo) !== 'b') {
			throw "getObjectValue('bar.a', foo) !== 'b'";
		}
})();


/**
* @return right and left trimmed string
* @param {string} string to trim
*/
exports.strTrim = function (str) {
	if (str === undefined) {
		return '';
	}
	return String(str).replace(/^\s+|\s+$/g, '');
};

(function test_strTrim() {
		if (exports.strTrim() !== ''){
			throw "strTrim() !== ''";
		}
		if (exports.strTrim('') !== ''){
			throw "strTrim('') !== ''";
		}
		if (exports.strTrim(' ') !== ''){
			throw "strTrim(' ') !== ''";
		}
		if (exports.strTrim(' a') !== 'a'){
			throw "strTrim(' a') !== 'a'";
		}
		if (exports.strTrim('a ') !== 'a'){
			throw "strTrim('a ') !== 'a'";
		}
		if (exports.strTrim(' a ') !== 'a'){
			throw "strTrim(' a ') !== 'a'";
		}
		if (exports.strTrim(' a b') !== 'a b'){
			throw "strTrim(' a b') !== 'a b'";
		}
		if (exports.strTrim('a b ') !== 'a b'){
			throw "strTrim('a b ') !== 'a b'";
		}
		if (exports.strTrim(' a b ') !== 'a b'){
			throw "strTrim(' a b ') !== 'a b'";
		}
})();
