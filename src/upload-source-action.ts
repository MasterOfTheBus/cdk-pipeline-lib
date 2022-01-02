import { Artifact, IStage } from 'aws-cdk-lib/aws-codepipeline';
import { S3DeployAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { CodePipelineActionFactoryResult, ICodePipelineActionFactory, IFileSetProducer, ProduceActionOptions, Step } from 'aws-cdk-lib/pipelines';
import { CodeBuildProjectConstruct } from './code-build-project';
import { SourceDef } from './source-def';

export interface UploadSourceS3ActionProps {
  input: IFileSetProducer;
  bucket: IBucket;
  artifactKey: string;
  sourceInfo: SourceDef;
  outputArtifact?: Artifact;
}

export class UploadSourceS3Action extends Step implements ICodePipelineActionFactory {
  private input: IFileSetProducer;
  private bucket: IBucket;
  private artifactKey: string;
  private sourceInfo: SourceDef;
  private outputArtifact?: Artifact;

  constructor(id: string, props: UploadSourceS3ActionProps) {
    super(id);

    this.input = props.input;
    this.bucket = props.bucket;
    this.artifactKey = props.artifactKey;
    this.sourceInfo = props.sourceInfo;
    this.outputArtifact = props.outputArtifact;
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
      outputArtifact: this.outputArtifact,
    });

    stage.addAction(construct.buildAction);

    // Upload to S3
    stage.addAction(new S3DeployAction({
      actionName: options.actionName,
      bucket: this.bucket,
      input: construct.outputArtifact,
      extract: false,
      objectKey: `${this.sourceInfo.repo}/${this.artifactKey}`,
      runOrder: 2,
    }));

    return { runOrdersConsumed: 1 };
  }

}
