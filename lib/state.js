'use strict';

const util = require('./util');

function State(states) {
    this.id = ++State.id;
    this.transitions = [];

    this.acceptingState = false;
    if (states) {
        this.NFAStates = states;
        for (let state of states) {
            if (state.acceptingState) {
                this.acceptingState = true;
            }
        }
    }
}
State.id = -1;

State.prototype.addTransition = function (input, state) {
    this.transitions.push({
        input: input,
        state: state
    });
};
State.prototype.removeTransition = function (state) {
    this.transition = this.transitions.filter(function (transition) {
        return transition.state !== state;
    });
};
State.prototype.getTransitionStates = function (input) {
    return this.transitions.filter(function (transition) {
        return transition.input === input;
    }).reduce(function (res, transition) {
        return res.add(transition.state);
    }, new Set());
};
State.prototype.getNFAStates = function () {
    return this.NFAStates;
};

module.exports = State;
