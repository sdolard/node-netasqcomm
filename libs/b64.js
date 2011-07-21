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
b64_keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

/**
* Adapted from
* Base64 encode / decode
* http://www.webtoolkit.info/
* http://www.webtoolkit.info/licence
*
**/

/**
* @public method for encoding in B64 (utf-8 compliant)
* @param {string} input
*/
var encode = function (input) {
	var output = "";
	var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
	var i = 0;
	
	input = b64_utf8_encode(input);
	
	while (i < input.length) {
		
		chr1 = input.charCodeAt(i++);
		chr2 = input.charCodeAt(i++);
		chr3 = input.charCodeAt(i++);
		
		enc1 = chr1 >> 2;
		enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
		enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
		enc4 = chr3 & 63;
		
		if (isNaN(chr2)) {
			enc3 = enc4 = 64;
		} else if (isNaN(chr3)) {
			enc4 = 64;
		}
		
		output = output +
		b64_keyStr.charAt(enc1) + b64_keyStr.charAt(enc2) +
		b64_keyStr.charAt(enc3) + b64_keyStr.charAt(enc4);
		
	}
	
	return output;
};

/** 
* @public method for decoding b64
* @returns {string}
*/
decode = function (input) {
	var output = "";
	var chr1, chr2, chr3;
	var enc1, enc2, enc3, enc4;
	var i = 0;
	
	input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
	
	while (i < input.length) {
		
		enc1 = b64_keyStr.indexOf(input.charAt(i++));
		enc2 = b64_keyStr.indexOf(input.charAt(i++));
		enc3 = b64_keyStr.indexOf(input.charAt(i++));
		enc4 = b64_keyStr.indexOf(input.charAt(i++));
		
		chr1 = (enc1 << 2) | (enc2 >> 4);
		chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
		chr3 = ((enc3 & 3) << 6) | enc4;
		
		output = output + String.fromCharCode(chr1);
		
		if (enc3 != 64) {
			output = output + String.fromCharCode(chr2);
		}
		if (enc4 != 64) {
			output = output + String.fromCharCode(chr3);
		}
		
	}
	
	output = b64_utf8_decode(output);
	
	return output;
};

/** 
* @private method for UTF-8 encoding
*/
b64_utf8_encode = function (string) {
	string = string.replace(/\r\n/g,"\n");
	var utftext = "";
	
	for (var n = 0; n < string.length; n++) {
		
		var c = string.charCodeAt(n);
		
		if (c < 128) {
			utftext += String.fromCharCode(c);
		}
		else if((c > 127) && (c < 2048)) {
			utftext += String.fromCharCode((c >> 6) | 192);
			utftext += String.fromCharCode((c & 63) | 128);
		}
		else {
			utftext += String.fromCharCode((c >> 12) | 224);
			utftext += String.fromCharCode(((c >> 6) & 63) | 128);
			utftext += String.fromCharCode((c & 63) | 128);
		}
		
	}
	
	return utftext;
};

/**
* @private method for UTF-8 decoding
*/
b64_utf8_decode = function (utftext) {
	var string = "";
	var i = 0;
	var c = 0,
	c1 = 0,
	c2 = 0;
	
	while ( i < utftext.length ) {
		
		c = utftext.charCodeAt(i);
		
		if (c < 128) {
			string += String.fromCharCode(c);
			i++;
		}
		else if((c > 191) && (c < 224)) {
			c2 = utftext.charCodeAt(i+1);
			string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
			i += 2;
		}
		else {
			c2 = utftext.charCodeAt(i+1);
			c3 = utftext.charCodeAt(i+2);
			string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
			i += 3;
		}
		
	}
	
	return string;
};

/*******************************************************************************
* Exports
*******************************************************************************/
exports.encode = encode;
exports.decode = decode;

