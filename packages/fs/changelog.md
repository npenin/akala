#  (2025-06-23)


### Bug Fixes

* enhance FSFileSystemProvider methods to return this for consistent chaining and handle potential null in JSON parsing 162d627
* npm root fs de6d2a9
* refactor npm protocol handling to improve URL resolution and ensure package.json access 1d1322a


### Features

* add new methods to FSFileSystemProvider bb09cda


### BREAKING CHANGES

* for implementers, those need to be implemented: toImportPath, openReadStream, openWriteStream.



