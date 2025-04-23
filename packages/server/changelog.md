#  (2025-04-23)


### Bug Fixes

* add InitAkala and AuthHandler on server 54f96ca
* enhance HTTP response handling for different content types 4bc375e
* fallthrough on 404 a8d70b5
* handle upper case methods b915081
* improve error handling in HTTP command wrapping 42daa25
* return 204 when no content 5f4185c
* sonarqube warning 4b5de76
* store relative staticFolders 30863ce
* subpath api routing 2f6623e
* update serve function to accept URL objects instead of strings 51f45ec


### chore

* rename from master to main f0da297


### Features

* add api serving on akala CLI b649800
* add fallthrough option to cover additional registration in router feb46b4
* add staticFolders to config 0106e9f
* extend AkalaConfig to include API URLs and enhance URL handling in plugin efbebca
* implement dynamic routing based on URL pathname in server handlers f73ea99
* include URI in request logging for improved traceability 6e4418a


### BREAKING CHANGES

* $masterRouter becomes $mainRouter
* `set-serve` has been replaced with `serve --set`



