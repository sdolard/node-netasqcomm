var
assert = require('assert'),
util = require('util'),
xml2jsparser = require('../lib/xml2jsparser'),
xml, 
result,
parser= new xml2jsparser.XML2JSParser();
parser.onerror = function (e) {
	// an error happened.
	console.log('parser.onerror e:', e);
};

// Nothing
xml = [
'<?xml version="1.0"?>'].join('');
parser.ondone = function (data) {
	result = {};
	assert.deepEqual(data, result);
};
parser.write(xml);
parser.close();


// Attributes, values
xml = [
	'<?xml version="1.0"?>',
	'<ta a1="foo" a2="bar"></ta>'
].join('');
parser.ondone = function (data) {
	result = {
		ta: {
			a1: 'foo',
			a2: 'bar'
		}
	};
	assert.deepEqual(data, result);
};
parser.write(xml);
parser.close();


// Child tag
xml = [
	'<?xml version="1.0"?>',
	'<ta a1="foo" a2="bar">',
	'<tb b1="foo" b2="bar">',
	'</tb>',
	'</ta>'
].join('');
parser.ondone = function (data) {
	result = {
		ta: {
			a1: 'foo',
			a2: 'bar',
			tb: {
				b1: 'foo',
				b2: 'bar'
			}
		}
	};
	assert.deepEqual(data, result);
};
parser.write(xml);
parser.close();


// Array of tag
xml = [
	'<?xml version="1.0"?>',
	'<ta a1="foo" a2="bar">',
	'<tb b1="first">',
	'<c><d>bar</d></c>',
	'</tb>',
	'<tb b1="second"></tb>',
	'</ta>'
].join('');
parser.ondone = function (data) {
	result = { 
		ta:  { 
			a1: 'foo',
			a2: 'bar',
			tb: [ 
				{ 
					c: { 
						d: 'bar' 
					}, 
					b1: 'first' 
				}, 
				{ 
					b1: 'second' 
				} 
			] 
		} 
    };
    assert.deepEqual(data, result);
};
parser.write(xml);
parser.close();


//
xml = [
	'<?xml version="1.0"?>',
	'<a aa="foo">',
	'<b>v1</b>',
	'<b>v2</b>',
	'</a>'
].join('');
parser.ondone = function (data) {
	result = {
		a:{
			aa:'foo',
			b:[
				'v1',
				'v2'
			]
		}
	};
    //console.log('data', util.inspect(data, false, 100));
    assert.deepEqual(data, result);
};
//parser.verbose = true;
parser.write(xml);
parser.close();


//
xml = [
	'<?xml version="1.0"?>',
	'<a>',
	'<b ba1="ba1v"/>',
	'</a>',
	'<a>',
	'<b ba2="ba2v"/>',
	'</a>',
	'<a>',
	'<b ba3="ba3v"/>',
	'</a>'
].join('');
parser.ondone = function (data) {
	result = {
		a:[
			{
				b:{
					ba1:'ba1v'
				}
			},
			{
				b:{
					ba2:'ba2v'
				}
			},
			{
				b:{
					ba3:'ba3v'
				}
			}
		]
	};
    //console.log('data', util.inspect(data, false, 100));
    assert.deepEqual(data, result);
};
//parser.verbose = true;
parser.write(xml);
parser.close();


