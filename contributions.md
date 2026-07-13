# Release Commands

Use the following commands to tag and release a new version of the extension:

### 1. Package and Publish
To manually generate the `.vsix` package locally, run the following command:
```bash
pnpm run package
```
*Note: This command automatically runs `pnpm run compile` (which runs both `compile-node` and `compile-web`), ensuring that both the Node.js and web extension bundles are successfully built and included in the VSIX file.*

Once the `.vsix` file is generated, you can either:
- **Manually Upload:** Go to the [VS Code Marketplace Publisher Management](https://marketplace.visualstudio.com/manage) or [Open VSX Registry](https://open-vsx.org/user-settings/extensions) and upload the `.vsix` file.
- **Publish via CLI:**
```bash
pnpm run publish
pnpm run publish:ovsx
```

### 2. Stage and Commit Changes
```bash
git add .
git commit -m "release: v0.0.2 - fix custom editor and add tests"
```

### 3. Create a Version Tag
```bash
git tag -a v0.0.2 -m "Release version 0.0.2"
```

### 4. Push to Remote
```bash
git push origin main --tags
```
