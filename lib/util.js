'use strict';

exports.compareSet = function (a, b) {
    if (a.size !== b.size) return false;
    for (let item of a) {
        if (!b.has(item)) return false;
    }
    return true;
};
