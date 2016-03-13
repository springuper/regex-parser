'use strict';

const assert = require('assert');
const Parser = require('../lib/parser');

describe('regex-parser', function () {
    it('should handle simple concat pattern', function () {
        let reg = new Parser('ab');

        assert(reg.NFATable.length === 4);
        assert(reg.NFATable[0].transitions[0].input === 'a');
        assert(reg.NFATable[1].transitions[0].input === 0);
        assert(reg.NFATable[2].transitions[0].input === 'b');
        assert(reg.NFATable[3].acceptingState);

        assert(reg.DFATable.length === 3);
        assert(reg.DFATable[0].transitions.length === 1);
        assert(reg.DFATable[0].transitions[0].input === 'a');
        assert(reg.DFATable[1].transitions.length === 1);
        assert(reg.DFATable[1].transitions[0].input === 'b');
        assert(reg.DFATable[2].transitions.length === 0);
        assert(reg.DFATable[2].acceptingState);

        assert(reg.test('ab'));
        assert(reg.test('abc'));
        assert(reg.test('cab'));
        assert(!reg.test('a'));
        assert(!reg.test('b'));
        assert(!reg.test('ba'));
    });

    it('should handle simple star pattern', function () {
        let reg = new Parser('a*b');

        console.log('@NFA', require('util').inspect(reg.NFATable[1].transitions));
        assert(reg.NFATable.length === 6);

        assert(reg.DFATable.length === 3);
        assert(reg.DFATable[0].transitions.length === 2);
        assert(reg.DFATable[0].transitions[0].input === 'a');
        assert(reg.DFATable[0].transitions[1].input === 'b');
        assert(reg.DFATable[1].transitions.length === 2);
        assert(reg.DFATable[1].transitions[0].input === 'a');
        assert(reg.DFATable[1].transitions[1].input === 'b');
        assert(reg.DFATable[2].transitions.length === 0);

        assert(reg.test('b'));
        assert(reg.test('ab'));
        assert(reg.test('aab'));
        assert(reg.test('ba'));
        assert(!reg.test('a'));
        assert(!reg.test('ac'));
    });

    it('should handle simple union pattern', function () {
        let reg = new Parser('a|b');

        assert(reg.NFATable.length === 6);

        assert(reg.DFATable.length === 3);
        assert(reg.DFATable[0].transitions.length === 2);
        assert(reg.DFATable[0].transitions[0].input === 'a');
        assert(reg.DFATable[0].transitions[1].input === 'b');

        assert(reg.test('a'));
        assert(reg.test('b'));
        assert(reg.test('ab'));
        assert(reg.test('ba'));
        assert(!reg.test(''));
        assert(!reg.test('c'));
    });
});
