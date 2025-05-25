#  (2025-05-25)


### Bug Fixes

* add IPC socket argument for nodejs process creation 87425d8
* add signal propagation cf81d93
* disable jsonrpc run 7aea19a
* discover enforces nodejs runtime 09fb7b3
* enforce run to execute with fs 01fde68
* enforce type on config 9d8bc0f
* propagate the abort reason d3df91f
* stop in process runtime d49bb87


### Features

* add backChannelContainer a5c1ecf
* add IPC protocol handler for improved inter-process communication 96b2326
* add runtime on RuntimeInstance 008d85a
* add type to status fb8961e


### BREAKING CHANGES

* RuntimeInstance have a mandatory runtime attribute
* map expects a runtime



