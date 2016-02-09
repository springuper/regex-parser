'use strict';

var State = require('./state');
var util = require('./util');
var debug = require('debug')('regex-parser');

var CONCAT_CHAR = String.fromCharCode(8);

module.exports = Parser;

function Parser(pattern) {
    this.NFATable = [];
    this.DFATable = [];
    this.operatorStack = [];
    this.operandStack = [];
    this.inputSet = new Set();
    this.patternList = [];

    this.setPattern(pattern);
}

Parser.prototype.setPattern = function (pattern) {
    this._cleanUp();
    if (!this._createNFA(pattern)) {
        return false;
    }
    this._convertNFAtoDFA();
    this._reduceDFA();
    return true;
};

Parser.prototype._cleanUp = function () {
    this.NFATable = [];
    this.DFATable = [];
    this.inputSet.clear();
    this.operatorStack = [];
    this.operandStack = [];
};

Parser.prototype._createNFA = function (pattern) {
    pattern = concatExpand(pattern);

    var i, len, c;
    for (i = 0, len = pattern.length; i < len; ++i) {
        c = pattern.charAt(i);

        if (isInput(c)) {
            this._push(c);
        } else if (this.operatorStack.length === 0) {
            this.operatorStack.push(c);
        } else {
            while (this.operatorStack.length > 0 && presedence(c, this.operatorStack[this.operatorStack.length - 1])) {
                if (!this._eval()) return false;
            }
            this.operatorStack.push(c);
        }
    }

    // evaluate the rest of operators
    while (this.operatorStack.length > 0) {
        if (!this._eval()) return false;
    }

    // pop the result from the stack
    this.NFATable = this._pop();
    if (!this.NFATable) return false;
    // last NFA state is always accepting state
    this.NFATable[this.NFATable.length - 1].acceptingState = true;

    return true;
};

Parser.prototype._convertNFAtoDFA = function () {
    // check NFA table
    if (this.NFATable.length == 0) return;

    // clean up the DFA Table first
    this.DFATable = [];
    // array of unprocessed DFA states
    let unmarkedStates = [];

    // starting state of DFA is epsilon closure of starting state of NFA state (set of states)
    let NFAStartStateSet = new Set();
    // FIXME single?
    NFAStartStateSet.add(this.NFATable[0]);
    let DFAStartStateSet = this._epsilonClosure(NFAStartStateSet);
    // create new DFA State (start state) from the NFA states
    let DFAStartState = new State(DFAStartStateSet);
    // add the start state to the DFA
    this.DFATable.push(DFAStartState);

    // add the starting state to set of unprocessed DFA states
    unmarkedStates.push(DFAStartState);
    while (unmarkedStates.length > 0) {
        let processingDFAState = unmarkedStates.shift();
        for (let cha of this.inputSet) {
            let moveRes = this._move(cha, processingDFAState.getNFAStates());
            let epsilonClosureRes = this._epsilonClosure(moveRes);
            if (epsilonClosureRes.size === 0) continue;

            // check is the resulting set (epsilonClosureSet) in the
            // set of DFA states (is any DFA state already constructed
            // from this set of NFA states) or in pseudocode:
            // is U in D-States already (U = epsilonClosureSet)
            let index = -1;
            let found = this.DFATable.some(function (state, key) {
                index = key;
                return util.compareSet(state.getNFAStates(), epsilonClosureRes);
            });
            if (found) {
                // this state already exists so add transition from
                // processingState to already processed state
                processingDFAState.addTransition(cha, this.DFATable[index]);
            } else {
                let u = new State(epsilonClosureRes);
                unmarkedStates.push(u);
                this.DFATable.push(u);

                // add transition from processingDFAState to new state on the current character
                processingDFAState.addTransition(cha, u);
            }
        }
    }
};

Parser.prototype._reduceDFA = function () {
};

Parser.prototype._eval = function () {
    // First pop the operator from the stack
    if (this.operatorStack.length === 0) return false;

    var operator = this.operatorStack.pop();

    // Check which operator it is
    switch(operator) {
    case '*':
        return this._star();
        break;
    case '|':
        return this._union();
        break;
    case CONCAT_CHAR:
        return this._concat();
        break;
    }

    return false;
};

Parser.prototype._star = function () {
};

Parser.prototype._union = function () {
};

Parser.prototype._concat = function () {
    // pop 2 elements
    var B = this._pop();
    var A = this._pop();
    if (!A || !B) return false;

    // evaluate AB
    // basically take the last state from A and add an epsilon transition to the first state of B
    A[A.length - 1].addTransition(0, B[0]);
    A = A.concat(B);

    // push the result onto the stack
    this.operandStack.push(A);
    debug('CONCAT', A);

    return true;
};

