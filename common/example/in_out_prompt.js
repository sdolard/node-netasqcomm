var
sdlib = require('./sdlib'),
i = 0,
ip , ID_IP=i,
login, ID_LOGIN=++i,
pwd, ID_PWD=++i,
MAX_STATE = i,
state = ID_IP;

function prompt(ID) {
	switch(ID)
	{
	case ID_IP: 
		process.stdout.write('You want to connect to:');
		break;
	case ID_LOGIN: 
		process.stdout.write('login:');
		break;
	case ID_PWD: 
		process.stdout.write('password:');
		break;
	}
}

function connect() {
	process.stdout.write('Connecting to ');
 	process.stdout.write(sdlib.strTrim(ip));
 	process.stdout.write(' as ');
 	process.stdout.write(sdlib.strTrim(login));
 	process.stdout.write('...\n');
}

process.on('SIGINT', function () {
  console.log('Got SIGINT.  Press Control-D to exit.');
});
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function (chunk) {
		switch(state)
		{
		case ID_IP: 
			ip = chunk;
			prompt(ID_LOGIN);
			break;
			
		case ID_LOGIN: 
			login = chunk;
			prompt(ID_PWD);
			break;
			
		case ID_PWD: 
			pwd = chunk;
			process.stdin.pause();
			connect();
			break;
		}
		state++;
		if (state > MAX_STATE) {
			state = 0;
		}		
});

prompt(ID_IP);


