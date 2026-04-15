# Release Commands

Use the following commands to tag and release a new version of the extension:

### 1. Stage and Commit Changes
```bash
git add .
git commit -m "release: v0.0.2 - fix custom editor and add tests"
```

### 2. Create a Version Tag
```bash
git tag -a v0.0.2 -m "Release version 0.0.2"
```

### 3. Push to Remote
```bash
git push origin main --tags
```

### 4. Package and Publish (Optional)
If you have `vsce` installed:
```bash
npm run package
# Then upload the .vsix to the marketplace or run:
# pnpx vsce publish
```
