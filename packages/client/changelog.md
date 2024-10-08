#  (2024-10-08)


### Bug Fixes

* add controller (and other properties) to datacontext extension 286a3c4
* add node as an export condition 2e70542
* add provenance 7e40a49
* allow more general pages 536d493
* allow non existent form elements 5e88f81
* allow pm yto start 6a757f6
* allow style setting 9071079
* artificial bump c330b52
* artificial bump to force using latest tag on npm 6fe89ea
* bind relies on existing datacontext helper methods 5f4b3d7
* bind was called to early 519fb85
* bump version dc1b5d3
* client outlet commands management 2d7c4de
* client package 3a63d9b
* client prepack 8d71408
* **client:** simplify inheritance chain 5366634
* composers are now returning disposables but are not async anymore 556df21
* data-bind with object 4fa994e
* datacontext propagation e3e5d09
* do not declare each by default 107c04c
* downgrade all packages to support both cjs and mjs cd58dc1
* downgrade all packages to support both cjs and mjs d2c799a
* embrace esm even more 07203e5
* embrace esm even more a0aae6a
* enable controller on page root element 4d564c2
* enable controller on page root element cb3bb9a
* export "each" control 885e060
* export proper webcomponent decorator 97ae5cf
* gives scope as a parameter and not the binding scope f581ed0
* hotreplace supports watch f765c68
* implement real world Page class 65a9a6c
* improve browser usage ac6f14b
* improve i18n to provide html in case we are replacing innerText b69e5ff
* make page and Scope available to the wild 75a2e85
* move to ESM 6b55a07
* normalized modules to work in esm and cjs c9e7650
* omit client package for now 6013154
* refactor after core helpers removal 256477c
* remove legacy controls 7238f76
* rename to TeardownManager a5d0181
* support outlet cleanup ab76298
* trigger signature a9b9e59
* trying to make Page as PageWithOutlet 372d7f9
* trying to properly propagate the controller in the data context 43029b8
* typing 15ef366
* update after core breaking change 57734b2
* update after core breaking change ce8761f
* update after core changes 1bb74ba
* update after core changes 1d66bfe
* update dependencies and regenerate metadata 79412a7
* update lock file 960047c
* update package definitions e8f89f1
* update to latest @akala/core 28c28a7
* upgrade to latest commands 1bf0edc
* webcomponent implementation 21d2542
* wrong version 291c30a


### Features

* add Control base class 9bec45e
* add cssclasscomposer 425eba0
* add each as template control 90edfaf
* add event and i18n composers 6b79c3c
* add first each implementation 3bee389
* add FormComposer and other helpers to simplify rampup 77aeede
* add optionGetter instead of optionName on composers a6ec14b
* add scope injection token f973fa1
* add web component decorator da780bb
* allow state in events 120f25c
* allow translator to receive current values 83d0eb6
* **client:** allow relative URL building from current URL 610ae04
* deprecate CJS implemtations for many packages bcddb76
* have both CJS and ESM at once b07f75b
* implements new controls e132760
* improve hotkey trigger 321b367
* Interpolate is instantiable 5b2a65e
* move Deferred and Serializable(Object) to core 240544f
* part watches for data changes d9e6cbf
* re-enable client a18c970
* re-enable client publish 3025e1e
* re-publish client 5d1c378
* remove asynchronicity in controls 3602f9c
* remove circular dependency between controls and template + export template cache to help having hot reload b55eeea
* rename part to outlet 02e6180
* switch to ESM decorators 5b4208a
* update to ESM 500be75
* use existing dispose symbol and template needs disposable 4641245


### BREAKING CHANGES

* CJS is no more supported
* SubscriptionManager renamed to TeardownManager
* old controls are removed
* DataBindComposer is not registered by default
* controls do  instanciate asynchronously anymore
* previous controls are not working any more
* rename part to outlet
* rename $$injector to bootstrapModule
* ESM decorators are not compatible with legacy decorators
* Deferred and Serializable(Object) moved to core instead of json-rpc-ws causing dependencies break.
* core and json-rpc-ws dependencies swapped because of afore mentioned breaking change