Parser.prototype._push = function (input) {
    var start = new State();
    var end = new State();
    start.addTransition(input, end);

    this.operandStack.push([start, end]);
    this.inputSet.add(input);
    debug('PUSH', input);
};

Parser.prototype._pop = function () {
    if (this.operandStack.length) {
        debug('POP', this.operandStack[this.operandStack.length - 1]);
        return this.operandStack.pop();
    }
};

Parser.prototype._epsilonClosure = function (T) {
	// initialize result with T because each state has epsilon closure to itself
    let res = new Set(T);

    // push all states onto the stack
    let unprocessedStack = [];
    for (let item of T) {
        unprocessedStack.push(item);
    }

    while (unprocessedStack.length > 0) {
        // pop t, the top element from unprocessed stack
        let t = unprocessedStack.pop();
        // get all epsilon transition for this state
        let epsilonTransitionStates = t.getTransitionStates(0);
        // for each state u with an edge from t to u labeled epsilon
        epsilonTransitionStates.forEach(function (state) {
            // if state not in e-closure(T)
            if (!res.has(state)) {
                res.add(state);
                unprocessedStack.push(state);
            }
        });
    }

    return res;
}

Parser.prototype._move = function (cha, T) {
    let res = new Set();
    for (let state of T) {
        let transitionStates = state.getTransitionStates(cha);
        transitionStates.forEach(function (transitionState) {
            res.add(transitionState);
        });
    }
    return res;
};

Parser.prototype.test = function (str) {
    return this.find(str).length > 0;
};

// FIXME find only one pattern or all?
Parser.prototype.find = function (str, pos) {
    let res = [];
    let patternList = [];
    pos = pos || 0;

    // if there is no DFA then there is no matching
    if (this.DFATable.length === 0) return res;

    // go through all input charactes
    for (let i = pos, len = str.length; i < len; i++) {
        let cha = str[i];

        debug('FIND: pattern list', patternList, 'for charactor', cha);
        // check all patterns states
        patternList.forEach(function (pattern, index) {
            let transitionStates = pattern.state.getTransitionStates(cha);
            if (transitionStates.size > 0) {
                pattern.state = transitionStates.values().next().value;
                if (pattern.state.acceptingState) {
                    res.push({
                        index: pattern.startIndex,
                        text: str.slice(pattern.startIndex, i + 1)
                    });
                }
            } else {
                // delete this pattern state
                patternList.splice(index, 1);
            }
        });

        // check it against state 1 of the DFA
        let state = this.DFATable[0];
        let transitionStates = state.getTransitionStates(cha);
        if (transitionStates.size > 0) {
            // must only one state because of DFA
            let transitionState = transitionStates.values().next().value;
            debug('FIND: initial state', transitionState);
            patternList.push({
                startIndex: i,
                state: transitionState
            });

            // check is this accepting state
            if (transitionState.acceptingState) {
                res.push({
                    index: i,
                    text: c
                });
            }
        } else {
            // check here is the entry state already accepting
            // because a* for example would accept 0 or many a's
            // whcih means that any character is actually accepted
            if (state.acceptingState) {
                res.push({
                    index: i,
                    text: c
                });
            }
        }
	}

	return res;
};

function isInput(c) {
    return !isOperator(c);
}

function isOperator(c) {
    return c === '*' ||
        c === '|' ||
        c === '(' ||
        c === ')' ||
        c.charCodeAt(0) === 8;
}

function isLeftParanthesis(c) {
    return c === '(';
}

function isRightParanthesis(c) {
    return c === ')';
}

function presedence(opLeft, opRight) {
    if (opLeft === opRight) return true;

    if (opLeft === '*') return false;
    if (opRight == '*') return true;

    if (opLeft === CONCAT_CHAR) return false;
    if (opRight === CONCAT_CHAR) return true;

    if (opLeft === '|') return false;

    return true;
};

function concatExpand(str) {
    var ret = '';
    var i, len, cLeft, cRight;
    for (i = 0, len = str.length; i < len - 1; i++) {
        cLeft = str[i];
        cRight = str[i + 1];
        ret += cLeft;
        if (isInput(cLeft) || isRightParanthesis(cLeft) || cLeft === '*') {
            if (isInput(cRight) || isLeftParanthesis(cRight)) {
                ret += CONCAT_CHAR;
            }
        }
    }
    ret += str[str.length - 1];
    return ret;
}

