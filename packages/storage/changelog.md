#  (2025-04-26)


### Bug Fixes

* DataInjector inherits SimpleInjector cb22e64
* handle case when url pathname is empty b44a1dc
* make rawQuery support optional 6050617
* update file command processor to generate UUID only when record key is absent 4c5ff85


### Features

* `providers` uses UrlHandler instead of module b228f89
* add raw query and custom resolvers 19a38cc


### BREAKING CHANGES

* Persistence engines now need to support raw queries
* `providers` uses UrlHandler instead of module



