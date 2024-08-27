#  (2024-08-27)


### Bug Fixes

* add provenance 8485880
* allow more general pages e3183ad
* allow non existent form elements f66a4f9
* allow pm yto start d498d2b
* allow style setting 05b1266
* artificial bump 59763e7
* artificial bump to force using latest tag on npm b3882a7
* client outlet commands management 5533e79
* **client:** simplify inheritance chain 91573ab
* composers are now returning disposables but are not async anymore 87dfcce
* data-bind with object 2f089e5
* export proper webcomponent decorator 37be990
* gives scope as a parameter and not the binding scope 964080f
* hotreplace supports watch dad4897
* implement real world Page class 5915665
* improve i18n to provide html in case we are replacing innerText 7d1007c
* make page and Scope available to the wild a613874
* refactor after core helpers removal 2224c96
* remove legacy controls d7082d2
* rename to TeardownManager deb360c
* support outlet cleanup 0e1d206
* trying to make Page as PageWithOutlet b642699
* update after core breaking change 4291683
* update after core breaking change d0849e5
* update after core changes 66a1ca7
* update after core changes 576dc73
* update lock file 3576076
* webcomponent implementation 2fe5b2e


### Features

* add Control base class d20a03b
* add cssclasscomposer 7f581e4
* add event and i18n composers 2b98ed5
* add FormComposer and other helpers to simplify rampup 95887d2
* add optionGetter instead of optionName on composers adfb1e0
* add scope injection token c79c09c
* add web component decorator 0083280
* allow state in events 925d85b
* allow translator to receive current values 905c5a7
* **client:** allow relative URL building from current URL aed194f
* deprecate CJS implemtations for many packages bde4b1c
* implements new controls 9a16e1b
* part watches for data changes 32cdc0b
* remove asynchronicity in controls 7ba4b4c
* remove circular dependency between controls and template + export template cache to help having hot reload b71ba32
* rename part to outlet 51dc808
* use existing dispose symbol and template needs disposable 0af55b0


### BREAKING CHANGES

* CJS is no more supported
* SubscriptionManager renamed to TeardownManager
* old controls are removed
* DataBindComposer is not registered by default
* controls do  instanciate asynchronously anymore
* previous controls are not working any more
* rename part to outlet
* rename $$injector to bootstrapModule



