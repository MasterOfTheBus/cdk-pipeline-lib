import { Artifacts, Project, Source, FilterGroup, EventAction } from 'aws-cdk-lib/aws-codebuild';
import { Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { Action, CodeBuildAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { SourceDef } from './source-def';

export interface CodeBuildConstructProps {
  sourceArtifact: Artifact;
  sourceInfo: SourceDef;
  deployBucket: IBucket;
  outputArtifact?: Artifact;
}

export class CodeBuildProjectConstruct extends Construct {
  public readonly buildAction: Action;
  public readonly outputArtifact: Artifact;

  constructor(scope: Construct, id: string, props: CodeBuildConstructProps) {
    super(scope, id);

    const { sourceArtifact, deployBucket, outputArtifact } = props;
    const { repo, repoOwner, branch } = props.sourceInfo;

    // Define the CodeBuild Project
    const project = new Project(this, `SourceBuildProject-${repo}`, {
      projectName: `Project-${repo}`,
      source: Source.gitHub({
        owner: repoOwner,
        repo: repo,
        webhook: true,
        webhookFilters: [
          FilterGroup
            .inEventOf(EventAction.PUSH)
            .andBranchIs(branch),
        ],
      }),
      artifacts: Artifacts.s3({
        bucket: deployBucket,
        includeBuildId: false, // Don't use the build id so that we can specify the path
        path: repo,
        // TODO: Identifier?
      }),
    });

    this.outputArtifact = outputArtifact ? outputArtifact : new Artifact();
    this.buildAction = new CodeBuildAction({
      actionName: `Build-${repo}`,
      project: project,
      input: sourceArtifact,
      outputs: [this.outputArtifact],
    });
  };
}
