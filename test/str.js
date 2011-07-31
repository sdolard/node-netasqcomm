var
assert = require('assert'),
util = require('util'),
str = require('../lib/str');

// trim
assert.strictEqual(str.trim(), '');
assert.strictEqual(str.trim(''), '');
assert.strictEqual(str.trim(' '), '');
assert.strictEqual(str.trim(' a'), 'a');
assert.strictEqual(str.trim('a '), 'a');
assert.strictEqual(str.trim(' a '), 'a');
assert.strictEqual(str.trim(' a b'), 'a b');
assert.strictEqual(str.trim(' a b '), 'a b');
assert.strictEqual(str.trim('a b '), 'a b');

// xmlTrimRight
assert.strictEqual(str.xmlTrimRight('foo<bar>\r'), 'foo<bar>');
assert.strictEqual(str.xmlTrimRight(' foo<bar> '), ' foo<bar>');
