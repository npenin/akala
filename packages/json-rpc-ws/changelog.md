#  (2024-10-08)


### Bug Fixes

* add browser export condition 01d724a
* add node as an export condition 2e70542
* add provenance 7e40a49
* allow pm yto start 6a757f6
* artificial bump c330b52
* artificial bump to force using latest tag on npm 6fe89ea
* browser exports 3be897b
* browser implementation (remove implicit reference to node) 0283043
* bump version dc1b5d3
* compilation after typescript 4.4 upgrade 9aa6ab4
* **deps:** update dependency ws to v8 93a65d0
* downgrade all packages to support both cjs and mjs cd58dc1
* downgrade all packages to support both cjs and mjs d2c799a
* embrace esm even more 07203e5
* embrace esm even more a0aae6a
* error serialization c4fe40f
* expose jsonrpc client id 2bd9b79
* fix generate and tsconfig files f6e44d6
* handle bridges/proxy 3d43667
* helps compile under angular 4c8979a
* improve browser usage ac6f14b
* **json-rpc-ws:** adds missing file to package a3dc6f3
* make pm work with connect args 76d77dc
* move to ESM 6b55a07
* normalized modules to work in esm and cjs c9e7650
* omit client package for now 6013154
* prevent breaks after disconnect 74f662c
* proper error serialization support f9582f6
* update dependencies and regenerate metadata 79412a7
* update lock file 960047c
* update package definitions e8f89f1
* update source-map-support imports ee12278
* update to ws 8.0 5b4d004
* wrong version b5120c6


### Features

* add bridge support b07b1ba
* allow options on json-rpc-ws (like protocols) 4a8a1c0
* allow options on json-rpc-ws (like protocols) c96f674
* errors like are now true errors 4d1fb31
* have both CJS and ESM at once b07f75b
* move Deferred and Serializable(Object) to core 240544f
* update to ESM 500be75


### BREAKING CHANGES

* Deferred and Serializable(Object) moved to core instead of json-rpc-ws causing dependencies break.
* core and json-rpc-ws dependencies swapped because of afore mentioned breaking change



