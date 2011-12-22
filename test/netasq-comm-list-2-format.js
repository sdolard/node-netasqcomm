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


// list format
xml = [
	'<?xml version="1.0"?>',
	'<nws code="100" msg="OK" id="config secure list">',
	'<serverd ret="101" code="00a01000" msg="Début">',
	'<data format="list">',
	'<section title="network">',
	'<line>/usr/Firewall/ConfigFiles/network</line>',
	'<line>/usr/Firewall/ConfigFiles/object</line>',
	'<line>/usr/Firewall/ConfigFiles/Global/object</line>',
	'<line>/usr/Firewall/ConfigFiles/pptpserver</line>',
	'<line>/usr/Firewall/ConfigFiles/route</line>',
	'</section>',
	'<section title="ha">',
	'<line>/usr/Firewall/ConfigFiles/HA/highavailability</line>',
	'</section>',
	'<section title="vpn">',
	'<line>/usr/Firewall/ConfigFiles/VPN/00</line>',
	'<line>/usr/Firewall/ConfigFiles/VPN/01</line>',
	'<line>/usr/Firewall/ConfigFiles/VPN/02</line>',
	'<line>/usr/Firewall/ConfigFiles/VPN/03</line>',
	'<line>/usr/Firewall/ConfigFiles/VPN/04</line>',
	'<line>/usr/Firewall/ConfigFiles/VPN/05</line>',
	'<line>/usr/Firewall/ConfigFiles/VPN/06</line>',
	'<line>/usr/Firewall/ConfigFiles/VPN/07</line>',
	'<line>/usr/Firewall/ConfigFiles/VPN/08</line>',
	'<line>/usr/Firewall/ConfigFiles/VPN/09</line>',
	'<line>/usr/Firewall/ConfigFiles/VPN/10</line>',
	'<line>/usr/Firewall/ConfigFiles/VPN/ca</line>',
	'<line>/usr/Firewall/ConfigFiles/VPN/peer</line>',
	'<line>/usr/Firewall/ConfigFiles/VPN/ph1profile</line>',
	'<line>/usr/Firewall/ConfigFiles/VPN/ph2profile</line>',
	'<line>/usr/Firewall/ConfigFiles/VPN/psk</line>',
	'<line>/usr/Firewall/ConfigFiles/VPN/slotinfo</line>',
	'</section>',
	'<section title="ldap">',
	'<line>/usr/Firewall/ConfigFiles/ldap</line>',
	'</section>',
	'<section title="auth">',
	'<line>/usr/Firewall/ConfigFiles/auth</line>',
	'<line>/usr/Firewall/ConfigFiles/krb5.keytab</line>',
	'</section>',
	'<section title="xvpn">',
	'<line>/usr/Firewall/ConfigFiles/XVPN/httpserver</line>',
	'<line>/usr/Firewall/ConfigFiles/XVPN/profile</line>',
	'<line>/usr/Firewall/ConfigFiles/XVPN/xserver</line>',
	'<line>/usr/Firewall/ConfigFiles/XVPN/xvpn</line>',
	'</section>',
	'<section title="pki">',
	'<line>/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.cert.pem</line>',
	'<line>/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.conf</line>',
	'<line>/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.db</line>',
	'<line>/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.pkey.pem</line>',
	'<line>/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.revokation</line>',
	'<line>/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.serial</line>',
	'<line>/usr/Firewall/ConfigFiles/Certificates/pending.req</line>',
	'<line>/usr/Firewall/ConfigFiles/Certificates/pki.conf</line>',
	'<line>/usr/Firewall/ConfigFiles/Certificates/selfsigned.db</line>',
	'</section>',
	'<section title="ntp">',
	'<line>/usr/Firewall/ConfigFiles/ntp</line>',
	'</section>',
	'<section title="snmp">',
	'<line>/usr/Firewall/ConfigFiles/snmp</line>',
	'</section>',
	'</data></serverd>',
	'<serverd ret="100" code="00a00100" msg="Ok"></serverd></nws>'
].join('');
parser.ondone = function (data) {
	result = { 
		nws: { 
			serverd: [ { 
					data: { 
						section: [ 
							{ 
								line: [ 
									'/usr/Firewall/ConfigFiles/network',
									'/usr/Firewall/ConfigFiles/object',
									'/usr/Firewall/ConfigFiles/Global/object',
									'/usr/Firewall/ConfigFiles/pptpserver',
									'/usr/Firewall/ConfigFiles/route' 
								],
								title: 'network' 
							},
							{ 
								line: '/usr/Firewall/ConfigFiles/HA/highavailability',
								title: 'ha' 
							},
							{ 
								line: [ 
									'/usr/Firewall/ConfigFiles/VPN/00',
									'/usr/Firewall/ConfigFiles/VPN/01',
									'/usr/Firewall/ConfigFiles/VPN/02',
									'/usr/Firewall/ConfigFiles/VPN/03',
									'/usr/Firewall/ConfigFiles/VPN/04',
									'/usr/Firewall/ConfigFiles/VPN/05',
									'/usr/Firewall/ConfigFiles/VPN/06',
									'/usr/Firewall/ConfigFiles/VPN/07',
									'/usr/Firewall/ConfigFiles/VPN/08',
									'/usr/Firewall/ConfigFiles/VPN/09',
									'/usr/Firewall/ConfigFiles/VPN/10',
									'/usr/Firewall/ConfigFiles/VPN/ca',
									'/usr/Firewall/ConfigFiles/VPN/peer',
									'/usr/Firewall/ConfigFiles/VPN/ph1profile',
									'/usr/Firewall/ConfigFiles/VPN/ph2profile',
									'/usr/Firewall/ConfigFiles/VPN/psk',
									'/usr/Firewall/ConfigFiles/VPN/slotinfo' 
								],
								title: 'vpn' 
							},
							{ 
								line: '/usr/Firewall/ConfigFiles/ldap',
								title: 'ldap' 
							},
							{ 
								line: [ 
									'/usr/Firewall/ConfigFiles/auth',
									'/usr/Firewall/ConfigFiles/krb5.keytab' 
								],
								title: 'auth' 
							},
							{ 
								line: [ 
									'/usr/Firewall/ConfigFiles/XVPN/httpserver',
									'/usr/Firewall/ConfigFiles/XVPN/profile',
									'/usr/Firewall/ConfigFiles/XVPN/xserver',
									'/usr/Firewall/ConfigFiles/XVPN/xvpn' 
								],
								title: 'xvpn' 
							},
							{ 
								line: [ 
									'/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.cert.pem',
									'/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.conf',
									'/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.db',
									'/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.pkey.pem',
									'/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.revokation',
									'/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.serial',
									'/usr/Firewall/ConfigFiles/Certificates/pending.req',
									'/usr/Firewall/ConfigFiles/Certificates/pki.conf',
									'/usr/Firewall/ConfigFiles/Certificates/selfsigned.db' 
								],
								title: 'pki' 
							},
							{ 
								line: '/usr/Firewall/ConfigFiles/ntp',
								title: 'ntp' 
							},
							{ 
								line: '/usr/Firewall/ConfigFiles/snmp',
								title: 'snmp' 
						}],
						format: 'list' 
					},
					ret: '101',
					code: '00a01000',
					msg: 'Début' 
			},
			{ 
				ret: '100', 
				code: '00a00100', 
				msg: 'Ok' 
			}],
			code: '100',
			msg: 'OK',
			id: 'config secure list' 
		} 
	};
	assert.deepEqual(data, result, 'list format');
	
	// Render test
	ss = new StrStream(); 
	result = [
		'code="00a01000" msg="Début"\n',
		'[network]\n',
		'/usr/Firewall/ConfigFiles/network\n',
		'/usr/Firewall/ConfigFiles/object\n',
		'/usr/Firewall/ConfigFiles/Global/object\n',
		'/usr/Firewall/ConfigFiles/pptpserver\n',
		'/usr/Firewall/ConfigFiles/route\n',
		'[ha]\n',
		'/usr/Firewall/ConfigFiles/HA/highavailability\n',
		'[vpn]\n',
		'/usr/Firewall/ConfigFiles/VPN/00\n',
		'/usr/Firewall/ConfigFiles/VPN/01\n',
		'/usr/Firewall/ConfigFiles/VPN/02\n',
		'/usr/Firewall/ConfigFiles/VPN/03\n',
		'/usr/Firewall/ConfigFiles/VPN/04\n',
		'/usr/Firewall/ConfigFiles/VPN/05\n',
		'/usr/Firewall/ConfigFiles/VPN/06\n',
		'/usr/Firewall/ConfigFiles/VPN/07\n',
		'/usr/Firewall/ConfigFiles/VPN/08\n',
		'/usr/Firewall/ConfigFiles/VPN/09\n',
		'/usr/Firewall/ConfigFiles/VPN/10\n',
		'/usr/Firewall/ConfigFiles/VPN/ca\n',
		'/usr/Firewall/ConfigFiles/VPN/peer\n',
		'/usr/Firewall/ConfigFiles/VPN/ph1profile\n',
		'/usr/Firewall/ConfigFiles/VPN/ph2profile\n',
		'/usr/Firewall/ConfigFiles/VPN/psk\n',
		'/usr/Firewall/ConfigFiles/VPN/slotinfo\n',
		'[ldap]\n',
		'/usr/Firewall/ConfigFiles/ldap\n',
		'[auth]\n',
		'/usr/Firewall/ConfigFiles/auth\n',
		'/usr/Firewall/ConfigFiles/krb5.keytab\n',
		'[xvpn]\n',
		'/usr/Firewall/ConfigFiles/XVPN/httpserver\n',
		'/usr/Firewall/ConfigFiles/XVPN/profile\n',
		'/usr/Firewall/ConfigFiles/XVPN/xserver\n',
		'/usr/Firewall/ConfigFiles/XVPN/xvpn\n',
		'[pki]\n',
		'/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.cert.pem\n',
		'/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.conf\n',
		'/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.db\n',
		'/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.pkey.pem\n',
		'/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.revokation\n',
		'/usr/Firewall/ConfigFiles/Certificates/SSL proxy default authority/CA.serial\n',
		'/usr/Firewall/ConfigFiles/Certificates/pending.req\n',
		'/usr/Firewall/ConfigFiles/Certificates/pki.conf\n',
		'/usr/Firewall/ConfigFiles/Certificates/selfsigned.db\n',
		'[ntp]\n',
		'/usr/Firewall/ConfigFiles/ntp\n',
		'[snmp]\n',
		'/usr/Firewall/ConfigFiles/snmp\n',
		'code="00a00100" msg="Ok"\n'
	].join('');
	netasqComm.dumpServerdObject(data.nws.serverd, ss);
	assert.equal(ss.text, result, 'list format 2 render');
};
parser.write(xml);
parser.close();


