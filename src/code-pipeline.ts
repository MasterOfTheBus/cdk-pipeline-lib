import { Bucket } from 'aws-cdk-lib/aws-s3';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import { CodeStarConnectionDef } from './source-def';
import { UploadSourceS3Action } from './upload-source-action';

export interface CodePipelineConstructProps {
  // TODO: Better source definitions?
  pipelineSource: CodeStarConnectionDef;
  source: CodeStarConnectionDef;
  artifactBucket?: Bucket;
}

export class CodePipelineConstruct extends Construct {
  public readonly pipeline: CodePipeline;
  public readonly artifactBucket: Bucket;

  constructor(scope: Construct, id: string, props: CodePipelineConstructProps) {
    super(scope, id);

    const { pipelineSource, source, artifactBucket } = props;

    const pipelineSourceSet = CodePipelineSource.connection(
      `${pipelineSource.repoOwner}/${pipelineSource.repo}`,
      pipelineSource.branch,
      { connectionArn: pipelineSource.codeStarConnection },
    );

    const sourceSet = CodePipelineSource.connection(
      `${source.repoOwner}/${source.repo}`,
      source.branch,
      { connectionArn: source.codeStarConnection },
    );

    this.pipeline = new CodePipeline(this, 'Pipeline', {
      synth: new ShellStep('Synth', {
        // Use a connection created using the AWS console to authenticate to GitHub
        // Other sources are available.
        input: pipelineSourceSet,
        additionalInputs: {
          source: sourceSet,
        },
        commands: [
          'npm ci',
          'npm run build',
          'npx cdk synth',
        ],
      }),
    });

    // Create the artifact bucket if not defined
    this.artifactBucket = artifactBucket ? artifactBucket : new Bucket(scope, 'ArtifactBucket');
    this.pipeline.addWave('SourceBuild', {
      post: [
        new UploadSourceS3Action(`Build-Source-${source.repo}`, {
          input: sourceSet,
          sourceInfo: source,
          bucket: this.artifactBucket,
        }),
      ],
    });
  }
}

