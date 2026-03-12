#!/bin/bash
# GitHub Actions Setup Helper Script
# Run this script to help set up CI/CD for the LeedsAir project

echo "🚀 LeedsAir GitHub Actions Setup Helper"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d ".github/workflows" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "✅ Project root detected"
echo ""

# Verify workflow files exist
echo "📋 Checking workflow files..."
workflows=(
    ".github/workflows/frontend.yml"
    ".github/workflows/backend.yml"
    ".github/workflows/integration.yml"
    ".github/workflows/deploy.yml"
)

for workflow in "${workflows[@]}"; do
    if [ -f "$workflow" ]; then
        echo "   ✅ $workflow"
    else
        echo "   ❌ $workflow (missing)"
    fi
done

echo ""
echo "🔐 Required GitHub Secrets for Deployment:"
echo "=========================================="
echo ""
echo "To enable automatic deployments, add these secrets to your GitHub repo:"
echo "  Go to: Settings → Secrets and variables → Actions"
echo ""
echo "Production Deployment Secrets:"
echo "  • DEPLOY_HOST     - Your production server hostname"
echo "  • DEPLOY_USER     - SSH username for deployment"
echo "  • DEPLOY_KEY      - SSH private key (4096-bit RSA)"
echo "  • PROD_API_URL    - Production API base URL"
echo "  • SLACK_WEBHOOK   - (Optional) Slack notification webhook"
echo ""

# Check if SSH key exists
if [ -f "prod-deploy-key" ]; then
    echo "⚠️  Found prod-deploy-key in repo root!"
    echo "   Move this to a secure location and delete from git:"
    echo "   $ mv prod-deploy-key ~/.ssh/prod-deploy-key"
    echo "   $ chmod 600 ~/.ssh/prod-deploy-key"
    echo "   $ git rm --cached prod-deploy-key"
    echo "   $ git commit -m 'Remove SSH key from repo'"
fi

echo ""
echo "✨ Next Steps:"
echo "============="
echo "1. Install npm packages: cd Frontend && npm install"
echo "2. Test linting: npm run lint"
echo "3. Test build: npm run build"
echo "4. For backend: cd backend && ./gradlew build"
echo "5. Push to GitHub and watch Actions tab for automation"
echo ""
echo "📚 For more info, see CICD_SETUP.md"
echo ""
