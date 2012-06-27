/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
// node
assert = require('assert'),
EventEmitter = require('events').EventEmitter,

// contrib 
vows = require('vows'),
// lib
xml2jsparser = require('../lib/xml2jsparser');

exports.suite1 =  vows.describe('XML2JSParser class').addBatch({
		'when parsing nothing': {
			topic: function () { 
				var
				promise = new EventEmitter(),
				parser = xml2jsparser.create();
				
				parser.ondone = function (data) {
					promise.emit('success', data);
				};
				parser.write();
				parser.close();
				
				return promise;
			},
			'it returns an empty object': function (topic) {
				assert.deepEqual(topic, {});
			}
		},
		'when parsing <?xml version="1.0"?>': {
			topic: function () { 
				var
				promise = new EventEmitter(),
				parser = xml2jsparser.create(),
				xml = '<?xml version="1.0"?>';
				
				parser.ondone = function (data) {
					promise.emit('success', data);
				};
				parser.write(xml);
				parser.close();
				return promise;
			},
			'it returns an empty object': function (topic) {
				assert.deepEqual(topic, {});
			}
		},
		'when parsing <?xml version="1.0"?><ta a1="foo" a2="bar"></ta>': {
			topic: function () { 
				var
				promise = new EventEmitter(),
				parser = xml2jsparser.create(),
				xml = [
					'<?xml version="1.0"?>',
					'<ta a1="foo" a2="bar"></ta>'
				].join('');
				
				parser.ondone = function (data) {
					promise.emit('success', data);
				};
				parser.write(xml);
				parser.close();
				return promise;
			},
			'it returns {ta:{a1:\'foo\',a2: \'bar\'}}': function (topic) {
				assert.deepEqual(topic, {
						ta: {
							a1: 'foo',
							a2: 'bar'
						}
				});
			}
		},
		'when parsing child tag: <?xml version="1.0"?><ta a1="foo" a2="bar"><tb b1="foo" b2="bar"></tb></ta>': {
			topic: function () { 
				var
				promise = new EventEmitter(),
				parser = xml2jsparser.create(),
				xml = [
					'<?xml version="1.0"?>',
					'<ta a1="foo" a2="bar">',
					'<tb b1="foo" b2="bar"></tb>',
					'</ta>'
				].join('');
				
				parser.ondone = function (data) {
					promise.emit('success', data);
				};
				parser.write(xml);
				parser.close();
				return promise;
			},
			'it returns {ta:{a1: \'foo\',a2: \'bar\',tb:{b1: \'foo\',b2: \'bar\'}}}': function (topic) {
				assert.deepEqual(topic, {
						ta: {
							a1: 'foo',
							a2: 'bar',
							tb: {
								b1: 'foo',
								b2: 'bar'
							}
						}
				});
			}
		},
		'when parsing array of tags': {
			topic: function () { 
				var
				promise = new EventEmitter(),
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
					promise.emit('success', data);
				};
				parser.write(xml);
				parser.close();
				return promise;
			},
			'it succeed': function (topic) {
				assert.deepEqual(topic, { 
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
			}
		},
		'when parsing multiple elements': {
			topic: function () { 
				var
				promise = new EventEmitter(),
				parser = xml2jsparser.create(),
				xml = [
					'<?xml version="1.0"?>',
					'<a aa="foo">',
					'<b>v1</b>',
					'<b>v2</b>',
					'</a>'
				].join('');
				
				parser.ondone = function (data) {
					promise.emit('success', data);
				};
				parser.write(xml);
				parser.close();
				return promise;
			},
			'it succeed': function (topic) {
				assert.deepEqual(topic, {
						a:{
							aa:'foo',
							b:[
								'v1',
								'v2'
							]
						}
				});
			}
		},
		'when parsing multiple elements with various attributs': {
			topic: function () { 
				var
				promise = new EventEmitter(),
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
					promise.emit('success', data);
				};
				parser.write(xml);
				parser.close();
				return promise;
			},
			'it succeed': function (topic) {
				assert.deepEqual(topic, {
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
			}
		}		
});
