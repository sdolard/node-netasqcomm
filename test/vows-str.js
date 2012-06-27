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
str = require('../lib/str');

// Create a Test Suite
exports.suite1 =  vows.describe('str functions').addBatch({
		'when strTrim \'\'': {
			topic: function () { 
				return str.trim();
			},
			'we got \'\'': function (topic) {
				assert.strictEqual(topic, '');
			}
		},
		'when strTrim \' \'': {
			topic: function () { 
				return str.trim();
			},
			'we got \'\'': function (topic) {
				assert.strictEqual(topic, '');
			}
		},
		'when strTrim \' a\'': {
			topic: function () { 
				return str.trim(' a');
			},
			'we got \'a\'': function (topic) {
				assert.strictEqual(topic, 'a');
			}
		},
		'when strTrim \'a \'': {
			topic: function () { 
				return str.trim('a ');
			},
			'we got \'a\'': function (topic) {
				assert.strictEqual(topic, 'a');
			}
		},
		'when strTrim \' a \'': {
			topic: function () { 
				return str.trim(' a ');
			},
			'we got \'a\'': function (topic) {
				assert.strictEqual(topic, 'a');
			}
		},
		'when strTrim \' a b\'': {
			topic: function () { 
				return str.trim(' a b');
			},
			'we got \'a b\'': function (topic) {
				assert.strictEqual(topic, 'a b');
			}
		},
		'when strTrim \' a b \'': {
			topic: function () { 
				return str.trim(' a b ');
			},
			'we got \'a b\'': function (topic) {
				assert.strictEqual(topic, 'a b');
			}
		},
		'when strTrim \'a b \'': {
			topic: function () { 
				return str.trim('a b ');
			},
			'we got \'a b\'': function (topic) {
				assert.strictEqual(topic, 'a b');
			}
		},
		'str.xmlTrimRight(\'foo<bar>\\r\')': {
			topic: function () { 
				return str.xmlTrimRight('foo<bar>\r');
			},
			'equal \'foo<bar>\'': function (topic) {
				assert.strictEqual(topic, 'foo<bar>');
			}
		},
		'str.xmlTrimRight(\' foo<bar> \')': {
			topic: function () { 
				return str.xmlTrimRight(' foo<bar> ');
			},
			'equal \' foo<bar>\'': function (topic) {
				assert.strictEqual(topic, ' foo<bar>');
			}
		}
		
});

