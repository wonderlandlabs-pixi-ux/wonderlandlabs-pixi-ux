# Docs App

Docusaurus docs app for the `@wonderlandlabs-pixi-ux` monorepo.

Package pages under `apps/docs/docs/packages/*.md` are generated from `packages/*/README.md` and package topic files such as `packages/*/README.*.md`.
Use `yarn workspace @wonderlandlabs-pixi-ux/docs sync:package-docs` to refresh them manually.

## Run

```bash
yarn workspace @wonderlandlabs-pixi-ux/docs start
```

## Build

```bash
yarn workspace @wonderlandlabs-pixi-ux/docs build
```

## Bitbucket Deploy

This repo publishes docs to:

- `https://wonderlandlabs.bitbucket.io/wonderlandlabs-pixi-ux/`

Pipeline file:

- `bitbucket-pipelines.yml`

Required repository variables in Bitbucket (`wonderlandlabs-pixi-ux` repo):

- `BB_DEPLOY_USERNAME`: Bitbucket username with access to `wonderlandlabs.bitbucket.io`
- `BB_DEPLOY_APP_PASSWORD`: app password for that user (repo read/write)

Optional variables:

- `DEPLOY_GIT_NAME`
- `DEPLOY_GIT_EMAIL`
- `DOCS_DEPLOY_SUBDIR` (defaults to current repo slug)
- `DEPLOY_TARGET_BRANCH` (defaults to `main`)
