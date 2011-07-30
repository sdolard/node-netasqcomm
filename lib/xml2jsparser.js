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
util = require('util'),
sax = require('sax'); 


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
		me.log('parser.onerror e:', e);
		if (me.onerror !== undefined) { 
			me.onerror(e);
		}
	};
	
	parser.ontext = function (t) {
		me.log('parser.ontext: %s', t);
		var obj = responseDataStack[responseDataStack.length - 1];
		me.log('parser.ontext obj', obj);
		me.log('parser.ontext responseData', responseData);
		if (responseData === obj) {
			return;
		}
		obj['#'] = t;
		me.log('parser.ontext obj', obj);
	};
	
	parser.onopentag = function (node) {
		me.log('parser.onopentag: ', node);
		var 
		obj = {},
		p,
		stackTop,
		tmp;
		
		// attributes
		/* jslint forin: true*/
		for (p in node.attributes) {
			if (!obj.hasOwnProperty('@')) {
				obj['@'] = {};
			}
			obj['@'][p] = node.attributes[p];
		}
		
		/* jslint forin: false*/
		
		// tags
		stackTop = responseDataStack[responseDataStack.length - 1];
		me.log('parser.onopentag: stackTop', stackTop);
		if (stackTop.hasOwnProperty(node.name)) {
			me.log('parser.onopentag: stackTop.hasOwnProperty(node.name)', node.name);
			tmp = stackTop[node.name];
			if (!(tmp instanceof Array)) {
				stackTop[node.name] = [tmp];
			}
			if (obj.hasOwnProperty('@')) {
				stackTop[node.name].push(obj);
			}
		} else {
			stackTop[node.name] = obj;
		}
		
		responseDataStack.push(obj);
		me.log('parser.onopentag: stackTop', stackTop);
	};
	
	parser.onclosetag = function (node) {
		me.log('parser.onclosetag: %s', node);
		var 
		obj = responseDataStack.pop(),
		stackTop = responseDataStack[responseDataStack.length - 1],
		p, 
		tmp;
		
		me.log('parser.onclosetag obj', obj);
		
		// Format name
		if (obj.hasOwnProperty('#')) {
			if (stackTop[node] instanceof Array) {
				stackTop[node].push(obj['#']);
			} else {
				stackTop[node] = obj['#'];
			}
		}
		
		// Format attribute
		if (obj.hasOwnProperty('@')) {
			for (p in obj['@']) {
				if (obj.hasOwnProperty(p)) {
					tmp = obj[p];
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
		me.log('parser.onopencdata: %s', data);
		responseDataStack[responseDataStack.length - 1].cdata = '';
	};
	parser.oncdata =  function(data) {
		me.log('parser.oncdata: %s', data);
		responseDataStack[responseDataStack.length - 1].cdata += data;
	};
	
	parser.onend = function () {
		me.log('parser.onend');
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
* Log only if verbose is positive
* @public
* @method
*/
XML2JSParser.prototype.log = function() {
	if (!this.verbose) {
		return;
	}
	var 
	args = arguments,
	v = 'verbose# ';
	args[0] = args[0].replace('\n', '\n' + v);
	args[0] = v.concat(args[0]);
	console.log.apply(console, args);
};


/*******************************************************************************
* Exports
*******************************************************************************/
/**
* @class
* @public
*/
exports.XML2JSParser = XML2JSParser;
