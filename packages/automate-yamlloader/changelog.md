#  (2024-10-08)


### Bug Fixes

* add node as an export condition 2e70542
* add-script and yamlloader 38208f0
* added missing yaml dependency 42735bd
* allow pm yto start 6a757f6
* artificial bump c330b52
* artificial bump to force using latest tag on npm 6fe89ea
* bump version dc1b5d3
* bump version because of previous workflow failures 60372e0
* downgrade all packages to support both cjs and mjs cd58dc1
* embrace esm even more 07203e5
* embrace esm even more a0aae6a
* fix generate and tsconfig files f6e44d6
* move to ESM 6b55a07
* normalized modules to work in esm and cjs c9e7650
* remove winston dependency 026dabc
* update dependencies and regenerate metadata 79412a7
* update lock file 960047c
* update package definitions e8f89f1
* update to new branch json url 777d26d
* wrong version fe315f3
* yaml workflow loader implementation 1e01ca6


### Features

* deprecate CJS implemtations for many packages bcddb76
* have both CJS and ESM at once b07f75b
* update to ESM 500be75


### BREAKING CHANGES

* CJS is no more supported
* cli does not use winston as a logger anymore



