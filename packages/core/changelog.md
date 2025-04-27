#  (2025-04-26)


### Bug Fixes

* allow line breaks and tabs in parser a5bb001
* allow optional spaces 002c4a2
* allow optional spaces 951a42d
* base64UrlEncode properly strips = 8a9274d
* bug when result is null 4596a13
* case when x is null 4631c51
* cleanup dependencies d4f9ef0
* enforce handlers with use 5fc57bc
* enforce handlers with use 3cf35ac
* improve isomorphicbuffer usability e0ff541
* improve parser performances 158b46d
* improve serialize on http ca89683
* injectWithNameAsync behaves as its sync counterpart but awaits for args to be resolved before call the injectable dc7f00c
* IsomorphicBuffer 1885b99
* merge promises into a uniform object 2a3b0da
* merge promises into a uniform object 66d8a54
* resolveKeys c5a4c8e
* resolveKeys 150e763
* routing 033343d
* routing 0bd2fdd
* unit tests 5ea6752
* update after StringCursor switch 5031902
* update type annotations for Base64 encoding functions and improve handling of ArrayBuffer d2157f1
* wrong csv parsing f9359c6


### Code Refactoring

* replace void with undefined as NextParam 76398ea


### Features

* add customResolve and ICustomResolver to simplify injector and non injector chaining e9a9eae
* add customResolve and ICustomResolver to simplify injector and non injector chaining 93107ce
* allow not assigning result as last parameter c93f78c
* errorWithStatus can be assigned a name fb0ef99
* introduce IsomorphicBuffer dfa275f


### BREAKING CHANGES

* introduce StringCursor to prevent substringing all the time
* NextParam cannot be void anymore. To compensate and help refactoring, a NotHandled const has been created.
* injectWithNameAsync behaves as its sync counterpart, hence returns a function expecting an instance parameter



