#  (2025-04-26)


### Bug Fixes

* cleanup dependencies d4f9ef0
* http support on `add user` function 0281cb8
* http support on `add user` function 23bf973
* implements the discover function 0bf23ac
* implements the discover function b400c4d
* improve discovery 31bdd8a
* improve formatter behavior 954fd43
* many fixes (still not prod ready) d4f40d2
* oidc discover properly returns options for authorize, token and keys 0934291
* remove cjs reference e501923
* testing command bindings and auth 888755a
* testing command bindings and auth 96220e8
* update after core breaking change f571a17
* update after storage breaking change on providers b7492a2
* update after storage breaking change on providers 91b6037
* update grant_types_supported to use keyof for compatibility ec88441
* update grant_types_supported to use keyof for compatibility 49f93de
* update keyPath references and improve password handling in authentication commands 9e74b5b
* update to support login redirect d2e8e6e


### Features

* add cookie support + add IdStore and IdSerializer interfaces 2e3b84d
* add cryptokey to state 2117314
* add cryptokey to state 4337e56
* add oidc formatter factory 11b2d52


### BREAKING CHANGES

* discover returns  a fully typed metadata object
* client redirectUri changed to redirectUris



