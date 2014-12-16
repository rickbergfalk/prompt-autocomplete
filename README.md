# prompt-autocomplete

prompt-autocomplete is a Node.js module that provides a terminal prompt with autocomplete-like functionality. 



## Usage

```js
var ask = require('prompt-autocomplete');

var states = [
        'Alabama',
        'Alaska',
        // all the states...
        'Wisconsin',
        'Wyoming'
    ];

ask("Pick a state:", states, function (err, answer) {
    console.log("You picked " + answer);
});
```

gives you this:

![Alt text](demo.gif?raw=true "prompt-autocomplete demo")



## Contributing & Future of this Module

I built this module for fun and as a challenge for myself. I am not actively using it for anything yet, which means **I have little intention on supporting it.** That may change of course if I find myself using it for something. 

That said, I will take any pull requests for any bug fixes or new features. 



## Installation

```
npm install prompt-autocomplete
```



## License 

MIT
