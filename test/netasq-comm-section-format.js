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
};

parser = xml2jsparser.create();
parser.onerror = function (e) {
	// an error happened.
	console.log('parser.onerror e:', e);
};


// section format
xml = [
	'<?xml version="1.0"?>',
	'<nws code="100" msg="OK" id="system prop"><serverd ret="101" code="00a01000" msg="Début">',
	'<data format="section"><section title="Result">',
	'<key name="Type" value="Firewall"/>',
	'<key name="Model" value="U70-A"/>',
	'<key name="Version" value="9.0.0"/>',
	'<key name="ASQVersion" value="5.0.0"/>',
	'<key name="SerialNumber" value="U70XXA9M1000019"/>',
	'<key name="MTUmax" value="8996"/>',
	'<key name="Bridge" value="4"/>',
	'<key name="Ethernet" value="6"/>',
	'<key name="VLAN" value="32"/>',
	'<key name="WIFI" value="0"/>',
	'<key name="Dialup" value="4"/>',
	'<key name="PPTP" value="16"/>',
	'<key name="Serial" value="0"/>',
	'<key name="Loopback" value="7"/>',
	'<key name="Watchdog" value="0"/>',
	'<key name="Led" value="0"/>',
	'<key name="Clone" value="1"/>',
	'<key name="HADialup" value="1"/>',
	'<key name="Raid" value="0"/>',
	'<key name="Antiviral" value="1"/>',
	'<key name="HighAvail" value="1"/>',
	'<key name="Usb" value="1"/>',
	'<key name="SwitchPort" value="6"/>',
	'<key name="CryptoCard" value="0"/>',
	'<key name="NTP" value="1"/>',
	'<key name="PostprocMaxSize" value="11287"/>',
	'</section></data></serverd>',
	'<serverd ret="100" code="00a00100" msg="Ok"></serverd></nws>'
].join('');
parser.ondone = function (data) {
	result = { 
		nws: { 
			serverd: [ 
				{ 
					data: { 
						section: { 
							key: [ 
								{ 
									name: 'Type', 
									value: 'Firewall' 
								},
								{ 
									name: 'Model', 
									value: 'U70-A' 
								},
								{ 
									name: 'Version', 
									value: '9.0.0' 
								},
								{ 
									name: 'ASQVersion', 
									value: '5.0.0' 
								},
								{ 
									name: 'SerialNumber', 
									value: 'U70XXA9M1000019' 
								},
								{ 
									name: 'MTUmax', 
									value: '8996' 
								},
								{ 
									name: 'Bridge', 
									value: '4' 
								},
								{ 
									name: 'Ethernet', 
									value: '6' 
								},
								{ 
									name: 'VLAN', 
									value: '32' 
								},
								{ 
									name: 'WIFI', 
									value: '0' 
								},
								{ 
									name: 'Dialup', 
									value: '4' 
								},
								{ 
									name: 'PPTP', 
									value: '16' 
								},
								{ 
									name: 'Serial', 
									value: '0' 
								},
								{ 
									name: 'Loopback', 
									value: '7' 
								},
								{ 
									name: 'Watchdog', 
									value: '0' 
								},
								{ 
									name: 'Led', 
									value: '0' 
								},
								{ 
									name: 'Clone', 
									value: '1' 
								},
								{ 
									name: 'HADialup', 
									value: '1' 
								},
								{ 
									name: 'Raid', 
									value: '0' 
								},
								{ 
									name: 'Antiviral', 
									value: '1' 
								},
								{ 
									name: 'HighAvail', 
									value: '1' 
								},
								{ 
									name: 'Usb', 
									value: '1' 
								},
								{ 
									name: 'SwitchPort', 
									value: '6' 
								},
								{ 
									name: 'CryptoCard', 
									value: '0' 
								},
								{ 
									name: 'NTP', 
									value: '1' 
								},
								{ 
									name: 'PostprocMaxSize', 
									value: '11287' 
								} 
							],
							title: 'Result' 
						},
						format: 'section' 
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
			id: 'system prop' 
		} 
	};
	assert.deepEqual(data, result, 'section format');
	
	// Render test
	ss = new StrStream(); 
	result = [
		'code="00a01000" msg="Début"\n',
		'[Result]\n',
		'Type=Firewall\n',
		'Model=U70-A\n',
		'Version=9.0.0\n',
		'ASQVersion=5.0.0\n',
		'SerialNumber=U70XXA9M1000019\n',
		'MTUmax=8996\n',
		'Bridge=4\n',
		'Ethernet=6\n',
		'VLAN=32\n',
		'WIFI=0\n',
		'Dialup=4\n',
		'PPTP=16\n',
		'Serial=0\n',
		'Loopback=7\n',
		'Watchdog=0\n',
		'Led=0\n',
		'Clone=1\n',
		'HADialup=1\n',
		'Raid=0\n',
		'Antiviral=1\n',
		'HighAvail=1\n',
		'Usb=1\n',
		'SwitchPort=6\n',
		'CryptoCard=0\n',
		'NTP=1\n',
		'PostprocMaxSize=11287\n',
		'code="00a00100" msg="Ok"\n'
	].join('');
	
	netasqComm.dumpServerdObject(data.nws.serverd, ss);
	assert.equal(ss.text, result, 'section format render');
};
parser.write(xml);
parser.close();



