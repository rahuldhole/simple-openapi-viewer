const { describe, it } = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

// Mock vscode before requiring extension
const Module = require('module');
const originalRequire = Module.prototype.require;
const mockVscode = {
    commands: { executeCommand: () => {} },
    window: { 
        registerCustomEditorProvider: () => {},
        onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
        activeTextEditor: undefined
    },
    workspace: { 
        fs: {},
        onDidSaveTextDocument: () => ({ dispose: () => {} }),
        onDidChangeTextDocument: () => ({ dispose: () => {} }),
    },
    Uri: { joinPath: () => ({}) },
    ViewColumn: { One: 1, Beside: 2 }
};
Module.prototype.require = function(name) {
    if (name === 'vscode') return mockVscode;
    return originalRequire.apply(this, arguments);
};

const { isOpenApi, parseSpec } = require('../extension');
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));

describe('Simple OpenAPI Viewer manifest', () => {
    it('exports the extension entry point', () => {
        assert.strictEqual(packageJson.main, './dist/extension.js');
    });

    it('defines the OpenAPI viewer commands', () => {
        const commands = packageJson.contributes?.commands || [];
        assert(commands.some(cmd => cmd.command === 'simple-openapi-viewer.openViewer'));
        assert(commands.some(cmd => cmd.command === 'simple-openapi-viewer.openViewerFromExplorer'));
    });
});

describe('OpenAPI Detection Logic', () => {
    it('detects OpenAPI 3.x in YAML', () => {
        assert.strictEqual(isOpenApi('openapi: 3.0.0\ninfo: {title: test}'), true);
        assert.strictEqual(isOpenApi('OpenAPI: 3.1.0\ninfo: {title: test}'), true);
    });

    it('detects Swagger 2.0 in JSON', () => {
        assert.strictEqual(isOpenApi('{"swagger": "2.0", "info": {}}'), true);
        assert.strictEqual(isOpenApi('{"SWAGGER": "2.0"}'), true);
    });

    it('ignores non-OpenAPI files', () => {
        assert.strictEqual(isOpenApi('foo: bar\nversion: 1.0'), false);
        assert.strictEqual(isOpenApi('{"version": "1.0"}'), false);
    });
});

describe('Spec Parsing Logic', () => {
    it('parses valid JSON', () => {
        const spec = parseSpec('{"openapi": "3.0.0"}');
        assert.strictEqual(spec.openapi, '3.0.0');
    });

    it('parses valid YAML', () => {
        const spec = parseSpec('openapi: 3.0.0\ntitle: test');
        assert.strictEqual(spec.openapi, '3.0.0');
        assert.strictEqual(spec.title, 'test');
    });
});

