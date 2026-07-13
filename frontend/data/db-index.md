1.  There can be (and may be) only one Primary Key in a table. One and only one! You can have as many UNIQUE fields as you want, however you like.
2.  Fields defined by the primary key cannot contain a NULL value. Not in any way at all. By default they are NOT NULL. In the case of UNIQUE, it does not matter what is contained in the field marked with that keyword.
