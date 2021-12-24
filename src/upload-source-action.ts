import { IStage } from 'aws-cdk-lib/aws-codepipeline';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { CodePipelineActionFactoryResult, ICodePipelineActionFactory, IFileSetProducer, ProduceActionOptions, Step } from 'aws-cdk-lib/pipelines';
import { CodeBuildProjectConstruct } from './code-build-project';
import { SourceDef } from './source-def';

export interface UploadSourceS3ActionProps {
  input: IFileSetProducer;
  bucket: Bucket;
  sourceInfo: SourceDef;
}

export class UploadSourceS3Action extends Step implements ICodePipelineActionFactory {
  private input: IFileSetProducer;
  private bucket: Bucket;
  private sourceInfo: SourceDef;

  constructor(id: string, props: UploadSourceS3ActionProps) {
    super(id);

    this.input = props.input;
    this.bucket = props.bucket;
    this.sourceInfo = props.sourceInfo;
  }

  produceAction(stage: IStage, options: ProduceActionOptions): CodePipelineActionFactoryResult {
    // Map the input to an artifact
    const fileSet = this.input.primaryOutput;
    if (!fileSet) {
      throw new Error(`'${this.id}': primary input should produce a file set, got ${this.input}`);
    }
    const sourceArtifact = options.artifacts.toCodePipeline(fileSet);

    const construct = new CodeBuildProjectConstruct(options.scope, `BuildConstruct-${this.sourceInfo.repo}`, {
      sourceArtifact: sourceArtifact,
      sourceInfo: this.sourceInfo,
      deployBucket: this.bucket,
    });

    stage.addAction(construct.buildAction);

    // TODO: Is this needed?
    // stage.addAction(new S3DeployAction({
    //     actionName: options.actionName,
    //     bucket: this.bucket,
    //     input: uploadArtifact
    // }));

    return { runOrdersConsumed: 1 };
  }

}
