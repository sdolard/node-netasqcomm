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


describe('Firewall raw format', function(){
	it('should parse xml', function(done){
		var
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
			var
			ss = new StrStream(),
			response = sdr.create({
				data: data
			}),
			serverdData = { rawData: 'AUTH       : User authentication\nCHPWD      : Return if it\'s necessary to update password or not\nCONFIG     : Firewall configuration functions\nGLOBALADMIN : Global administration\nHA         : HA functions\nHELP       : Display available commands\nLIST       : Display the list of connected users, show user rights (Level) and rights for current session (SessionLevel).\nLOG        : Log related functions\nEverywhere a timezone is needed, if not specified the command is treated with firewall timezone setting\nMODIFY     : Get / loose the modify or the mon_write right\nMONITOR    : Monitor related functions\nNOP        : Do nothing but avoid disconnection from server.\nPKI        : show or update the pki\nQUIT       : Log off\nSYSTEM     : System commands\nUSER       : User related functions\nVERSION    : Display server version\n' };

			assert.deepEqual(data, {
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
			});

			response.dumpServerdData(ss);
			assert.equal(ss.text, [
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
			].join(''));

			assert.deepEqual(response.serverdData(), serverdData);

			done();
		};
		parser.write(xml);
		parser.close();
	});
});
