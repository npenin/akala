#  (2025-02-22)


### Bug Fixes

* bug when each container contains other entries c2286ac
* prevent memory leak in controls when using bind e7a5512
* teardown accepts undefined or null without crashing ea62c94
* update after Binding and Observable breaking change in core 1a97991


### Code Refactoring

* move teardown manager to core 86374cf


### Features

* add class dom helper c2bc4af
* add possibility to find ancerstor control (like the closest feature) 372bbe4


### BREAKING CHANGES

* teardown manager is not available in client anymore
* c is now for classes, content is the new name of c



