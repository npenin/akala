#  (2025-02-22)


### Bug Fixes

* getValue detects ObservableArray 275e4ec
* improve support for formatexpression b6e1989
* visitFormat provides updated settings value ea670af


### Features

* add async array formatter b9cc087
* add more proxy function to make observablearray look like an array 40918c2
* add more proxy function to make observablearray look like an array 7c5b9ff
* add number indexes on observable arrays c00db2c
* add sort on observable arrays aeb7d22
* export formatters 0769f69
* make ObservableArray as [watcher] too bc80268


### BREAKING CHANGES

* watcher symbol may return ObservableArray or ObservableObject instead of just ObservableObject
* binding.pipe does not accept a boolean triggerOnRegister anymore. This is now covered in subsequent onChanged subscription
* ObservableArray do not have init anymore. This is now covered at event subscription time



