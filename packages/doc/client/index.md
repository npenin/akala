# Welcome

Akala client framework aims to provide the same feature set that angualar is able to provide. Leveraging [akala-core](//github.com/npenin/akala-core), it provides :

- scope
- composers
- controls
- services
- formatters (angular-like pipes)

## Get started

To get started, just follow the [instructions](getting-started)

## Composers

  | Name (selector) | Description |
  | --- | --- |
  | [DataContext ([data-context])](datacontext) | allows to define a data context to which you will bind your data. This works similarly to the data context in .NET WPF. |
  | [DataBind ([data-bind])](databind) | binds properties of the data context to your element (that can be style, innerText, ...). |
  | [CssClass ([klass])](klass) | binds css classes to your data context (this works similarly to the ngClass from angular). |
  | [I18n ([i18n])](i18n) | i18n tries to solve the internationalization problem than any application faces. |
  | [Form (&lt;form&gt;)](form) | if a [container](/core/commands) is accessible from the current data context, the form composer will try to invoke the command with the **html** trigger |
  
## Controls
  
  | Name | Description |
  | --- | --- |
  | [Form (&lt;form&gt;)](form) | if a [container](/core/commands) is accessible from the current data context, the form composer will try to invoke the command with the **html** trigger |
  
## Services
  
  | Name | Description |
  | --- | --- |
  | $http | provides an easy way to do http requests |
  | $template | service allowing the template feature |
  | $outlet | service for the part control. Can be used to create controls with templates |
  | $router | service that binds on the location service and run the code of the most appropriate route. The routing is provided using a browserified version of [expressjs](https://expressjs.com) |
  | $location | service binding on location changes |
  