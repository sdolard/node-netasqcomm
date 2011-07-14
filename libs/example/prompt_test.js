var prompt = require('../prompt').prompt;


prompt(">", 'default response', false, function(error, value) {
		console.log(value);
		prompt("silent>", 'another default reponse', true, function(error, value) {
				console.log(value);
		});
});


