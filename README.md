# CDK Pipeline Lib

This construct library is meant to help create a CDK pipeline that accepts multiple sources.
For now the default is that there is a corresponding CodeBuild Project created for each input source.
The library also creates a corresponding Pipeline Stage that uses a single CodeBuild Action for each input source.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests

## Developer

### Local Setup
* See the [AWS CDK Docs](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html#getting_started_prerequisites) to set up working with the CDK 
  * `aws configure` to setup AWS configuration
  * `npm -g install typescript` to install TypeScript
  * `npm install -g aws-cdk` to install the CDK CLI tool
  * `cdk bootstrap aws://ACCOUNT-NUMBER/REGION` to bootstrap the CDK
* There is a git pre-commit hook that increments patch version automatically
  * Run `git config --local core.hooksPath .githooks/` to setup the local git pre-commit hook
  * Install the script dependencies `npm install json` and `npm install semver`

### Release Process
* Bump the version in `package.json` if needed
* When a commit is merged into the `main` branch, it is tagged with the `package.json` version
* Create a release using the newest created tag
* A GitHub action should publish a package