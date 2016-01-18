var State = require('./state');
var debug = require('debug')('regex-parser');

var CONCAT_CHAR = String.fromCharCode(8);

function Parser(pattern) {
    this.NFATable = null;
    this.DFATable = null;
    this.operatorStack = [];
    this.operandStack = [];
    this.inputSet = new Set();

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
	// clean up the DFA Table first
    this.DFATable = [];

	// check NFA table
	if (this.NFATable.length == 0) return;

	// reset the state id for new naming
	this.nextStateID = 0;

	// array of unprocessed DFA states
	var unmarkedStates = [];

	// starting state of DFA is epsilon closure of 
	// starting state of NFA state (set of states)
	var DFAStartStateSet = new Set();
	var NFAStartStateSet = new Set();
	NFAStartStateSet.add(this.NFATable[0]);
	this._epsilonClosure(NFAStartStateSet, DFAStartStateSet);

	// // Create new DFA State (start state) from the NFA states
	// CAG_State *DFAStartState = new CAG_State(DFAStartStateSet, ++m_nNextStateID);

	// // Add the start state to the DFA
	// m_DFATable.push_back(DFAStartState);

	// // Add the starting state to set of unprocessed DFA states
	// unmarkedStates.push_back(DFAStartState);
	// while(!unmarkedStates.empty())
	// {
	// 	// process an unprocessed state
	// 	CAG_State* processingDFAState = unmarkedStates[unmarkedStates.size()-1];
	// 	unmarkedStates.pop_back();

	// 	// for each input signal a
	// 	set<char>::iterator iter;
	// 	for(iter=m_InputSet.begin(); iter!=m_InputSet.end(); ++iter)
	// 	{
	// 		set<CAG_State*> MoveRes, EpsilonClosureRes;
	// 		Move(*iter, processingDFAState->GetNFAState(), MoveRes);
	// 		EpsilonClosure(MoveRes, EpsilonClosureRes);

	// 		// Check is the resulting set (EpsilonClosureSet) in the
	// 		// set of DFA states (is any DFA state already constructed
	// 		// from this set of NFA states) or in pseudocode:
	// 		// is U in D-States already (U = EpsilonClosureSet)
	// 		BOOL bFound		= FALSE;
	// 		CAG_State *s	= NULL;
	// 		for(i=0; i<m_DFATable.size(); ++i)
	// 		{
	// 			s = m_DFATable[i];
	// 			if(s->GetNFAState() == EpsilonClosureRes)
	// 			{
	// 				bFound = TRUE;
	// 				break;
	// 			}
	// 		}
	// 		if(!bFound)
	// 		{
	// 			CAG_State* U = new CAG_State(EpsilonClosureRes, ++m_nNextStateID);
	// 			unmarkedStates.push_back(U);
	// 			m_DFATable.push_back(U);
	// 			
	// 			// Add transition from processingDFAState to new state on the current character
	// 			processingDFAState->AddTransition(*iter, U);
	// 		}
	// 		else
	// 		{
	// 			// This state already exists so add transition from 
	// 			// processingState to already processed state
	// 			processingDFAState->AddTransition(*iter, s);
	// 		}
	// 	}
	// }
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
	// Basically take the last state from A
	// and add an epsilon transition to the
	// first state of B. Store the result into
	// new NFA_TABLE and push it onto the stack
	A[A.length - 1].addTransition(0, B[0]);
    A = A.concat(B);

	// Push the result onto the stack
	this.operandStack.push(A);
	debug('CONCAT', A);

	return true;
};

Parser.prototype.findFirst = function (str) {

};

Parser.prototype.findNext = function (str, pos) {

};

Parser.prototype._find = function () {

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

Parser.prototype._epsilonClosure = function (from, dist) {
    // dist.clear();
	// 
	// // Initialize result with T because each state
	// // has epsilon closure to itself
	// Res = T;

	// // Push all states onto the stack
	// stack<CAG_State*> unprocessedStack;
	// set<CAG_State*>::iterator iter;
	// for(iter=T.begin(); iter!=T.end(); ++iter)
	// 	unprocessedStack.push(*iter);

	// // While the unprocessed stack is not empty
	// while(!unprocessedStack.empty())
	// {
	// 	// Pop t, the top element from unprocessed stack
	// 	CAG_State* t = unprocessedStack.top();
	// 	unprocessedStack.pop();

	// 	// Get all epsilon transition for this state
	// 	vector<CAG_State*> epsilonStates;
	// 	t->GetTransition(0, epsilonStates);

	// 	// For each state u with an edge from t to u labeled epsilon
	// 	for(int i=0; i<epsilonStates.size(); ++i)
	// 	{
	// 		CAG_State* u = epsilonStates[i];
	// 		// if u not in e-closure(T)
	// 		if(Res.find(u) == Res.end())
	// 		{
	// 			Res.insert(u);
	// 			unprocessedStack.push(u);
	// 		}
	// 	}
	// }
}

module.exports = Parser;

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

