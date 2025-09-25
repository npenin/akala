#  (2025-09-25)


### Bug Fixes

* add missing $defs attribute 102e668
* typo in enum generation 3e236e4


### Code Refactoring

* remove legacy NetSocketAdapter in favor or @akala/core/TcpSocketAdapter 6a4de9f


### Features

* allow for enum implementation from json schema 9663251
* **commands:** Enhance CLI new command to support optional result type and pre/post 6fdcd4a
* export type JsonSchema d251e81
* leverage json schema to generate proper types during implement 6c47750


### BREAKING CHANGES

* NetSocketAdapter does not exist any more



