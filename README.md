# CDK Pipeline Lib

This construct library is meant to help create a CDK pipeline that accepts multiple sources.
For now the default is that there is a corresponding CodeBuild Project created for each input source.
The library also creates a corresponding Pipeline Stage that uses a single CodeBuild Action for each input source.

## Getting Started
Setup the local repo to pull the package from GitHub packages

Setup the registry for the `@masterofthebus` scope. Add the following to an `.npmrc` file
```
@masterofthebus:registry=https://npm.pkg.github.com
```

In order to allow pulling from the GitHub packages registry, you will need to authenticate to GitHub packages. Create a file in the user directory `~/.npmrc` and add the following. To generate a personal access token see [this link](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
```
//npm.pkg.github.com/:_authToken=<GitHub Personal Access Token>
```

After setting up the `.npmrc` install the package into dependencies by running
```
npm install @masterofthebus/cdk-pipeline-lib@0.1.6
```

## Usage

```
import { CodeStarConnectionDef, MultiSourcePipeline } from '@masterofthebus/cdk-pipeline-lib/lib';

export class CdkPipelineExampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
  
    // Other configurations...

    // The source definition
    const source = new CodeStarConnectionDef({
        // A CodeStar Connection ARN
        codeStarConnection: "arn:aws:codestar-connections:us-east-1:000000000000:connection/11111111-2222-3333-4444-555555555555",
        repo: "test-repo",
        repoOwner: "test-owner",
        branch: "main"
    });

    // Define the bucket to store the artifacts
    const bucket = new Bucket(stack, 'PipelineBucket');

    // The pipeline construct
    new MultiSourcePipeline(stack, 'MultiSourcePipline', {
        sources: [source],
        deployBucket: bucket
    });
    
    // Some more configurations
  }
}
```

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

### Building
Run `npx projen` to build

Run `npx projen build` to run a production build
