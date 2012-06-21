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
exports.suite1 =  vows.describe('Firewall section_line format').addBatch({
		'when parsing xml section_line format': {
			topic: function () { 
				var
				promise = new EventEmitter(),
				parser = xml2jsparser.create(),
				xml = [
					'<?xml version="1.0"?>',
					'<nws code="100" msg="OK" id="li"><serverd ret="101" code="00a01000" msg="D√©but">',
					'<data format="section_line"><section title="Result">',
					'<line>',
					'<key name="User" value="admin"/><key name="Address" value="192.168.0.3"/><key name="Level" value="modify,mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter"/><key name="SessionID" value="9"/><key name="SessionLevel" value="modify,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter"/>',
					'</line>',
					'</section></data></serverd>',
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
						id: 'li' 
					} 
				};
				assert.deepEqual(topic, result);
			},
			'Render test succeed': function (topic) {
				var 
				ss = new StrStream(),
				result = [
					'code="00a01000" msg="D√©but"\n',
					'[Result]\n',
					'User=admin Address=192.168.0.3 Level=modify,mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter SessionID=9 SessionLevel=modify,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter\n',
					'code="00a00100" msg="Ok"\n'
				].join(''),
				response = sdr.create({
						data: topic
				});
				response.dumpServerdData(ss);
				assert.equal(ss.text, result);
			},
			'serverData() format is valid': function (topic) {
				var serverdData = {
					Result: [{
							User: "admin", 
							Address: "192.168.0.3", 
							Level: "modify,mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter", 
							SessionID: "9", 
							SessionLevel: "modify,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter"
					}]
				},
				response = sdr.create({
						data: topic
				}),
				jsResponse = response.serverdData();
				assert.deepEqual(jsResponse, serverdData);
			}
		},
		'when parsing xml section_line format with multiple results': {
			topic: function () { 
				var
				promise = new EventEmitter(),
				parser = xml2jsparser.create(),
				xml = [
					'<?xml version="1.0"?>',
					'<nws code="100" msg="OK" id="list"><serverd ret="101" code="00a01000" msg="D√©but">',
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
						id: 'list' 
					} 
				};
				assert.deepEqual(topic, result);
			},
			'Render test succeed': function (topic) {
				var 
				ss = new StrStream(),
				result = [
					'code="00a01000" msg="D√©but"\n',
					'[Result]\n',
					'User=admin Address=192.168.0.1 Level=modify,mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter SessionID=1 SessionLevel=base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter\n',
					'User=log Address=10.0.0.1 Level=mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter SessionID=2 SessionLevel=base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter\n',
					'code="00a00100" msg="Ok"\n'
				].join(''),
				response = sdr.create({
						data: topic
				});
				response.dumpServerdData(ss);
				assert.equal(ss.text, result);
			},
			'serverData() format is valid': function (topic) {
				var serverdData = {
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
				},
				response = sdr.create({
						data: topic
				}),
				jsResponse = response.serverdData();
				assert.deepEqual(jsResponse, serverdData);
			}
		}
});


