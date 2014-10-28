var ask = require('./prompt-autocomplete.js');

ask({}, function (err, answer) {
    console.log(answer);
    ask({}, function (err, answer) {
        console.log(answer);
    })
});