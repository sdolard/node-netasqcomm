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
parser,
xml, 
result,
ss, 
response,
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
	
	// Render test
	ss = new StrStream(); 
	result = [
		'code="00a01000" msg="Début"\n',
		'[Result]\n',
		'User=admin Address=192.168.0.1 Level=modify,mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter SessionID=1 SessionLevel=base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter\n',
		'User=log Address=10.0.0.1 Level=mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter SessionID=2 SessionLevel=base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter\n',
		'code="00a00100" msg="Ok"\n'
	].join('');
	response = sdr.create({
			data: data
	});
	response.dumpServerdData(ss);
	assert.equal(ss.text, result, 'section_line format, multiple results render');	
	
	
	// json mode
	serverdData = {
		Result: [
			{
				User: "admin", 
				Address: "192.168.0.1", 
				Level: "modify,mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter", 
				SessionID: "1", 
				SessionLevel: "base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter"
			},{
				User: "log", 
				Address: "10.0.0.1", 
				Level: "mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter", 
				SessionID: "2", 
				SessionLevel: "base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter"
		}]
	};
	jsResponse = response.serverdData();
	assert.deepEqual(jsResponse, serverdData, 'serverdData failed');
};
parser.write(xml);
parser.close();

