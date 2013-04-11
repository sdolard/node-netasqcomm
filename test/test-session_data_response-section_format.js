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

describe ('Firewall section format',function(){
	it('should', function(done){
		var
		parser = xml2jsparser.create(),
		response,
		xml = [
			'<?xml version="1.0"?>',
			'<nws code="100" msg="OK" id="system prop"><serverd ret="101" code="00a01000" msg="D√©but">',
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
			var
			ss = new StrStream();

			assert.deepEqual(data, {
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
					id: 'system prop'
				}
			});

			response = sdr.create({
					data: data
			});
			response.dumpServerdData(ss);
			assert.equal(ss.text, [
				'code="00a01000" msg="D√©but"\n',
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
			].join(''));


			assert.deepEqual(response.serverdData(), {
				Result: {
					Type: 'Firewall',
					Model: 'U70-A',
					Version: '9.0.0',
					ASQVersion: '5.0.0',
					SerialNumber: 'U70XXA9M1000019',
					MTUmax: '8996',
					Bridge: '4',
					Ethernet: '6',
					VLAN: '32',
					WIFI: '0',
					Dialup: '4',
					PPTP: '16',
					Serial: '0',
					Loopback: '7',
					Watchdog: '0',
					Led: '0',
					Clone: '1',
					HADialup: '1',
					Raid: '0',
					Antiviral: '1',
					HighAvail: '1',
					Usb: '1',
					SwitchPort: '6',
					CryptoCard: '0',
					NTP: '1',
					PostprocMaxSize: '11287'
				}
			});

			done();

		};
		parser.write(xml);
		parser.close();
	});
});

/*
exports.suite1 =  vows.describe('Firewall section format').addBatch({
		'when parsing xml section format': {
			topic: function () {

			},
			'it succeed': function (topic) {

			},
			'Render test succeed': function (topic) {

			},
			'serverData() format is valid': function (topic) {

			}
		}
});
*/

