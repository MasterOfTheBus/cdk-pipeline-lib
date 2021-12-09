const { awscdk } = require('projen');
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Sidney Ng',
  authorAddress: 'yendisng@gmail.com',
  cdkVersion: '2.0.0',
  defaultReleaseBranch: 'main',
  name: 'cdk-pipeline-lib',
  repositoryUrl: 'git@github.com:MasterOfTheBus/cdk-pipeline-lib.git',

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
  // release: undefined,      /* Add release management to this project. */
});
project.synth();