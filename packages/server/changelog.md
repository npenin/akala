#  (2025-04-15)


### Bug Fixes

* cleanup dependencies 7d25a0d
* update after core breaking change 78576ba


### Features

* add uri on request to be able to know the full url of a request 3ed1dd0
* akala plugin implementation d050e1a
* export serverHandlers and new serve function to quickly build servers e6fc0ea
* expose extendRequest 009dcb6
* expose more middlewares 24e8e4a
* formatters can be registered by priority 1204aa8
* provide serverHandlers in addition to the commandServerHandlers registration 0d4ee97


### BREAKING CHANGES

* you need to provide priority when registering a formatter



