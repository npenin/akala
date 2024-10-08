#  (2024-10-08)


### Bug Fixes

* add node as an export condition 2e70542
* add provenance 7e40a49
* add-script and yamlloader 38208f0
* allow pm yto start 6a757f6
* artificial bump 6b6a0b6
* artificial bump c330b52
* artificial bump to force using latest tag on npm 6fe89ea
* bump version dc1b5d3
* downgrade all packages to support both cjs and mjs cd58dc1
* embrace esm even more 07203e5
* embrace esm even more a0aae6a
* fix generate and tsconfig files f6e44d6
* improve browser usage ac6f14b
* move to ESM 6b55a07
* normalized modules to work in esm and cjs c9e7650
* path to container schema 9f4404e
* remove confusing inject property on commands 94e3058
* stateless cli gateway working fe1c6a6
* typing 15ef366
* update lock and commands.json files 6d828a3
* update lock file 960047c
* update package definitions e8f89f1
* update to new branch json url 777d26d


### Features

* add cli gateway 6e8f190
* deprecate CJS implemtations for many packages bcddb76
* have both CJS and ESM at once b07f75b
* move Deferred and Serializable(Object) to core 240544f
* update to ESM 500be75


### BREAKING CHANGES

* CJS is no more supported
* Deferred and Serializable(Object) moved to core instead of json-rpc-ws causing dependencies break.
* core and json-rpc-ws dependencies swapped because of afore mentioned breaking change
* inject property does not exist on commands anymore



