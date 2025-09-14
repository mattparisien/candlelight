#!/usr/bin/env node

/**
 * GitHub Branch Protection Setup
 * Sets up required status checks for database sync
 */

const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

async function setupBranchProtection() {
  const owner = 'mattparisien'; // Your GitHub username
  const repo = 'candlelight';   // Your repo name
  const branch = 'master';

  try {
    console.log('🔒 Setting up branch protection rules...');
    
    await octokit.rest.repos.updateBranchProtection({
      owner,
      repo,
      branch,
      required_status_checks: {
        strict: true,
        checks: [
          { context: 'database-diff-sync' },
          // Add other required checks here
        ]
      },
      enforce_admins: false,
      required_pull_request_reviews: {
        required_approving_review_count: 1,
        dismiss_stale_reviews: true,
        require_code_owner_reviews: false
      },
      restrictions: null,
      allow_force_pushes: false,
      allow_deletions: false
    });
    
    console.log('✅ Branch protection rules updated');
    
  } catch (error) {
    console.error('❌ Failed to set up branch protection:', error.message);
  }
}

if (require.main === module) {
  setupBranchProtection();
}
