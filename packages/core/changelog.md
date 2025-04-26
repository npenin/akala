#  (2025-04-26)


### Bug Fixes

* enforce handlers with use 3cf35ac
* injectWithNameAsync behaves as its sync counterpart but awaits for args to be resolved before call the injectable dc7f00c
* merge promises into a uniform object 66d8a54
* resolveKeys 150e763
* routing 0bd2fdd
* unit tests 5ea6752
* update type annotations for Base64 encoding functions and improve handling of ArrayBuffer d2157f1


### Features

* add customResolve and ICustomResolver to simplify injector and non injector chaining 93107ce


### BREAKING CHANGES

* injectWithNameAsync behaves as its sync counterpart, hence returns a function expecting an instance parameter



