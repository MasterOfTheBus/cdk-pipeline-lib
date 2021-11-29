import * as cdk from '@aws-cdk/core';
// import * as sqs from '@aws-cdk/aws-sqs';

export interface CdkPipelineLibProps {
  // Define construct properties here
}

export class CdkPipelineLib extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkPipelineLibProps = {}) {
    super(scope, id);

    // Define construct contents here

    // example resource
    // const queue = new sqs.Queue(this, 'CdkPipelineLibQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
