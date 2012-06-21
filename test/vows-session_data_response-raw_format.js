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
// node
assert = require('assert'),
EventEmitter = require('events').EventEmitter,

// contrib 
vows = require('vows'),

// libs
netasqComm = require('../lib/netasqcomm'),
xml2jsparser = require('../lib/xml2jsparser'),
sdr = require('../lib/session_data_response'),

// gvar
StrStream = function() {
	this.text = '';
};

StrStream.prototype.write = function(s) {
	this.text += s;
};
exports.suite1 =  vows.describe('Firewall raw format').addBatch({
		'when parsing xml raw format': {
			topic: function () { 
				var
				promise = new EventEmitter(),
				parser = xml2jsparser.create(),
				xml = [
					'<?xml version="1.0"?>',
					'<nws code="100" msg="OK" id="help">',
					'<serverd ret="101" code="00a01000" msg="D√©but">',
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
					promise.emit('success', data);
				};
				parser.write(xml);
				parser.close();
				return promise;
			},
			'it succeed': function (topic) {
				var result = { 
					nws: { 
						serverd: [ 
							{ 
								data: { 
									cdata: 'AUTH       : User authentication\nCHPWD      : Return if it\'s necessary to update password or not\nCONFIG     : Firewall configuration functions\nGLOBALADMIN : Global administration\nHA         : HA functions\nHELP       : Display available commands\nLIST       : Display the list of connected users, show user rights (Level) and rights for current session (SessionLevel).\nLOG        : Log related functions\nEverywhere a timezone is needed, if not specified the command is treated with firewall timezone setting\nMODIFY     : Get / loose the modify or the mon_write right\nMONITOR    : Monitor related functions\nNOP        : Do nothing but avoid disconnection from server.\nPKI        : show or update the pki\nQUIT       : Log off\nSYSTEM     : System commands\nUSER       : User related functions\nVERSION    : Display server version\n',
									format: 'raw' 
								},
								ret: '101',
								code: '00a01000',
								msg: 'D√©but' 
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
				assert.deepEqual(topic, result);
			},
			'Render test succeed': function (topic) {
				var 
				ss = new StrStream(),
				result = [
					'code="00a01000" msg="D√©but"\n',
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
				].join(''),
				response = sdr.create({
						data: topic
				});
				response.dumpServerdData(ss);
				assert.equal(ss.text, result);
			},
			'serverData() format is valid': function (topic) {
				var serverdData = { rawData: 'AUTH       : User authentication\nCHPWD      : Return if it\'s necessary to update password or not\nCONFIG     : Firewall configuration functions\nGLOBALADMIN : Global administration\nHA         : HA functions\nHELP       : Display available commands\nLIST       : Display the list of connected users, show user rights (Level) and rights for current session (SessionLevel).\nLOG        : Log related functions\nEverywhere a timezone is needed, if not specified the command is treated with firewall timezone setting\nMODIFY     : Get / loose the modify or the mon_write right\nMONITOR    : Monitor related functions\nNOP        : Do nothing but avoid disconnection from server.\nPKI        : show or update the pki\nQUIT       : Log off\nSYSTEM     : System commands\nUSER       : User related functions\nVERSION    : Display server version\n' },
				response = sdr.create({
						data: topic
				}),
				jsResponse = response.serverdData();
				assert.deepEqual(jsResponse, serverdData);
			}
		}
});


