'use strict';

const assert = require('assert');
const util = require('../lib/util');

describe('#compareSet', function () {
    it('should compare whether two sets have the same elements', function () {
        let a = new Set();
        a.add(1);
        let b = new Set();
        b.add(1);
        assert(util.compareSet(a, b));

        b.add(2);
        assert(!util.compareSet(a, b));
    });
});
