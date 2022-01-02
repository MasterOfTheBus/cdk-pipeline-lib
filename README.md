# CDK Pipeline Lib

This construct library is meant to help create a CDK pipeline that accepts multiple sources.
For now the default is that there is a corresponding CodeBuild Project created for each input source.
The library also creates a corresponding Pipeline Stage that uses a single CodeBuild Action for each input source.

## Getting Started
Setup the local repo to pull the package from GitHub packages

### Installing
Setup the registry for the `@masterofthebus` scope. Add the following to an `.npmrc` file at the root of the project.
```
@masterofthebus:registry=https://npm.pkg.github.com
```

In order to allow pulling from the GitHub packages registry, you will need to authenticate to GitHub packages. Create a file in the user directory `~/.npmrc` and add the following. To generate a personal access token see [this link](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token). For more on authenticating with a PAT see the [docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-with-a-personal-access-token)
```
//npm.pkg.github.com/:_authToken=<GitHub Personal Access Token>
```

After setting up the `.npmrc` install the package into dependencies by running
```
npm install @masterofthebus/cdk-pipeline-lib@0.1.6
```

### Setting up an Artifact Bucket
If you want to setup an S3 bucket to store build artifacts to be used by the app, the bucket needs to be created ahead of time.

## Usage
See https://github.com/MasterOfTheBus/cdk-pipeline-example for an example.

Setup the CloudFormation stack for the pipeline by creating a Stack class that instantiates the `CodePipelineConstruct` class.
```
export class CdkPipelineExampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Defines the information for the pipeline source. This is the repo where this class is defined.
    const pipelineSource = new CodeStarConnectionDef({
      // A CodeStar Connection ARN
      codeStarConnection: "arn:aws:codestar-connections:us-east-1:025257542471:connection/b53232ef-36cd-40e2-90ce-4bed059aed57",
      repo: "cdk-pipeline-example",
      repoOwner: "MasterOfTheBus",
      branch: "main"
    });

    // Defines the information for the source code of you app. It can be any other repo.
    const codeSource = new CodeStarConnectionDef({
      // A CodeStar Connection ARN
      codeStarConnection: "arn:aws:codestar-connections:us-east-1:025257542471:connection/b53232ef-36cd-40e2-90ce-4bed059aed57",
      repo: "test_lambda_deploy",
      repoOwner: "MasterOfTheBus",
      branch: "main"
    });

    // The bucket ARN that stores build artifacts used by the lambda
    const bucketArn = 'arn:aws:s3:::sng-lambda-deployments-bucket';
    // The S3 object key for the build artifact 
    const artifactKey = 'artifacts.zip';

    // Instantiates the CodePipeline
    const pipeline = new CodePipelineConstruct(this, 'CodePipeline', {
      pipelineSource: pipelineSource,
      source: codeSource,
      artifactBucketArn: bucketArn,
      artifactKey: artifactKey,
      githubUser: 'masterofthebus',
      githubEmail: 'yendisng@gmail.com'
    });

    // Use the pipeline property to add stages.
    pipeline.pipeline.addStage(
      new MyPipelineAppStage(this ,'TestLambda', bucketArn, `${codeSource.repo}/${artifactKey}`, {
        env: { account: '025257542471', region: 'us-east-1' }
      })
    )
  }
}
```

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
