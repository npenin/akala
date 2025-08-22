---
title: AWS Lambda Module
---
# AWS Lambda Module

## Overview
The `aws-lambda` module provides utilities and abstractions for working with AWS Lambda functions within the Akala framework. It simplifies the process of creating, deploying, and managing Lambda functions.

## Installation
To install the `aws-lambda` module, use the following command:

```bash
npm install @akala/aws-lambda
```

## Usage
Import the module and use its features as follows:

```javascript
import * as awsLambda from '@akala/aws-lambda';

// Example usage
await awsLambda.deploy('functionName', 'path/to/code.zip');
```

## API Reference

| Method | Description |
| --- | --- |
| `deploy(functionName: string, codePath: string): Promise<void>` | Deploys a Lambda function with the specified name and code package. |
| `invoke(functionName: string, payload: any): Promise<any>` | Invokes the specified Lambda function with the provided payload. |

## Examples

### Deploy a Lambda Function
```javascript
import * as awsLambda from '@akala/aws-lambda';

async function deployFunction() {
    try {
        await awsLambda.deploy('myFunction', 'path/to/code.zip');
        console.log('Function deployed successfully');
    } catch (error) {
        console.error('Deployment failed', error);
    }
}

deployFunction();
```

### Invoke a Lambda Function
```javascript
import * as awsLambda from '@akala/aws-lambda';

async function invokeFunction() {
    try {
        const result = await awsLambda.invoke('myFunction', { key: 'value' });
        console.log('Function result:', result);
    } catch (error) {
        console.error('Invocation failed', error);
    }
}

invokeFunction();
```

## Contributing
Contributions are welcome! Please follow the guidelines in the main repository.

## License
This module is licensed under the MIT License. See the LICENSE file for details.
````

# Moving the file to a folder named `aws-lambda` and renaming it to `index.md`.