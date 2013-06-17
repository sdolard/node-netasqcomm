/*
Copyright © 2011-2013 by Sebastien Dolard (sdolard@gmail.com)
*/

var
// node
assert = require('assert'),

// contrib
// lib
xml2jsparser = require('../lib/xml2jsparser');

describe('XML2JSParser class', function(){
	it ('should returns an empty string when parsing nothing', function(done) {
		var
		parser = xml2jsparser.create();

		parser.ondone = function (data) {
			assert.deepEqual(data, {});
			done();
		};
		parser.write("");
		parser.close();
	});

	it ('should returns an empty object when parsing <?xml version="1.0"?>', function (done) {
		var
		parser = xml2jsparser.create(),
		xml = '<?xml version="1.0"?>';

		parser.ondone = function (data) {
			assert.deepEqual(data, {});
			done();
		};
		parser.write(xml);
		parser.close();

	});

	it ('should returns {ta:{a1:\'foo\',a2: \'bar\'}} when parsing <?xml version="1.0"?><ta a1="foo" a2="bar"></ta>', function(done) {
		var
		parser = xml2jsparser.create(),
		xml = [
			'<?xml version="1.0"?>',
			'<ta a1="foo" a2="bar"></ta>'
		].join('');

		parser.ondone = function (data) {
			assert.deepEqual(data, {
				ta: {
					a1: 'foo',
					a2: 'bar'
				}
			});
			done();
		};
		parser.write(xml);
		parser.close();

	});

	it ('should returns {ta:{a1: \'foo\',a2: \'bar\',tb:{b1: \'foo\',b2: \'bar\'}}} when parsing child tag: <?xml version="1.0"?><ta a1="foo" a2="bar"><tb b1="foo" b2="bar"></tb></ta>', function(done) {
		var
		parser = xml2jsparser.create(),
		xml = [
			'<?xml version="1.0"?>',
			'<ta a1="foo" a2="bar">',
			'<tb b1="foo" b2="bar"></tb>',
			'</ta>'
		].join('');

		parser.ondone = function (data) {
			assert.deepEqual(data, {
				ta: {
					a1: 'foo',
					a2: 'bar',
					tb: {
						b1: 'foo',
						b2: 'bar'
					}
				}
			});
			done();
		};
		parser.write(xml);
		parser.close();
	});

	it ('should succeed when parsing array of tags',function(done){
		var
		parser = xml2jsparser.create(),
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
			assert.deepEqual(data, {
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
			});
			done();
		};
		parser.write(xml);
		parser.close();
	});

	it ('should succeed when parsing multiple elements', function(done){
		var
		parser = xml2jsparser.create(),
		xml = [
			'<?xml version="1.0"?>',
			'<a aa="foo">',
			'<b>v1</b>',
			'<b>v2</b>',
			'</a>'
		].join('');

		parser.ondone = function (data) {
			assert.deepEqual(data, {
				a:{
					aa:'foo',
					b:[
						'v1',
						'v2'
					]
				}
			});
			done();
		};
		parser.write(xml);
		parser.close();

	});

	it ('should succeed when parsing multiple elements with various attributs', function(done) {
		var
		parser = xml2jsparser.create(),
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
			assert.deepEqual(data, {
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
			});
			done();
		};
		parser.write(xml);
		parser.close();
	});
});
