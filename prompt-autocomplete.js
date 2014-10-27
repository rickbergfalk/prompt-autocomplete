var charm = require('charm')();
var keypress = require('keypress');
var tty = require('tty');

var maxAutocomplete = 5;
var promptStart = "Whatchya tryna do?";
var commands = [
        'order some widgets',
        'build some widgets',
        'sell some widgets',
        'run a report',
        'run batch process',
        'restart service',
        'something else',
        'build 1 widget',
        'build 2 widgets',
        'build 3 widgets',
        'build 4 widgets',
        'build 5 widgets'
    ];
var candidates = [];

/*
var answerCallback = function () {};
function askQuestion () {
    
}
module.exports = askQuestion;
*/

/*  Stuff to get the stdout/in stuff working?
==============================================================================*/
charm.pipe(process.stdout);

if (typeof process.stdin.setRawMode == 'function') {
    process.stdin.setRawMode(true);
} else {
    tty.setRawMode(true);
}
process.stdin.resume();


/*  Super basic Regular Expression Escaper function
    Because the string we are autocompleting on might have some 
    Regular expression special characters...
==============================================================================*/
function escapeRegExp(string){
    return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
}


/*  Get Candidates function 
    Basically all the search/filter stuff for the autocomplete
    2 different methods of searching
    - first search is on entire search string. These matches take priority
    - second search is on partial search string, split on spaces
    For example, lets say users searches for "charm fun". 
    An entry that contains the string "charm fun" is a higher-scoring match. 
    However, we will also show entries that either have "charm" or "fun"
==============================================================================*/
function getCandidates (querystr) {
    candidates = [];
    if (querystr === '' || !querystr) {
        candidates = commands;
    } else {
        var escapedQueryString = escapeRegExp(querystr);
        for (var i = 0; i < commands.length; i++) {
            var command = commands[i];
            var reg = new RegExp(escapedQueryString, 'gi');
            if (reg.test(command)) {
                candidates.push(command.replace(reg, '{DELIMITER}{MATCH}{DELIMITER}$&{DELIMITER}{NOMATCH}{DELIMITER}'));
            }
        }
    }
    return candidates;
}


/*  Writing functions
==============================================================================*/
function writePrompt () {
    charm.position(1,1);
    charm.display('bright');
    charm.write(promptStart);
    charm.write(' ');
    charm.display('reset');
}
charm.reset();
charm.cursor(false);
writePrompt();


var current = '';
var selectedIndex = -1;
function writeCurrent () {
    // set charm to where user input would start
    // erase whatever input is there, and write current
    charm.position(promptStart.length + 2, 1);
    charm.erase('end');
    if (current) {
        charm.position(promptStart.length + 2, 1);
        charm.write(current);
    } 
    candidates = getCandidates(current);
    writeCandidates();
    resetSelector();
}

var subsetStart = 0;
function writeCandidates () {
    // get candidate subset, in case we are rendering candidates beyond the max
    var candidateSubset = candidates.slice(subsetStart, subsetStart + 5);
    // render the candidate subset;
    for (var i = 0; i < maxAutocomplete; i++) {
        charm.position(4, i + 2);
        charm.erase('end');
        if (candidateSubset[i]) {
            var snippets = candidateSubset[i].split('{DELIMITER}');
            for (var s = 0; s < snippets.length; s++) {
                var snippet = snippets[s];
                if (snippet === '{MATCH}') {
                    charm.display('bright');
                } else if (snippet === '{NOMATCH}') {
                    charm.display('reset');
                } else {
                    charm.write(snippet);
                }
            }
        }
    }
}

function resetSelector () {
    // erase selected, if its on the screen
    if (selectedIndex > -1) {
        charm.position(3, selectedIndex + 2);
        charm.erase('start');
    }
    if (candidates.length) {
        selectedIndex = 0;
        charm.position(1, selectedIndex + 2);
        charm.write(' > ');
    } else {
        selectedIndex = -1;
    }
}

function moveSelectorUp () {
    if (selectedIndex === 0 && subsetStart > 0) {
        subsetStart--;
        writeCandidates();
    } else {
        // if selected index exists
        // erase current selector and move selector up one 
        if (selectedIndex > -1) {
            charm.position(3, selectedIndex + 2);
            charm.erase('start');
            selectedIndex--;
        }
        //writeCandidates();
        // if someting is selected, render selector
        if (selectedIndex > -1) {
            charm.position(1, selectedIndex + 2);
            charm.write(' > ');
        }
    }
}

function moveSelectorDown () {
    if (selectedIndex == maxAutocomplete - 1 && (selectedIndex + subsetStart) < candidates.length - 1) {
        // selected index is on last autocomplete selection
        // instead of moving selection down, shift candidates and render list appropriately
        subsetStart++;
        writeCandidates();
    } else if (selectedIndex < candidates.length - 1 && selectedIndex < maxAutocomplete - 1) {
        // if selected index exists erase it
        if (selectedIndex > -1) {
            charm.position(3, selectedIndex + 2);
            charm.erase('start');
        }
        selectedIndex++;
        if (selectedIndex > -1) {
            charm.position(1, selectedIndex + 2);
            charm.write(' > ');
        }
    }
}

/*  Keypress event handling
==============================================================================*/
// make `process.stdin` begin emitting "keypress" events
keypress(process.stdin);

// listen for the "keypress" event
process.stdin.on('keypress', function (ch, key) {
    if (key && key.ctrl && key.name == 'c') {
        process.stdin.pause();
        process.exit();
    } else if (key && (key.name === 'tab' || key.name === 'left' || key.name === 'right')) {
        // do nothing. (for now... these could do things later)
    } else if (key && key.name === 'up') {
        moveSelectorUp();
    } else if (key && key.name === 'down') {
        moveSelectorDown();
    } else if (key && key.name === 'space') {
        current = current + ' ';
        writeCurrent();
    } else if (key && key.name === 'backspace') {
        current = current.slice(0, - 1);
        writeCurrent();
    } else if (key && key.name === 'return') {
        // if a candiate is selected, return that candidate
        // if only candidates are allowed and 1 candidate exists, return that candidate
        charm.reset();
        charm.position(1,1);
        charm.write(current);
        charm.position(1,3);
        process.exit();
    } else {
        // chances are this is just a regular key that should be typed to screen.
        // so add it to the input and render it
        current = current + ch;
        writeCurrent();
    }
});



