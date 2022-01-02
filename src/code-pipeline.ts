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
  githubUser: string;
  githubEmail: string;
  outputArtifact?: Artifact;
  artifactBucketArn?: string;
  artifactKey?: string;
}

export class CodePipelineConstruct extends Construct {
  public readonly pipeline: CodePipeline;

  constructor(scope: Construct, id: string, props: CodePipelineConstructProps) {
    super(scope, id);

    const { pipelineSource, source, githubUser, githubEmail, outputArtifact, artifactBucketArn, artifactKey } = props;

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
            GITHUB_USER: {
              value: githubUser,
              type: BuildEnvironmentVariableType.PLAINTEXT,
            },
            GITHUB_TOKEN: {
              value: 'github-token',
              type: BuildEnvironmentVariableType.SECRETS_MANAGER,
            },
            USER_EMAIL: {
              value: githubEmail,
              type: BuildEnvironmentVariableType.PLAINTEXT,
            },
          },
        },
        additionalInputs: {
          source: sourceSet,
        },
        installCommands: [
          'npm install -g npm-cli-login',
        ],
        commands: [
          'npm-cli-login -u $GITHUB_USER -p $GITHUB_TOKEN -e $USER_EMAIL -r https://npm.pkg.github.com',
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
    const artifactS3Key = artifactKey
      ? artifactKey
      : 'artifact.zip';
    this.pipeline.addWave('SourceBuild', {
      post: [
        new UploadSourceS3Action(`Build-Source-${source.repo}`, {
          input: sourceSet,
          sourceInfo: source,
          bucket: artifactBucket,
          artifactKey: artifactS3Key,
          outputArtifact: outputArtifact,
        }),
      ],
    });
  }
}

