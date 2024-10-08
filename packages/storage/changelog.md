#  (2024-10-08)


### Bug Fixes

* add node as an export condition 2e70542
* add provenance 7e40a49
* add recursive path creation cdeaab0
* add transaction on dbset 2a3e50b
* allow pm yto start 6a757f6
* artificial bump c330b52
* artificial bump to force using latest tag on npm 6fe89ea
* better file init 53a2ed1
* bump version dc1b5d3
* downgrade all packages to support both cjs and mjs cd58dc1
* embrace esm even more 07203e5
* embrace esm even more a0aae6a
* ensure vanilla leverages generators 36bbc1e
* fix model registration and serialization 632446d
* handle default init 5edcb0c
* implement own resolve to prevent resolving to main 1bee921
* improve browser usage ac6f14b
* json model definition parsing e31b141
* model definition build 9d575cf
* move to ESM 6b55a07
* normalized modules to work in esm and cjs c9e7650
* proper binary execution d5c06c4
* proper typing on store create df59fb0
* proxy handling of properties update e7eb9de
* reliability issue on sonarcloud 275a8e4
* remove duplicate binary operator c0abb58
* remove extra logging cc59faa
* revert last change 213c407
* storage 47f5962
* **storage:** add nameInStorage support a3f2168
* **storage:** any works properly e77c843
* support for multiple keys 1ddee63
* typing 15ef366
* update after core breaking change 57734b2
* update dependencies and regenerate metadata 79412a7
* update lock file 960047c
* update package definitions e8f89f1
* update source-map-support imports ee12278
* wrong version 5d85898


### Features

* add mongodb support 6ceb9fb
* add multistore 63ccbd5
* add possibility for custom file format 5ad3ff2
* add possibility to parse filename 9d8071c
* add where signature for more flexibility 92eb535
* allow model definition to be passed in store create 1b2cf45
* deprecate CJS implemtations for many packages bcddb76
* have both CJS and ESM at once b07f75b
* remove parser and use the core parser 2ebd478
* switch to ESM decorators 5b4208a
* update to ESM 500be75


### BREAKING CHANGES

* CJS is no more supported
* expressions visitor is not async anymore
* ESM decorators are not compatible with legacy decorators
* File.from renamed to File.fromJson



