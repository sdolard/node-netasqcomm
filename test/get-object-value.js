var
assert = require('assert'),
nc = require('../lib/netasq-comm');

try { 
	getObjectValue();
} catch(e) {
	if (!e instanceof SyntaxError) {
		console.log('!e instanceof SyntaxError');
		throw e;
	}
}

try { 
	getObjectValue('');
} catch(se) {
	if (!se instanceof SyntaxError) {
		console.log('!e instanceof SyntaxError');
		throw se;
	}
}


var foo = {
	bar: 'toto'
};
assert.equal(nc.getObjectValue('bar', foo), 'toto');
try {
	getObjectValue('bar.foo', foo);
} catch(e1) {
	if (!e1 instanceof Error) {
		throw e1;
	}
}


foo = {
	bar: {
		a: 'b'
	}
};
assert.strictEqual(nc.getObjectValue('bar.a', foo), 'b');
assert.strictEqual(nc.getObjectValue('bar', foo), foo.bar);
