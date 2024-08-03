#  (2024-08-03)


### Bug Fixes

* add support for constants 4fa2c21
* add support for ParsedObject 0480efd
* async router 6bd9cf3
* Binding new implementation b287d4c
* buildsetter e6b5c6e
* evaluator as function with constants 4822874
* hasListener signature 896a1b9
* improve call expression support 82c92b4
* improve parsing performance and correctness cffc750
* improve typing consistency 7b40797
* injector self registration 5bf320a
* nested injector resolution f7dff91
* observable builders support Bindings ec41f39
* parser with parameters e2d6149
* piped bindings 196d01d
* ternary expression and op ce4abe8
* update after evaluator is not returning promise 8781838
* update test script f730fdf


* fix:base64 helpers generating empty data 0ed3fad


### Features

* add calls support + fix stackoverfow d89fecf
* add get to get events on event emitter df6bbbf
* add json formatter b8613d5
* add observables (to eventually replace Binding) fccb33f
* add other expression visitors 99134c7
* add QuestionDot operator (optional member access) a9542d0
* add support for injectmap 8ac6fb1
* add support for ternary expressions ae26a11
* add support for ternary expressions 203a380
* add sync routers f22b631
* add synchronous middleware 75141d3
* add ternary expression b7fab70
* allow defined events retrieval 5e0ac45
* allow enabling logger on namespace 9c445a4
* allow reversible formatters f66c2bc
* allow specifying array for nested resolutions a1a21b4
* allow URLs as parameter in Http client 3231b9d
* expose observables and removes legacy binding 4fdb791
* improve event-emitter typing 7a72d14
* Interpolator returns expressions ce21e5c
* make expression parsing sync cbbec58
* provide real Date formatter afb969e
* re-implement Binding from scratch e84fa76
* simplify event emitter typing 3496d5e
* split injector implementation a07efc0
* switch from TypedArray to ArrayBuffer ce32b68
* use existing dispose symbol and template needs disposable 0af55b0


### BREAKING CHANGES

* call expression now has a typedexpression as method and not a constant anymore
* binary operators are string enums
* returns Uint8Array instead of ArrayBuffer
* switch from TypedArray to ArrayBuffer for base64 and utf8 operations
* Binding from scratch may not contain all methods as it used to
* remove useless async/await usage
* legacy Router and Routes renamed to RouterAsync
* legacy Middlewares renamed to XXXMiddlewareAsync
* Injector renamed to SimpleInjector
* expression visitor is not returning promises anymore
* remove useless helpers
* Event is forbidden in the provided map type parameter



