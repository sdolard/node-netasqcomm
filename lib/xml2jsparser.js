/*jslint forin: false*/
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
* Depends on sax-js.
* Returns a json format of xml data (see ondone event)
* All properties are set as lowercase (not values)
* This DO NOT need to inherit from EventEmitter cos event notification (TODO) depends
* on sax.parser events.
* @class
* @public
* @event onerror(e {error}), called on error
* @event ondone(json {object}), called when it's done
* @methode verbose
* @example
*       var
*       xml2jsparser = require('xml2jsparser');
*       parser = xml2jsparser.create();
* 
*       parser.onerror = function (e) {
*               // an error happened.
*               console.log('parser.onerror e:', e);
*       };
*       
*       parser.ondone = function (json) {
*               console.log('parser.onend json:', util.inspect(json, false, 100));
*       };
*       parser.write(xml); // append data. Can be called more than once
*       parser.close(); // > ondone event will be emited when it's done
*/
var XML2JSParser = function (config) {
	config = config || {};
	this.verbose = config.verbose || false;
	
	var    
	me = this,
	parser = sax.parser(false, {
		lowercasetags: true
	}),
	responseData = {},
	responseDataStack = [responseData];
	
	
	parser.onerror = function (exception) {
		me.error('parser.onerror e:', exception.message);
		if (me.onerror !== undefined) { 
			me.onerror(exception);
		}
	};
	
	parser.ontext = function (t) {
		me.log('parser.ontext + %s', t);
		var stackTop = responseDataStack[responseDataStack.length - 1];
		if (responseData === stackTop) { // root name hack
			return;
		}
		stackTop['#'] = t;
		me.log('parser.ontext - stackTop:', stackTop);
	};
	
	parser.onopentag = function (node) {
		me.log('parser.onopentag + new tag %s: ', node.name, node);
		var 
		obj = {},
		p,
		stackTop,
		tmp;
		
		// attributes
		for (p in node.attributes) {
			if (node.attributes.hasOwnProperty(p)) {
				if (!obj.hasOwnProperty('@')) {
					obj['@'] = {};
				}
				obj['@'][p] = node.attributes[p];
			}
		}
		
		// tags
		stackTop = responseDataStack[responseDataStack.length - 1];
		me.log('parser.onopentag previous stackTop', stackTop);
		if (stackTop.hasOwnProperty(node.name)) {
			// if stackTop already has this property, we have to convert it to an array
			me.log('parser.onopentag stackTop already has "%s" property, converting %s to an array', node.name, node.name);
			tmp = stackTop[node.name];
			if (tmp instanceof Array) {
				stackTop[node.name].push(obj);
				
			} else {
				stackTop[node.name] = [tmp];
				stackTop[node.name].push(obj);
				
			}
			me.log('parser.onopentag new stackTop.%s', node.name, stackTop[node.name]);
		} else {
			stackTop[node.name] = obj;
		}
		
		responseDataStack.push(obj);
		me.log('parser.onopentag - new stackTop.%s', node.name, obj);
	};
	
	parser.onclosetag = function (node) {
		me.log('parser.onclosetag + %s', node);
		var 
		tag = responseDataStack.pop(),
		stackTop = responseDataStack[responseDataStack.length - 1],
		attr,
		tagAt;
		
		me.log('parser.onclosetag tag.%s (tmp)', node, tag);
		
		// Format name
		if (tag.hasOwnProperty('#')) {
			me.log('parser.onclosetag tag.%s formating name', node);
			if (stackTop[node] instanceof Array) {
				stackTop[node][stackTop[node].length - 1]= tag['#'];
			} else {
				stackTop[node] = tag['#'];
			}
		}
		
		// Format attribute
		if (tag.hasOwnProperty('@')) {
			me.log('parser.onclosetag tag.%s formating attributes', node);
			tagAt = tag['@'];
			for (attr in tagAt) {
				if (tagAt.hasOwnProperty(attr)){
					if (tag.hasOwnProperty(attr)) {
						if (!(tag[attr] instanceof Array)) {
							tag[attr] = [tag[attr]];
						}
						tag[attr].push(tagAt[attr]);
					} else {
						tag[attr] = tagAt[attr];
					}
				}
			}
			delete tag['@'];
		}
		me.log('parser.onclosetag - tag.%s', node, tag);
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
XML2JSParser.prototype.error = function() {
	if (!this.verbose) {
		return;
	}
	var 
	args = arguments,
	v = 'verbose# ';
	args[0] = args[0].replace('\n', '\n' + v);
	args[0] = v.concat(args[0]);
	console.error.apply(console, args);
};

XML2JSParser.prototype.log = function() {
	if (!this.debug) {
		return;
	}
	var 
	args = arguments,
	v = 'debug# ';
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
exports.create = function (config) {
	return new XML2JSParser(config);
};
