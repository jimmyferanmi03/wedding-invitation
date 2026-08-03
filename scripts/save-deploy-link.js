const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const packageJson = require('../package.json');
const outputPath = path.join(__dirname, '..', 'deployment-link.txt');

function parseGitHubRemote(remote) {
  const sshMatch = remote.match(/git@github\.com:(?<owner>[^/]+)\/(?<repo>[^/.]+)(?:\.git)?$/);
  if (sshMatch && sshMatch.groups) return sshMatch.groups;

  const httpsMatch = remote.match(/https:\/\/github\.com\/(?<owner>[^/]+)\/(?<repo>[^/.]+)(?:\.git)?$/);
  if (httpsMatch && httpsMatch.groups) return httpsMatch.groups;

  return null;
}

function getDeploymentUrl() {
  if (process.env.DEPLOY_URL) {
    return process.env.DEPLOY_URL.replace(/\s+$/, '');
  }

  if (process.env.GITHUB_REPOSITORY) {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    if (owner && repo) {
      return `https://${owner}.github.io/${repo}/`;
    }
  }

  if (packageJson.homepage) {
    return packageJson.homepage.replace(/\s+$/, '');
  }

  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const repoInfo = parseGitHubRemote(remoteUrl);
    if (repoInfo) {
      return `https://${repoInfo.owner}.github.io/${repoInfo.repo}/`;
    }
  } catch (error) {
    // ignore and fallback
  }

  return `https://${packageJson.name}.github.io/`;
}

const deploymentUrl = getDeploymentUrl();
fs.writeFileSync(outputPath, `${deploymentUrl}\n`, 'utf8');
console.log(`Saved deployment URL to ${outputPath}`);
console.log(deploymentUrl);

const readmePath = path.join(__dirname, '..', 'README.md');
const markerStart = '<!-- DEPLOY_LINK_START -->';
const markerEnd = '<!-- DEPLOY_LINK_END -->';
try {
  const readme = fs.readFileSync(readmePath, 'utf8');
  if (readme.includes(markerStart) && readme.includes(markerEnd)) {
    const replacement = `${markerStart}\n**Live site:** ${deploymentUrl}\n${markerEnd}`;
    const updatedReadme = readme.replace(
      new RegExp(`${markerStart}[\s\S]*?${markerEnd}`),
      replacement
    );
    fs.writeFileSync(readmePath, updatedReadme, 'utf8');
    console.log(`Updated README with deployment URL.`);
  }
} catch (error) {
  console.error(`Could not update README: ${error.message}`);
}
