#  (2024-10-08)


### Bug Fixes

* add exports to mongo 07d1dc0
* add node as an export condition 2e70542
* allow pm yto start 6a757f6
* any implementation fixed d92b6b4
* any on mongodb 522e7eb
* artificial bump c330b52
* artificial bump to force using latest tag on npm 6fe89ea
* assign id after insert 3aa561e
* bump version dc1b5d3
* count and any pipelines c3b396d
* downgrade all packages to support both cjs and mjs cd58dc1
* embrace esm even more 07203e5
* embrace esm even more a0aae6a
* **mongodb:** exclude generated field from being updated f626297
* move to ESM 6b55a07
* normalized modules to work in esm and cjs c9e7650
* typing 15ef366
* update after core and storage upgrade 2a44cb9
* update after core breaking change 57734b2
* update lock file 960047c
* update package definitions e8f89f1


### Features

* add mongodb support 6ceb9fb
* deprecate CJS implemtations for many packages bcddb76
* have both CJS and ESM at once b07f75b
* move Deferred and Serializable(Object) to core 240544f
* support for nested object mapping 2c63ef4
* update to ESM 500be75


### BREAKING CHANGES

* CJS is no more supported
* Deferred and Serializable(Object) moved to core instead of json-rpc-ws causing dependencies break.
* core and json-rpc-ws dependencies swapped because of afore mentioned breaking change



