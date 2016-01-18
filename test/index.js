var assert = require('assert');
var Parser = require('..');

describe('regex-parser', function () {
    it('should test simple concat pattern', function () {
        var reg = new Parser('ab');
        assert(reg.test('ab'));
        assert(!reg.test('a'));
        assert(!reg.test('b'));
        assert(!reg.test('abc'));
    });
});
