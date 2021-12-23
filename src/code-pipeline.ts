import { CodeBuildStep, CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import { CodeStarConnectionDef } from './source-def';

export interface CodePipelineConstructProps {
  // TODO: Better source definitions?
  pipelineSource: CodeStarConnectionDef;
  source: CodeStarConnectionDef;
}

export class CodePipelineConstruct extends Construct {
  public readonly pipeline: CodePipeline;

  constructor(scope: Construct, id: string, props: CodePipelineConstructProps) {
    super(scope, id);

    const pipelineSource = props.pipelineSource;
    this.pipeline = new CodePipeline(this, 'Pipeline', {
      synth: new ShellStep('Synth', {
        // Use a connection created using the AWS console to authenticate to GitHub
        // Other sources are available.
        input: CodePipelineSource.connection(
          `${pipelineSource.repoOwner}/${pipelineSource.repo}`,
          pipelineSource.branch ? pipelineSource.branch : 'main',
          { connectionArn: pipelineSource.codeStarConnection },
        ),
        commands: [
          'npm ci',
          'npm run build',
          'npx cdk synth',
        ],
      }),
    });

    // TODO: additionalInputs for multiple sources
    const source = props.source;
    this.pipeline.addWave('SourceBuild', {
      post: [
        new CodeBuildStep(`Build-Source-${source.repo}`, {
          commands: source.buildCommands,
          input: CodePipelineSource.connection(
            `${source.repoOwner}/${source.repo}`,
            source.branch,
            { connectionArn: source.codeStarConnection },
          ),
        }),
      ],
    });
  }
}

