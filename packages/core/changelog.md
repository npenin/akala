#  (2024-10-08)


* fix:base64 helpers generating empty data 1e4c439


### Bug Fixes

* #10 b946c32
* add buildsetter formatter support b87ade0
* add node as an export condition 2e70542
* add provenance 7e40a49
* add remote type (for async ops) 76491d7
* add support for constants 26e3f6f
* add support for ParsedObject 5579b2f
* akala cli 7e6bff2
* allow pm yto start 6a757f6
* artificial bump 20538d5
* artificial bump c330b52
* artificial bump 083ebef
* artificial bump to force using latest tag on npm 6fe89ea
* async router d310aae
* aws take from environment f3eb274
* better support for compound keys 855e97c
* binding and refactor builders 18da18c
* binding constructor 5d24b41
* Binding new implementation 5c64bfb
* bindings are less intrusive d1e5cc0
* build with angular 17 6826ea7
* build with angular 17 ccab3ca
* buildsetter b121cb4
* buildsetter 55915b0
* buildsetter binding case cb14222
* buildsetter consistency 23cabc0
* bump version dc1b5d3
* bump version c3dbe4e
* cjs build 3705493
* cli crashing when succeeding 239ef5c
* Cli wait fixed 8ef8927
* **core:** interpolate miss return 55a49b1
* **deps:** update dependency ws to v8 93a65d0
* distinct implementation fix c7e3aed
* downgrade all packages to support both cjs and mjs 6bad989
* downgrade all packages to support both cjs and mjs cd58dc1
* downgrade all packages to support both cjs and mjs d2c799a
* **eachAsync:**  better error support 692abef
* eachAsync in case of failure 1ea1efd
* eachAsync when pushing new items in the process cf90dd0
* edge case with distinct c983733
* embrace esm even more 07203e5
* embrace esm even more a0aae6a
* empty string parsing 0624a48
* error flow in composite middleware 0f53599
* evaluator as function with constants 8b6b662
* export AggregateErrors c7f0375
* fix distinct ec6666c
* fix keepOrder on distinct 62858ff
* fix use on router 60b2255
* fix wrong update on import f11a290
* form serialization 9299b0c
* form serialization ca90f0e
* formatter resolution 3c2ce4c
* handle case when middleware failed but continues edd192d
* handle module error on start 9abcf7a
* handle non promise values a203c14
* handle setter on binding 6625d8f
* handle unary operator in evaluator 4056b26
* hasListener signature 3be96d3
* helps compile under angular 8d1a5e8
* imported event class from node 86f3ae3
* improve browser usage ac6f14b
* improve call expression support 4a3ba5f
* improve consistency of base64 helpers 1952256
* improve parsing performance and correctness 6b6f7b7
* improve typing consistency a0e418e
* improve typing for errorMiddlewares 22dc637
* improve usage with objects 9c52c53
* injector inheritance 99819fc
* injector logging b4aa1f6
* injector self registration 134618d
* mapAsync a16f7d3
* middleware copy/paste issue 8ca7dad
* move to ESM 6b55a07
* nested injector resolution dd48450
* normalization and edge cases in cli d3bf1a9
* normalized modules to work in esm and cjs c9e7650
* observable builders support Bindings dfc6ed7
* once support improved 1347deb
* overload selection 5904983
* parser more reliable 4f3d05f
* parser with parameters ad8e2c3
* performance refactor fix 2a64eae
* piped bindings de05e1d
* pm cli command usage d7e8fa9
* properly evaluate parsed array 5f8229e
* properly evaluate parsed array 3088ffd
* redirect also allows relative url 105ad0e
* remove dependency to orchestrator 236504f
* remove hrtime dependency 7810ead
* remove http imports to support treeshaking for browsers 49608ee
* remove import of removed dependency ef09280
* remove triple-beam dependency 562e6a7
* remove util dependency 97b9ccd
* remove winston dependency 026dabc
* require dependent packages broken 7b3f12d
* resolution logging 6e564cd
* restore broken cli feature e56c880
* runtime bug 4d99a9c
* set log level for any namespace 64051a9
* simplify url handler cec7182
* stop generating loggers for numeric keys f840bbb
* ternary expression and op 3209f20
* typing 15ef366
* typo c1febf6
* update after evaluator is not returning promise 86f608e
* update dependencies and regenerate metadata 79412a7
* update lock file 960047c
* update package definitions e8f89f1
* update reference to field 09b05e4
* update replace on ObservableArray ad1388b
* update source-map-support imports ee12278
* update test script e81d992
* upgrade to latest commands 1bf0edc
* wrong version 629151f


### chore

* update dependencies 59b244b


### Code Refactoring

* remove next in async each/map/grep 428f4a8


### Features

* add base64 converter to be runtime agnostic d203c8c
* add calls support + fix stackoverfow fec66fa
* add cli gateway 6e8f190
* add distinct helpers 07cd494
* add form-urlencoded as a content type 3adf608
* add get to get events on event emitter edc9903
* add HttpStatusCodes 0dce423
* add json formatter 7a0d1a4
* add lazy helper 2ad45cc
* add middleware with priority handling 335c9c4
* add observables (to eventually replace Binding) 1621991
* add other expression visitors 51f49af
* add QuestionDot operator (optional member access) e6a3f55
* add support for injectmap 9f07efe
* add support for ternary expressions 3a5760f
* add support for ternary expressions 53bb4e5
* add sync routers 04604e7
* add synchronous middleware ea972f4
* add ternary expression c2cdb49
* add typed variant ab3e802
* add uritemplate tests 9887e02
* add url handler 3b5d150
* allow defined events retrieval 484563a
* allow enabling logger on namespace 422c2f4
* allow more string "errors" in router daa6af1
* allow reversible formatters 883708f
* allow specifying array for nested resolutions d6063db
* allow to keepOrder in distinct 34368c1
* allow URLs as parameter in Http client d860de7
* enable cli help/documentation 26eb4f3
* export event emitter 94122cc
* expose observables and removes legacy binding 600b810
* handle cookies on redirect 061fe83
* have both CJS and ESM at once b07f75b
* implement real formatter class 69c5562
* improve event-emitter typing 2fbdd55
* Interpolate is instantiable 5b2a65e
* Interpolator returns expressions ff3bd34
* make expression parsing sync bef9df9
* move Deferred and Serializable(Object) to core 240544f
* move ErrorWithStatus to core 04d5530
* move to serve with AbortSignal 8449080
* provide real Date formatter fc702de
* re-implement Binding from scratch be79651
* remove path-to-regexp and implement https://datatracker.ietf.org/doc/html/rfc3629#page-8 60221e5
* removing problematic extend function 4a66e5a
* simplify event emitter typing f554b3e
* split injector implementation 8162428
* switch from TypedArray to ArrayBuffer fd84c5b
* switch to custom event emitter 831a10c
* switch to ESM decorators 5b4208a
* switched from raw debug to logger from core b2c7d2d
* update to ESM 500be75
* use existing dispose symbol and template needs disposable 4641245


### BREAKING CHANGES

* routes follow RFC 3629
* updated to path-to-regexp@8, thus route paths have to follow the new syntax
* formatters are not simple functions anymore
* replace provides index
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
* module and orchestrator are now using this new implementation
* implementations using NextFunction will not work any longer.
* now evaluator returns a Promise and not the ParsedFunction directly
* ESM decorators are not compatible with legacy decorators
* Deferred and Serializable(Object) moved to core instead of json-rpc-ws causing dependencies break.
* core and json-rpc-ws dependencies swapped because of afore mentioned breaking change
* extend helper no more is
* cli does not use winston as a logger anymore



