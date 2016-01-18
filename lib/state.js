function State() {
    this.id = ++State.id;
    this.transitions = [];
    this.acceptingState = false;
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
State.prototype.getTransitions = function (input) {
    return this.transitions.filter(function (transition) {
        return transition.input === input;
    });
};

module.exports = State;
