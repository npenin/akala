#  (2024-10-08)


### Bug Fixes

* add akala as export 0fc25ef
* add node as an export condition 2e70542
* add provenance 7e40a49
* adding getOwnPropertyDescriptor to try to fix Object.assign 5b28a25
* akala cli 7e6bff2
* allow pm yto start 6a757f6
* artificial bump 491aeb5
* artificial bump c330b52
* artificial bump to force using latest tag on npm 6fe89ea
* bump version dc1b5d3
* cannot read undefined config object fefd5a7
* code clean up 9064233
* config key export 29b1048
* config secret read 516aa51
* delete config property 74ba94c
* downgrade all packages to support both cjs and mjs cd58dc1
* embrace esm even more 07203e5
* embrace esm even more a0aae6a
* encode secrets to base64 4427015
* enumerate on configuration objects 4b4f601
* hasOwnKeys now returns correct keys ed68423
* implement config unwrap 732252c
* improve browser usage ac6f14b
* improve config get return type 26516a6
* improve config typing adf3d74
* make new as sync again and create newAsync dfc10d4
* move to ESM 6b55a07
* normalize support for custom conditions f325a88
* normalized modules to work in esm and cjs c9e7650
* path can now be retrieved using property bd4e76c
* path to container schema 9f4404e
* remove postinstall steps e8b6506
* secret key transfer to nested config 8e0edbe
* smaller secret footprint 052dc8d
* switch to own base64 to prevent buffer dependencies bf4e709
* typing 15ef366
* update dependencies and regenerate metadata 79412a7
* update lock file 960047c
* update package definitions e8f89f1
* update to new branch json url 777d26d
* update ts generated files 0d778b5
* upgrade to latest commands 1bf0edc
* wrong version ece0ed2


### Features

* add Configuration getters and setters 14aa390
* add createIfEmpty flag on config load 7c8cc68
* add secret support in configuration c5d4097
* add support config property deletion 587e39b
* allow for relative path in cli f240d15
* fix config secret key load in akala cli a4cf4b0
* have both CJS and ESM at once b07f75b
* move Deferred and Serializable(Object) to core 240544f
* return ProxyConfiguration correct type when strongly typed 0198e0d
* support for config file path with needle 5b5603e
* update to ESM 500be75


### BREAKING CHANGES

* new returns Promise to allow the key load when not provided
* added signatures that may break dependent libraries
* Deferred and Serializable(Object) moved to core instead of json-rpc-ws causing dependencies break.
* core and json-rpc-ws dependencies swapped because of afore mentioned breaking change
* Configuration is now the default export



