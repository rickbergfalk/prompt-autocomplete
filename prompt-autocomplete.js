var charm = require('charm')();
var keypress = require('keypress');
var tty = require('tty');

module.exports = askQuestion;

function askQuestion () {
    // 1st arg is prompt question text
    // 2nd is selection items
    // 3rd will either be configuration, or a callback
    // 4th will be a callback, if 3rd is configuration
    var promptStart = arguments[0];
    var items = arguments[1];
    var config = (typeof arguments[2] == 'function' ? {} : arguments[2] || {});
    var answerCallback = (typeof arguments[2] == 'function' ? arguments[2] : arguments[3]);
    var maxAutocomplete = config.maxAutocomplete || process.stdout.rows - 2;
    var highlightMode = config.highlightMode || "bright";
    var candidates = [];
    
    if (!promptStart) throw new Error("Prompt question is a required");
    if (!items) throw new Error("Array of items is a required");
    if (!answerCallback) throw new Error("A callback is required");
    
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
            for (var i = 0; i < items.length; i++) {
                candidates.push({text: items[i], matched: items[i]});
            }
        } else {
            var splitQueryString = querystr.split(" ");
            var escapedQueryString = escapeRegExp(querystr);
            for (var x = 0; x < items.length; x++) {
                var item = items[x];
                // if item matches full query string, push it to the list of 
                // candidates. 
                // if not, test on partials
                var reg = new RegExp(escapedQueryString, 'gi');
                if (reg.test(item)) {
                    candidates.push({
                        text: item,
                        matched: item.replace(reg, '{DELIMITER}{MATCH}{DELIMITER}$&{DELIMITER}{NOMATCH}{DELIMITER}')
                    });
                } else {
                    // escape each piece of the split query string
                    // then join together with pipes
                    // and then do a test/replace on that
                    var escapedSplitQueryString = "";
                    splitQueryString.forEach(function(qs) {
                        var escaped = escapeRegExp(qs);
                        if (escapedSplitQueryString) escapedSplitQueryString = escapedSplitQueryString + "|" + escaped;
                        else escapedSplitQueryString = escaped;
                    });
                    var splitReg = new RegExp(escapedSplitQueryString, 'gi');
                    if (splitReg.test(item)) {
                        candidates.push({
                            text: item,
                            matched: item.replace(splitReg, '{DELIMITER}{MATCH}{DELIMITER}$&{DELIMITER}{NOMATCH}{DELIMITER}')
                        });
                    }
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
        resetSelector();
        writeCandidates();
        
    }
    
    var subsetStart = 0;
    var candidateSubset = [];
    function writeCandidates () {
        // get candidate subset, in case we are rendering candidates beyond the max
        candidateSubset = candidates.slice(subsetStart, subsetStart + maxAutocomplete);
        // render the candidate subset;
        for (var i = 0; i < maxAutocomplete; i++) {
            charm.position(4, i + 2);
            charm.erase('end');
            if (candidateSubset[i]) {
                var snippets = candidateSubset[i].matched.split('{DELIMITER}');
                for (var s = 0; s < snippets.length; s++) {
                    var snippet = snippets[s];
                    if (snippet === '{MATCH}') {
                        charm.display(highlightMode);
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
        subsetStart = 0;
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
    process.stdin.on('keypress', function onKeypress (ch, key) {
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
            // otherwise do nothing
            if (candidateSubset[selectedIndex] && candidateSubset[selectedIndex].text) {
                charm.position(1, maxAutocomplete + 3);
                charm.cursor(true);
                process.stdin.setRawMode(false);
                process.stdin.pause();
                charm.end();
                process.stdin.removeListener('keypress', onKeypress);
                answerCallback(null, candidateSubset[selectedIndex].text);
            }
            
        } else {
            // chances are this is just a regular key that should be typed to screen.
            // so add it to the input and render it
            current = current + ch;
            writeCurrent();
        }
    });
    
    writeCurrent();
}
