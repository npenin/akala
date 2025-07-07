#  (2025-07-07)


### Bug Fixes

* make event keys match types properly 1c71c4b
* make fromEvent bind only once dd7addd


### Code Refactoring

* revisit typing on event emitters and event buses 91e60ba


### Features

* add Context interface e5de88f
* add findIndex on ObservableArray 844a29c
* add fromAsyncEventBus 70ec690
* add fromEventBus to promise a5391dc
* allow promised subscriptions to be tearred down 74aaa72
* allow typed event buses resolution 140bf5a
* export EventMap f89264a


### BREAKING CHANGES

* some implementors might break during build



