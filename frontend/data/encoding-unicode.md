**Unicode v1** (1991) - fixed 16-bit, 2¹⁶ = 65,536 chars.
**Unicode v2** (1996) - expanded; UTF-16 created for back-compat with 16-bit systems. Its surrogate range 0xD800-0xDFFF was formerly private-use. New code space = 2²⁰+2¹⁶-2048 = **1,112,064** chars, up to **U+10FFFF**.

**Code point** - a char's unique id, hex ≥4 digits w/ leading zeros (27 = 0x1B = U+001B). Planes: U+0000-U+FFFF = Basic Multilingual Plane, then "astral planes". Variation selectors (FE00-FE0F) = invisible chars that reshape the preceding glyph.

**3 encodings:**

- **UTF-32** - fixed 32-bit, >4B chars.
- **UTF-16** - variable 2-4 bytes. JS uses it; chars above 65535 need surrogate pairs: high U+D800-U+DBFF (1024) + low U+DC00-U+DFFF (1024).
- **UTF-8** - variable 1-4 bytes. First 128 (ASCII) = 1 byte; next 1920 = 2 bytes (covers most Latin-script alphabets).
