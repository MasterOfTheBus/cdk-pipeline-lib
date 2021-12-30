import { BuildEnvironmentVariableType } from 'aws-cdk-lib/aws-codebuild';
import { Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { CodeBuildStep, CodePipeline, CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import { CodeStarConnectionDef } from './source-def';
import { UploadSourceS3Action } from './upload-source-action';

export interface CodePipelineConstructProps {
  // TODO: Better source definitions?
  pipelineSource: CodeStarConnectionDef;
  source: CodeStarConnectionDef;
  outputArtifact?: Artifact;
  artifactBucketArn?: string;
}

export class CodePipelineConstruct extends Construct {
  public readonly pipeline: CodePipeline;

  constructor(scope: Construct, id: string, props: CodePipelineConstructProps) {
    super(scope, id);

    const { pipelineSource, source, artifactBucketArn } = props;

    // Use a connection created using the AWS console to authenticate to GitHub
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
      synth: new CodeBuildStep('Synth', {
        input: pipelineSourceSet,
        buildEnvironment: {
          environmentVariables: {
            GITHUB_TOKEN: {
              value: 'github-token',
              type: BuildEnvironmentVariableType.SECRETS_MANAGER
            }
          }
        },
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
    const artifactBucket = artifactBucketArn
      ? Bucket.fromBucketArn(this, 'ArtifactBucket', artifactBucketArn)
      : new Bucket(scope, 'ArtifactBucket');
    this.pipeline.addWave('SourceBuild', {
      post: [
        new UploadSourceS3Action(`Build-Source-${source.repo}`, {
          input: sourceSet,
          sourceInfo: source,
          bucket: artifactBucket,
          outputArtifact: props.outputArtifact,
        }),
      ],
    });
  }
}

