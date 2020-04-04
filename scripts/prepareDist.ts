#!/usr/bin/env node
// tslint:disable:no-console

import path = require("path");
import { readFileSync, writeFileSync } from "fs-extra";
import { execSync } from "child_process";
import { copyFile } from "./_utils";

const root = path.resolve(__dirname, "..");
const commitHash = execSync("git rev-parse HEAD")
  .toString()
  .trim();

async function injectDependencies(
  folder: string,
  dependencies: string[],
  devDependency = false
) {
  console.log(
    `> update ${folder}/package.json (injecting dependencies & version)`
  );
  {
    const file = path.resolve(root, `${folder}/package.json`);
    const packageJson = JSON.parse(readFileSync(file).toString());
    const localPackageJson = JSON.parse(
      readFileSync(path.resolve(root, `package.json`)).toString()
    );

    const deps = new Set(dependencies);

    const target = devDependency ? "devDependencies" : "dependencies";

    packageJson[target] = packageJson[target] || {};

    deps.forEach(dep => {
      if (localPackageJson.dependencies[dep]) {
        packageJson[target][dep] = localPackageJson.dependencies[dep];
        deps.delete(dep);
        console.log(`  using dependency: ${dep}@${packageJson[target][dep]}`);
      }
    });

    deps.forEach(dep => {
      if (localPackageJson.devDependencies[dep]) {
        packageJson[target][dep] = localPackageJson.devDependencies[dep];
        deps.delete(dep);
        console.log(
          `  using devDependency: ${dep}@${packageJson[target][dep]}`
        );
      }
    });

    if (deps.size) {
      throw new Error(
        `Missing dependencies "${Array.from(deps).join('", "')}"`
      );
    }

    packageJson.version = localPackageJson.version;
    packageJson.license = localPackageJson.license;
    packageJson.author = localPackageJson.author;

    writeFileSync(file, JSON.stringify(packageJson, null, 2));
  }
}

async function prepareDecentralandECS(folder: string) {
  await validatePackage(folder);
  copyFile(
    path.resolve(root, `packages/ulla-amd/dist/amd.js`),
    path.resolve(root, `${folder}/artifacts/amd.js`)
  );
  copyFile(
    path.resolve(root, `packages/ulla-builder/index.js`),
    path.resolve(root, `${folder}/artifacts/ulla-builder.js`)
  );
}

async function validatePackage(folder: string) {
  console.log(`> update ${folder}/package.json commit`);
  {
    const file = path.resolve(root, `${folder}/package.json`);
    const packageJson = JSON.parse(readFileSync(file).toString());

    packageJson.commit = commitHash;

    console.log(`  commit: ${commitHash}`);
    writeFileSync(file, JSON.stringify(packageJson, null, 2));
  }
}

// tslint:disable-next-line:semicolon
(async function() {
  await prepareDecentralandECS("packages/ulla-ecs");
  await copyFile("LICENSE", "packages/ulla-ecs/LICENSE");
  await copyFile("NOTICE", "packages/ulla-ecs/NOTICE");

  await copyFile("LICENSE", "packages/ulla-compiler/LICENSE");
  await copyFile("NOTICE", "packages/ulla-compiler/NOTICE");

  await copyFile("LICENSE", "packages/ulla-builder/LICENSE");
  await copyFile("NOTICE", "packages/ulla-builder/NOTICE");

  await injectDependencies(
    "packages/ulla-ecs",
    ["typescript", "uglify-js"],
    false
  );
  await injectDependencies(
    "packages/ulla-builder",
    ["typescript", "uglify-js"],
    false
  );
  await injectDependencies("packages/ulla-compiler", ["typescript"], false);
})().catch(e => {
  // tslint:disable-next-line:no-console
  console.error(e);
  process.exit(1);
});
