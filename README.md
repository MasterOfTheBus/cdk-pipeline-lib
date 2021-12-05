# Welcome to your CDK TypeScript Construct Library project!

You should explore the contents of this project. It demonstrates a CDK Construct Library that includes a construct (`CdkPipelineLib`)
which contains an Amazon SQS queue that is subscribed to an Amazon SNS topic.

The construct defines an interface (`CdkPipelineLibProps`) to configure the visibility timeout of the queue.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests

## Developer

### Release Process
* Bump the version in `package.json`
* When a commit is merged into the `main` branch, it is tagged with the `package.json` version
* Create a release using the newest created tag
* A GitHub action should publish a package