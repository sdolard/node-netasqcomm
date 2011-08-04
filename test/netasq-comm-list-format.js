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

parser = new xml2jsparser.XML2JSParser();
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
	
	// Render test
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
	netasqComm.dumpServerdObject(data.nws.serverd, ss);
	assert.equal(ss.text, result, 'list format render');
};
parser.write(xml);
parser.close();


