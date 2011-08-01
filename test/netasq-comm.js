var
assert = require('assert'),
netasqComm = require('../lib/netasq-comm'),
xml2jsparser = require('../lib/xml2jsparser'),
parser,
xml, 
result;

parser= new xml2jsparser.XML2JSParser();
parser.onerror = function (e) {
	// an error happened.
	console.log('parser.onerror e:', e);
};

// Raw format
xml = [
	'<?xml version="1.0"?>',
	'<nws code="100" msg="OK" id="help"><serverd ret="101" code="00a01000" msg="Début">',
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
	// TODO: dumpServerdDataFormat
	
};
parser.write(xml);
parser.close();


// section_line format, one result
xml = [
	'<?xml version="1.0"?>',
	'<nws code="100" msg="OK" id="li"><serverd ret="101" code="00a01000" msg="Début">',
	'<data format="section_line"><section title="Result">',
	'<line>',
	'<key name="User" value="admin"/><key name="Address" value="192.168.0.3"/><key name="Level" value="modify,mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter"/><key name="SessionID" value="9"/><key name="SessionLevel" value="modify,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter"/>',
	'</line>',
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
							line: { 
								key:[ 
									{ 
										name: 'User', 
										value: 'admin' 
									},
									{ 
										name: 'Address', 
										value: '192.168.0.3' 
									},
									{ 
										name: 'Level',
										value: 'modify,mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter' 
									},
									{ 
										name: 'SessionID', 
										value: '9' 
									},
									{ 
										name: 'SessionLevel',
										value: 'modify,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter' 
									} 
								] 
							},
							title: 'Result' 
						},
						format: 'section_line' 
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
        	id: 'li' 
        } 
    };
	assert.deepEqual(data, result, 'section_line format, one result');
	// TODO: dumpServerdDataFormat
	
};
parser.write(xml);
parser.close();


// section_line format, multiple results
xml = [
	'<?xml version="1.0"?>',
	'<nws code="100" msg="OK" id="list"><serverd ret="101" code="00a01000" msg="Début">',
	'<data format="section_line"><section title="Result">',
	'<line>',
	'<key name="User" value="admin"/>',
	'<key name="Address" value="192.168.0.1"/>',
	'<key name="Level" value="modify,mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter"/>',
	'<key name="SessionID" value="1"/>',
	'<key name="SessionLevel" value="base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter"/>',
	'</line>',
	'<line>',
	'<key name="User" value="log"/>',
	'<key name="Address" value="10.0.0.1"/>',
	'<key name="Level" value="mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter"/>',
	'<key name="SessionID" value="2"/>',
	'<key name="SessionLevel" value="base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter"/>',
	'</line>',
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
								{ 
									key: [ 
										{ 
											name: 'User', 
											value: 'admin' 
										},
										{ 
											name: 'Address', 
											value: '192.168.0.1' 
										},
										{ 
											name: 'Level',
											value: 'modify,mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter' 
										},
										{ 
											name: 'SessionID', 
											value: '1' 
										},
										{ 
											name: 'SessionLevel',
											value: 'base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter' 
										} 
									] 
								},
								{ 
									key: [ 
										{ 
											name: 'User', 
											value: 'log' 
										},
										{ 
											name: 'Address', 
											value: '10.0.0.1' 
										},
										{ 
											name: 'Level',
											value: 'mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter' 
										},
										{ 
											name: 'SessionID', 
											value: '2' 
										},
										{ 
											name: 'SessionLevel',
											value: 'base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter' 
										} 
									] 
								} 
							],
							title: 'Result' 
						},
						format: 'section_line' 
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
			id: 'list' 
		} 
	};
	assert.deepEqual(data, result, 'section_line format, multiple results');
	// TODO: dumpServerdDataFormat
	
};
parser.write(xml);
parser.close();

// line format
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
	assert.deepEqual(data, result, 'line format');
	// TODO: dumpServerdDataFormat
	
};
parser.write(xml);
parser.close();





