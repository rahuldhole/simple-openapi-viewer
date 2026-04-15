const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const packageJson = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));

describe('Simple OpenAPI Viewer manifest', () => {
    it('exports the extension entry point', () => {
        assert.strictEqual(packageJson.main, './src/extension.js');
    });

    it('defines the OpenAPI viewer commands', () => {
        const commands = packageJson.contributes?.commands || [];
        assert(commands.some(cmd => cmd.command === 'simple-openapi-viewer.openViewer'));
        assert(commands.some(cmd => cmd.command === 'simple-openapi-viewer.openViewerFromExplorer'));
    });

    it('registers the right-click explorer command for YAML/JSON files', () => {
        const explorerMenu = packageJson.contributes?.menus?.['explorer/context'] || [];
        assert(explorerMenu.some(item => item.command === 'simple-openapi-viewer.openViewerFromExplorer'));
    });

    it('provides the editor command keybinding', () => {
        const keybindings = packageJson.contributes?.keybindings || [];
        assert(keybindings.some(item => item.command === 'simple-openapi-viewer.openViewer' && item.key === 'cmd+alt+o'));
    });
});
