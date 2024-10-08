#  (2024-10-08)


### Bug Fixes

* adapt to trigger new definition a23f5e5
* add node as an export condition 2e70542
* add processCommand as exported function ab1dc89
* add provenance 7e40a49
* add-script and yamlloader 38208f0
* allow pm yto start 6a757f6
* artificial bump 8a83a60
* artificial bump c330b52
* artificial bump to force using latest tag on npm 6fe89ea
* **automate:** stdio 861db3c
* bump version dc1b5d3
* commands stay in order 3dd95c6
* **deps:** update dependency css-loader to v6 ab9ea98
* downgrade all packages to support both cjs and mjs cd58dc1
* embrace esm even more 07203e5
* embrace esm even more a0aae6a
* fix generate and tsconfig files f6e44d6
* http to support custom injector 87e4d42
* improve browser usage ac6f14b
* improve http implementation 625a1c6
* improve openapi support and json schema interpretation 071da4b
* made connect and fork more reliable and resilient ecb1b48
* make pm work with connect args 76d77dc
* move to ESM 6b55a07
* normalized modules to work in esm and cjs c9e7650
* path to container schema 9f4404e
* ready command in pm works in both forks and remote 31fde71
* remove asset command depending on webpack 65a2a35
* remove confusing inject property on commands 94e3058
* remove dependency to orchestrator 236504f
* remove webpack dependencies 7169047
* remove webpack dependency c29ed01
* remove winston dependency 026dabc
* revert some changes to fix build a67e5f7
* run f1ab48a
* sidecar command definition b03fb4c
* sidecar to remote containers 33df73e
* simplify http trigger d205f92
* start command dbdfc72
* switch from xml2js to fast-xml-parser a209063
* update after core breaking change 57734b2
* update after core breaking change be738bb
* update after trigger removal 2fcc52e
* update CLI definitions 5a31abe
* update dependencies and regenerate metadata 79412a7
* update jsdoc f1654fb
* update lock and commands.json files 6d828a3
* update lock file 960047c
* update package definitions e8f89f1
* update ready command for remote containers 18a555c
* update ready comment definition 7220126
* update to commands  major version a983298
* update to new branch json url 777d26d
* update ts generated files 0d778b5
* wrong version 1236381


### Features

* add reload-metadata on pm a28066f
* add serve cli 430dc61
* enable cli help/documentation 26eb4f3
* have both CJS and ESM at once b07f75b
* implement auth 273db35
* move to serve with AbortSignal 8449080
* removing problematic extend function 4a66e5a
* switched from raw debug to logger from core b2c7d2d
* update to ESM 500be75


### BREAKING CHANGES

* inject property does not exist on commands anymore
* extend helper no more is
* cli does not use winston as a logger anymore



