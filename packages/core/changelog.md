#  (2025-04-15)


### Bug Fixes

* base64UrlEncode properly strips = 54ca5ff
* bug when result is null b6a9828
* case when x is null 8c0dd0d
* cleanup dependencies 7d25a0d
* improve serialize on http af3373b


### Code Refactoring

* replace void with undefined as NextParam 34fcf2a


### Features

* allow not assigning result as last parameter cbc28b4
* errorWithStatus can be assigned a name 45c77e4


### BREAKING CHANGES

* NextParam cannot be void anymore. To compensate and help refactoring, a NotHandled const has been created.



