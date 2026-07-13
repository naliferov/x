## String

type is the set of all ordered sequences of zero or more 16-bit unsigned [integer](https://tc39.es/ecma262/multipage/notational-conventions.html#integer) values (“elements”) up to a maximum length of 2 in 53 pow - 1 elements (9007199254740991). The String type is generally used to represent textual data in a running ECMAScript program, in which case each element in the String is treated as a UTF-16 code unit value

The length of a String is the number of elements (i.e., 16-bit values) within it. (HEX)

ECMAScript operations that do not interpret String contents apply no further semantics. Operations that do interpret String values treat each element as a single UTF-16 code unit.

Such operations apply special treatment to every code unit with a numeric value in the [inclusive interval](https://tc39.es/ecma262/multipage/notational-conventions.html#inclusive-interval) from 0xD800 to 0xDBFF (defined by the Unicode Standard as a leading surrogate, or more formally as a high-surrogate code unit) and every code unit with a numeric value in the [inclusive interval](https://tc39.es/ecma262/multipage/notational-conventions.html#inclusive-interval) from 0xDC00 to 0xDFFF (defined as a trailing surrogate, or more formally as a low-surrogate code unit) using the following rules: The phrase "the ASCII word characters" denotes the following String value, which consists solely of every letter and number in the Unicode Basic Latin block along with U+005F (LOW LINE):  
"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789\_".

All commonly used characters have 2-byte codes (4 hexadecimal digits). Originally, JavaScript was based on the UTF-16 encoding, which allowed only 2 bytes per character. However, 2 bytes allow only 65536 combinations, and that is not enough for all possible Unicode characters.

That is why rare characters requiring more than 2 bytes are encoded by a pair of 2-byte characters called a “surrogate pair”. A side effect is that the length of such characters equals `2`

// charCodeAt does not account for surrogate pairs, so it returns the codes for the 1st part of 𝒳: alert( '𝒳'.charCodeAt(0).toString(16) ); // d835 // codePointAt accounts for surrogate pairs alert( '𝒳'.codePointAt(0).toString(16) ); // 1d4b3, reads both parts of the surrogate pair

Is the length of a string counted by the number of code points it consists of? When counting the length of a string you should account for the number of graphemes, not code points. We consider a grapheme to be the minimal unit of writing.

In the case of 깍 (3 code points) they form 1 grapheme, which is displayed as a single character. Unicode describes normalization algorithms for such cases, where several characters can be replaced by one with a separate code point. String.prototype has the normalize method for this. It is possible to implement counting the length of a string without diacritic code points.

\\u0000 is deprecated and will only work for points from the basic plane \\u{0000} - the new one

## Object

Every property in JavaScript objects can be classified by three factors:

-   Enumerable or non-enumerable;
-   String or symbol
-   Own property or inherited property from the prototype chain.

Properties are identified using key values. A property key value is either an ECMAScript String value or a Symbol value. All String and Symbol values, including the empty String, are valid as property keys. A property name is a property key that is a String value.
