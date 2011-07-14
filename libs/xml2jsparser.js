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
sax, // https://github.com/isaacs/sax-js
util = require('util');

try{
	sax = require('sax'); // npm ?
}
catch(e) {
	sax = require('../contrib/sax-js/lib/sax');	// contrib ?
}

/**
* Based on sax-js.
* Returns a json format of xml data (see ondone event)
* All properties are set as lowercase (not values)
* @class
* @public
* @event onerror(e {error}), called on error
* @event ondone(json {object}), called when it's done
* @example
* 	var parser = new XML2JSParser();
* 
* 	parser.onerror = function (e) {
* 		// an error happened.
* 		console.log('parser.onerror e:', e);
* 	};
*	
* 	parser.ondone = function (json) {
* 		console.log('parser.onend json:', util.inspect(json, false, 100));
* 	};
* 	parser.write(xml); // append data. Can be called more than once
* 	parser.close(); // > ondone event will be emited when it's done
*/
var XML2JSParser = function () {
	var    
	me = this,
	parser = sax.parser(false, {
		lowercasetags: true
	}),
	responseData = {},
	responseDataStack = [responseData];
	
	
	parser.onerror = function (e) {
		// console.log('parser.onerror e:', e);
		if (me.onerror !== undefined) { 
			me.onerror(e);
		}
	};
	
	parser.ontext = function (t) {
		var obj = responseDataStack[responseDataStack.length - 1];
		if (responseData === obj) {
			return;
		}
		
		obj['#'] = t;
	};
	
	parser.onopentag = function (node) {
		var obj = {};
		
		// attributes
		/* jslint forin: true*/
		for (var p in node.attributes) {
			if (!obj.hasOwnProperty('@')) {
				obj['@'] = {};
			}
			obj['@'][p] = node.attributes[p];
		}
		/* jslint forin: false*/
		
		// tags
		var stackTop = responseDataStack[responseDataStack.length - 1];
		if (stackTop.hasOwnProperty(node.name)) {
			var tmp = stackTop[node.name];
			if (!(tmp instanceof Array)) {
				stackTop[node.name] = [tmp];
			}
			stackTop[node.name].push(obj);
		} else {
			stackTop[node.name] = obj;
		}
		
		responseDataStack.push(obj);
	};
	
	parser.onclosetag = function (node) {
		var 
		obj = responseDataStack.pop(),
		stackTop = responseDataStack[responseDataStack.length - 1];
		
		// Format name
		if (obj.hasOwnProperty('#')) {
			stackTop[node] = obj['#'];
		}
		
		// Format attribute
		if (obj.hasOwnProperty('@')) {
			for (var p in obj['@']) {
				if (obj.hasOwnProperty(p)) {
					var tmp = obj[p];
					if (!(tmp instanceof Array)) {
						obj[p] = [tmp];
					}
					obj[p].push(obj['@'][p]);
				} else {
					obj[p] = obj['@'][p];
				}
			}
			delete obj['@'];
		}
		
	};
	
	parser.onopencdata =  function(data) {
		responseDataStack[responseDataStack.length - 1].cdata = '';
	};
	parser.oncdata =  function(data) {
		responseDataStack[responseDataStack.length - 1].cdata += data;
	};
	
	parser.onend = function () {
		if (me.ondone !== undefined) {
			me.ondone(responseData);
		}
		//reset
		responseData = {}; 
		responseDataStack = [responseData];
	};
	
	/**
	* @public
	* @see sax.parser.write();
	*/
	this.write = function(data) {
		parser.write(data);
	};
	
	/**
	* @public
	* @see sax.parser.close();
	*/
	this.close = function() {
		parser.close();
	};
};

/**
* @exports XML2JSParser constuctor
*/
exports.createXML2JSParser = function() {
	return new XML2JSParser();
};


(function test_XML2JSParser(){
		var xml2jsparser = exports.createXML2JSParser();
		
		
		xml2jsparser.onerror = function (e) {
			if (e.message.indexOf('Unexpected end', 0) !== 0){
				throw "test_XML2JSParser: e.message.indexOf('Unexpected end', 0) !== 0";
			}
		};
		xml2jsparser.close();
		
		// raw test
		/*xml2jsparser.ondone = function (data) {
			
			console.log('test_XML2JSParser xml2jsparser.ondone:', util.inspect(data, false, 100));
		};
		var raw = [
			'<?xml version="1.0"?>',
			'<nws code="100" msg="OK" id="DEFAULT_STARTUP_COMMAND">',
			'<serverd ret="101" code="00a01000" msg="Début">',
			'<data format="raw">',
			'<![CDATA[AUTH       : User authentication',
			"CHPWD      : Return if it's necessary to update password or not'",
			']]>',
			'</data>',
			'</serverd>',
			'<serverd ret="100" code="00a00100" msg="Ok">',
			'</serverd>',
			'</nws>'
		].join('');
		xml2jsparser.write(raw);
		xml2jsparser.close();
	*/
})();
