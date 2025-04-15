#  (2025-04-15)


### Bug Fixes

* cleanup dependencies 7d25a0d
* improve discovery 3e0d64b
* improve formatter behavior 30996cd
* many fixes (still not prod ready) a440f8a
* oidc discover properly returns options for authorize, token and keys b92665c
* remove cjs reference 2284b79
* update after core breaking change 64f8764


### Features

* add cookie support + add IdStore and IdSerializer interfaces c5a5d6a
* add oidc formatter factory fba4a73


### BREAKING CHANGES

* discover returns  a fully typed metadata object
* client redirectUri changed to redirectUris



