/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
// node
assert = require('assert'),

// lib
str = require('../lib/str');

describe('str functions', function() {
	it('should trim', function() {
		assert.strictEqual(str.trim(), '');
		assert.strictEqual(str.trim(' '), '');
		assert.strictEqual(str.trim(' a'), 'a');
		assert.strictEqual(str.trim(' a '), 'a');
		assert.strictEqual(str.trim('a '), 'a');
		assert.strictEqual(str.trim(' a b'), 'a b');
		assert.strictEqual(str.trim(' a b'), 'a b');
		assert.strictEqual(str.trim('a b'), 'a b');
	});

	it('should xmlTrimRight', function() {
		assert.strictEqual(str.xmlTrimRight('foo<bar>\r'), 'foo<bar>');
		assert.strictEqual(str.xmlTrimRight(' foo<bar> '), ' foo<bar>');
	});
});

