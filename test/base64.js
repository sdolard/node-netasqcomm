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
