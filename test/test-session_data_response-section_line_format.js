/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
// node
assert = require('assert'),

// libs
netasqComm = require('../lib/netasqcomm'),
xml2jsparser = require('../lib/xml2jsparser'),
sdr = require('../lib/session_data_response'),

StrStream = (function () {
	function StrStream() {
		this.text = '';
	}
	StrStream.prototype.write = function(s) {
		this.text += s;
	};
	return StrStream;
}());

describe('Firewall section_line format', function(){
	it('should parse xml section_line format', function(done){
		var
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
			var
			ss = new StrStream(),
			response;

			assert.deepEqual(data, {
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
			});


			response = sdr.create({
					data: data
			});
			response.dumpServerdData(ss);
			assert.equal(ss.text, [
				'code="00a01000" msg="D√©but"\n',
				'[Result]\n',
				'User=admin Address=192.168.0.3 Level=modify,mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter SessionID=9 SessionLevel=modify,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter\n',
				'code="00a00100" msg="Ok"\n'
			].join(''));


			assert.deepEqual(response.serverdData(),  {
				Result: [{
						User: "admin",
						Address: "192.168.0.3",
						Level: "modify,mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter",
						SessionID: "9",
						SessionLevel: "modify,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter"
				}]
			});

			done();
		};
		parser.write(xml);
		parser.close();
	});


	it ('should parsing xml section_line format with multiple results', function(done){
		var
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
			var
			ss = new StrStream(),
			response;

			assert.deepEqual(data, {
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
			});

			response = sdr.create({
					data: data
			});
			response.dumpServerdData(ss);
			assert.equal(ss.text, [
				'code="00a01000" msg="D√©but"\n',
				'[Result]\n',
				'User=admin Address=192.168.0.1 Level=modify,mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter SessionID=1 SessionLevel=base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter\n',
				'User=log Address=10.0.0.1 Level=mon_write,base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter SessionID=2 SessionLevel=base,contentfilter,log,filter,vpn,log_read,pki,object,user,admin,network,route,maintenance,asq,pvm,vpn_read,filter_read,globalobject,globalfilter\n',
				'code="00a00100" msg="Ok"\n'
			].join(''));

			assert.deepEqual(response.serverdData(), {
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
			});

			done();
		};
		parser.write(xml);
		parser.close();
	});
});
