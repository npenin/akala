# akala-client

Akala client framework aims to provide the same feature set that angualar is able to provide. Leveraging [akala-core](//github.com/npenin/akala-core), it provides :

- scope
- controls
- services
- formatters (angular-like pipes)

## Controls
  
  | Name | Description |
  | --- | --- |
  | click | binds a function to a click event  |
  | value | binds a scope property (path) to an input |
  | each | loops over a source and duplicate the binding on which it is defined |
  | part | provides an advanced way of including and/or defining placeholders for inclusion |
  | klass | binds classes on properties of the scope |
  | text | binds the inner text on properties of the scope |
  
## Services
  
  | Name | Description |
  | --- | --- |
  | $http | provides an easy way to do http requests |
  | $template | service allowing the template feature |
  | $outlet | service for the part control. Can be used to create controls with templates |
  | $router | service that binds on the location service and run the code of the most appropriate route. The routing is provided using a browserified version of [expressjs](https://expressjs.com) |
  | $location | service binding on location changes |
  