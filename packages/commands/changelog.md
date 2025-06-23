#  (2025-06-23)


### Bug Fixes

* each container in commands cli has its own configuration section 415e113
* enhance relative path handling in FileSystem class for improved URL processing 613e87e
* improve error handling in JsonRpc and JsonRpcBrowser classes by adding try-catch around sendMethod calls 3a537b9
* relative extends maps to relative files 2402375
* remove unused close function to clean up code e100b49
* remove unused fsHandler import and streamline outputFs initialization ed6981d
* simplify URL handling in install function by removing unnecessary try-catch and improving path resolution df95034
* update file path handling to use relative paths for better compatibility 65507c2
* update filepath handling in FileSystem class to use toImportPath method 058a81a
* update outputHelper function to include outputFs parameter and improve file system handling 5a0cfcd
* update protocolHandler to correctly set relativeTo and improve directory handling dca8258


### Code Refactoring

* update file handling and output methods to use WritableStreamDefaultWriter 38ccdd5


### BREAKING CHANGES

* FileSystem needs a FileSystemProvider as constructor parameter
* FileGenerator returns outputFs and not outputFolder anymore
* FileGenerator output is now a web WritableStream



