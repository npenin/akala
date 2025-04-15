---
title: Semantic Release Module
---
# Semantic Release Module

## Overview
The `semantic-release` module automates the versioning and publishing of packages based on semantic versioning rules. It integrates with CI/CD pipelines to ensure consistent releases.

## Installation
To install the `semantic-release` module, use the following command:

```bash
npm install @akala/semantic-release
```

## Usage
One of the typical usecase is to use within you CI/CD.

Here is an example using Github actions

```yaml
      - name: publish updates
        run: akala-automate-runner --loader @akala/automate-yamlloader --file @akala/semantic-release/publish.yml --verbose=silly --branch=${{github.ref_name}}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          YARN_NPM_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          DEBUG_DEPTH: 4

```

## Contributing
Contributions are welcome! Please follow the guidelines in the main repository.

## License
This module is licensed under the MIT License. See the LICENSE file for details.
