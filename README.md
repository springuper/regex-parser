# regexp-parser

An elegant regular expression parser purely implemented in javascript.

## Usage

```js
var RegExpParser = require('regexp-parser');
var reg = new RegExpParser('ab');
console.log(reg.test('ab')); // => true
console.log(reg.test('ba')); // => false
console.log(reg.find('abc')); // => [{ index: 0, text: 'ab' }]
```

More features comes later.

## Special Thanks

This project is heavily inspired by Amer Gerzic's [Writing own regular expression parser](http://www.codeproject.com/Articles/5412/Writing-own-regular-expression-parser).

## License

MIT
