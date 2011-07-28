var
assert = require('assert'),
b64 = require('../lib/base64');

// en: hello world
assert.equal(b64.encode('hello world'), 'aGVsbG8gd29ybGQ=','en encode');
assert.equal(b64.decode("aGVsbG8gd29ybGQ="), 'hello world','en decode');

// corean: 안녕하세요
assert.equal(b64.encode('안녕하세요'), '7JWI64WV7ZWY7IS47JqU','corean encode');
assert.equal(b64.decode("7JWI64WV7ZWY7IS47JqU"), '안녕하세요','corean decode');

// chinese: 你好世界
assert.equal(b64.encode('你好世界'), '5L2g5aW95LiW55WM','chinese encode');
assert.equal(b64.decode("5L2g5aW95LiW55WM"), '你好世界','chinese decode');

// russian: привет мир
assert.equal(b64.encode('привет мир'), '0L/RgNC40LLQtdGCINC80LjRgA==','russian encode');
assert.equal(b64.decode("0L/RgNC40LLQtdGCINC80LjRgA=="), 'привет мир','russian decode');
