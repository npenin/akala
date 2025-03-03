# Welcome

Akala client framework aims to provide the same feature set that angualar is able to provide. Leveraging [akala-core](../core), it provides :

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
  | [DataContext ([data-context])](composers/datacontext) | allows to define a data context to which you will bind your data. This works similarly to the data context in .NET WPF. |
  | [DataBind ([data-bind])](composers/databind) | binds properties of the data context to your element (that can be style, innerText, ...). |
  | [CssClass ([klass])](composers/klass) | binds css classes to your data context (this works similarly to the ngClass from angular). |
  | [I18n ([i18n])](composers/i18n) | i18n tries to solve the internationalization problem than any application faces. |
  | [Form (&lt;form&gt;)](composers/form) | if a [container](../_commands) is accessible from the current data context, the form composer will try to invoke the command with the **html** trigger |
  
## Controls
  
  | Name | Description |
  | --- | --- |
  | [Each](controls/each) | if a [container](../commands) is accessible from the current data context, the form composer will try to invoke the command with the **html** trigger |
  
## Services
  
  | Name | Description |
  | --- | --- |
  | [$http](services/http) | provides an easy way to do http requests |
  | [$template](services/template) | service allowing the template feature |
  | [$outlet](services/outlet) | service for the part control. Can be used to create controls with templates |
  | [$router](services/router) | service that binds on the location service and run the code of the most appropriate route. The routing is provided using a *browserified* version of [expressjs](https://expressjs.com) |
  | [$location](services/location) | service binding on location changes |
  