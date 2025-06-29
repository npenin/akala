#  (2025-06-29)


### Bug Fixes

* handle zero buffer size in parserWrite and ensure positive buffer size 038eadf


### Features

* add getLength method to various parsers for improved length calculation cfc733f
* performance improvement on protocol parsers writing ebcb08c


### BREAKING CHANGES

* parsers are required to implement getLength to be able to properly initialize buffers to the right size
* parserWrite returns a single buffer and is not used internally
* ParsersWithUnknownLength are removed



