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
xml2jsparser = require('../lib/xml2jsparser'),
sdr = require('../lib/session_data_response'),
vm = require('vm'),
parser,
xml, 
result,
ss,
response,
serverdData,
jsResponse,
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


// list format
xml = [
	'<?xml version="1.0"?>',
	'<nws code="100" msg="OK" id="config filter explicit type=filter useclone=1  index=9"><serverd ret="101" code="00a01000" msg="Début">',
	'<data format="list"><section title="Filter">', 
	'<line>position=1; ruleid=1: pass log from any to firewall_all port firewall_srv|https # Admin from everywhere</line>',
	'<line>position=2; ruleid=2: pass from Network_internals to Network_internals # réseau interne (cf switch)</line>',
	'<line>position=3; ruleid=3: off decrypt inspection ips sslfiltering:0 from Network_internals to internet</line>',
	'<line>position=4; ruleid=4: pass inspection ips mailfiltering:0,urlfiltering:0,ftpfiltering,antispam,antivirus log from Network_internals to internet</line>',
	'<line>position=5; ruleid=5: block from any to any # Block all</line>',
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
							line: [ 
								'position=1; ruleid=1: pass log from any to firewall_all port firewall_srv|https # Admin from everywhere',
								'position=2; ruleid=2: pass from Network_internals to Network_internals # réseau interne (cf switch)',
								'position=3; ruleid=3: off decrypt inspection ips sslfiltering:0 from Network_internals to internet',
								'position=4; ruleid=4: pass inspection ips mailfiltering:0,urlfiltering:0,ftpfiltering,antispam,antivirus log from Network_internals to internet',
								'position=5; ruleid=5: block from any to any # Block all' 
							],
							title: 'Filter' 
						},
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
				} 
			],
			code: '100',
			msg: 'OK',
			id: 'config filter explicit type=filter useclone=1  index=9' 
		} 
	};
	assert.deepEqual(data, result, 'list format');
	
	// ini mode
	ss = new StrStream(); 
	result = [
		'code="00a01000" msg="Début"\n', 
		'[Filter]\n',
		'position=1; ruleid=1: pass log from any to firewall_all port firewall_srv|https # Admin from everywhere\n',
		'position=2; ruleid=2: pass from Network_internals to Network_internals # réseau interne (cf switch)\n',
		'position=3; ruleid=3: off decrypt inspection ips sslfiltering:0 from Network_internals to internet\n',
		'position=4; ruleid=4: pass inspection ips mailfiltering:0,urlfiltering:0,ftpfiltering,antispam,antivirus log from Network_internals to internet\n',
		'position=5; ruleid=5: block from any to any # Block all\n',
		'code="00a00100" msg="Ok"\n'
	].join('');
	response = sdr.create({
		data: data
	});
	response.dumpServerdData(ss, 'ini');
	assert.equal(ss.text, result, 'list format render');
	
	
	// serverdData
	serverdData = {
		Filter: [ 
			'position=1; ruleid=1: pass log from any to firewall_all port firewall_srv|https # Admin from everywhere',
			'position=2; ruleid=2: pass from Network_internals to Network_internals # réseau interne (cf switch)',
			'position=3; ruleid=3: off decrypt inspection ips sslfiltering:0 from Network_internals to internet',
			'position=4; ruleid=4: pass inspection ips mailfiltering:0,urlfiltering:0,ftpfiltering,antispam,antivirus log from Network_internals to internet',
			'position=5; ruleid=5: block from any to any # Block all' 
		] 
	};
	jsResponse = response.serverdData();
	assert.deepEqual(jsResponse, serverdData, 'serverdData failed');
	
};
parser.write(xml);
parser.close();


