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
netasqComm = require('../lib/netasq-comm'),
xml2jsparser = require('../lib/xml2jsparser'),
parser,
xml, 
result,
ss, 
StrStream = function() {
	this.text = '';
};

StrStream.prototype.write = function(s) {
	this.text += s;
	//console.log('StrStream.prototype.write %s', this.text);
};

parser = xml2jsparser.create();
parser.onerror = function (e) {
	// an error happened.
	console.log('parser.onerror e:', e);
};


// Raw format
xml = [
	'<?xml version="1.0"?>',
	'<nws code="100" msg="OK" id="help">',
	'<serverd ret="101" code="00a01000" msg="Début">',
	'<data format="raw"><![CDATA[AUTH       : User authentication\n',
	"CHPWD      : Return if it's necessary to update password or not\n",
	'CONFIG     : Firewall configuration functions\n',
	'GLOBALADMIN : Global administration\n',
	'HA         : HA functions\n',
	'HELP       : Display available commands\n',
	'LIST       : Display the list of connected users, show user rights (Level) and rights for current session (SessionLevel).\n',
	'LOG        : Log related functions\n',
	'Everywhere a timezone is needed, if not specified the command is treated with firewall timezone setting\n',
	'MODIFY     : Get / loose the modify or the mon_write right\n',
	'MONITOR    : Monitor related functions\n',
	'NOP        : Do nothing but avoid disconnection from server.\n',
	'PKI        : show or update the pki\n',
	'QUIT       : Log off\n',
	'SYSTEM     : System commands\n',
	'USER       : User related functions\n',
	'VERSION    : Display server version\n',
	']]></data></serverd>',
	'<serverd ret="100" code="00a00100" msg="Ok"></serverd></nws>'
].join('');
parser.ondone = function (data) {
	result = { 
		nws: { 
			serverd: [ 
				{ 
					data: { 
						cdata: 'AUTH       : User authentication\nCHPWD      : Return if it\'s necessary to update password or not\nCONFIG     : Firewall configuration functions\nGLOBALADMIN : Global administration\nHA         : HA functions\nHELP       : Display available commands\nLIST       : Display the list of connected users, show user rights (Level) and rights for current session (SessionLevel).\nLOG        : Log related functions\nEverywhere a timezone is needed, if not specified the command is treated with firewall timezone setting\nMODIFY     : Get / loose the modify or the mon_write right\nMONITOR    : Monitor related functions\nNOP        : Do nothing but avoid disconnection from server.\nPKI        : show or update the pki\nQUIT       : Log off\nSYSTEM     : System commands\nUSER       : User related functions\nVERSION    : Display server version\n',
						format: 'raw' 
					},
					ret: '101',
					code: '00a01000',
					msg: 'Début' 
				},
				{ 
					ret: '100', 
					code: '00a00100', 
					msg: 'Ok' 
				} 
			],
			code: '100',
			msg: 'OK',
			id: 'help' 
		} 
	};
	assert.deepEqual(data, result, 'Raw format');
	
	// Render test
	ss = new StrStream(); 
	result = [
		'code="00a01000" msg="Début"\n',
		'AUTH       : User authentication\n',
		"CHPWD      : Return if it's necessary to update password or not\n",
		'CONFIG     : Firewall configuration functions\n',
		'GLOBALADMIN : Global administration\n',
		'HA         : HA functions\n',
		'HELP       : Display available commands\n',
		'LIST       : Display the list of connected users, show user rights (Level) and rights for current session (SessionLevel).\n',
		'LOG        : Log related functions\n',
		'Everywhere a timezone is needed, if not specified the command is treated with firewall timezone setting\n',
		'MODIFY     : Get / loose the modify or the mon_write right\n',
		'MONITOR    : Monitor related functions\n',
		'NOP        : Do nothing but avoid disconnection from server.\n',
		'PKI        : show or update the pki\n',
		'QUIT       : Log off\n',
		'SYSTEM     : System commands\n',
		'USER       : User related functions\n',
		'VERSION    : Display server version\n',
		'\n',
		'code="00a00100" msg="Ok"\n'
	].join('');
	netasqComm.dumpServerdObject(data.nws.serverd, ss);
	assert.equal(ss.text, result, 'Raw format render');
};
parser.write(xml);
parser.close();

