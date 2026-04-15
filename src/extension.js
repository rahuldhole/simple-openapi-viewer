const path = require('path');
const vscode = require('vscode');
const yaml = require('js-yaml');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    // Function to update context key based on document content
    const updateContextKey = async (editor) => {
        let isOpenApiValue = false;
        if (editor && editor.document) {
            const fileName = editor.document.fileName.toLowerCase();
            if (fileName.endsWith('.json') || fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
                isOpenApiValue = isOpenApi(editor.document.getText());
            }
        }
        vscode.commands.executeCommand('setContext', 'simple-openapi-viewer.isOpenApi', isOpenApiValue);
    };

    // Update on startup and on editor change
    updateContextKey(vscode.window.activeTextEditor);
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateContextKey));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(d => {
        if (vscode.window.activeTextEditor && d === vscode.window.activeTextEditor.document) {
            updateContextKey(vscode.window.activeTextEditor);
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => {
        if (vscode.window.activeTextEditor && e.document === vscode.window.activeTextEditor.document) {
            updateContextKey(vscode.window.activeTextEditor);
        }
    }));

    const openViewer = vscode.commands.registerCommand('simple-openapi-viewer.openViewer', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return vscode.window.showErrorMessage('Open a YAML or JSON OpenAPI file first.');
        }
        return openApiViewer(context, editor.document.uri);
    });

    const openViewerFromExplorer = vscode.commands.registerCommand('simple-openapi-viewer.openViewerFromExplorer', async (resourceUri) => {
        if (!resourceUri) {
            // If resourceUri is not provided (e.g. run via Command Palette), 
            // fall back to the active editor's resource
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                resourceUri = editor.document.uri;
            } else {
                return vscode.window.showErrorMessage('Select an OpenAPI file in Explorer.');
            }
        }
        return openApiViewer(context, resourceUri);
    });

    // Handle "Open With..." (Custom Editor)
    const provider = {
        async resolveCustomTextEditor(document, webviewPanel, token) {
            const fileContents = document.getText();
            let spec;
            try {
                spec = parseSpec(fileContents);
            } catch (parseError) {
                webviewPanel.webview.html = `<h3>OpenAPI Parse Error</h3><pre>${parseError.message}</pre>`;
                return;
            }

            // Validation: Check for openapi or swagger key
            if (!isOpenApi(fileContents)) {
                webviewPanel.webview.html = `<h3>Invalid OpenAPI File</h3><p>The file must contain an "openapi" or "swagger" field.</p>`;
                return;
            }

            webviewPanel.webview.options = {
                enableScripts: true,
                localResourceRoots: [context.extensionUri]
            };

            webviewPanel.webview.html = getWebviewContent(webviewPanel.webview, spec, path.basename(document.fileName), context.extensionUri);
        }
    };

    context.subscriptions.push(
        openViewer, 
        openViewerFromExplorer,
        vscode.window.registerCustomEditorProvider('simple-openapi-viewer.openViewer', provider)
    );
}

async function openApiViewer(context, resourceUri) {
    const filePath = resourceUri.fsPath || resourceUri.path;
    const lowerName = filePath.toLowerCase();
    if (!lowerName.endsWith('.yaml') && !lowerName.endsWith('.yml') && !lowerName.endsWith('.json')) {
        return vscode.window.showErrorMessage('This extension only supports .yaml, .yml, and .json OpenAPI files.');
    }

    let fileBytes;
    try {
        fileBytes = await vscode.workspace.fs.readFile(resourceUri);
    } catch (err) {
        console.error('Failed to read file:', err);
        return vscode.window.showErrorMessage('Unable to read OpenAPI file.');
    }

    const fileContents = Buffer.from(fileBytes).toString('utf8');
    let spec;
    try {
        spec = parseSpec(fileContents);
    } catch (parseError) {
        return vscode.window.showErrorMessage(`OpenAPI parse error: ${parseError.message}`);
    }

    // Validation
    if (!isOpenApi(fileContents)) {
        return vscode.window.showErrorMessage('This file does not appear to be a valid OpenAPI or Swagger definition (missing "openapi" or "swagger" field).');
    }

    const panel = vscode.window.createWebviewPanel(
        'simpleOpenApiViewer',
        `OpenAPI Viewer: ${path.basename(filePath)}`,
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                context.extensionUri
            ]
        }
    );

    panel.webview.html = getWebviewContent(panel.webview, spec, path.basename(filePath), context.extensionUri);
}

function getWebviewContent(webview, spec, title, extensionUri) {
    const swaggerCss = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'resources', 'swagger-ui', 'swagger-ui.css'));
    const swaggerBundle = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'resources', 'swagger-ui', 'swagger-ui-bundle.js'));
    const swaggerPreset = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'resources', 'swagger-ui', 'swagger-ui-standalone-preset.js'));

    // Safer stringification to avoid script injection problems in labels/descriptions
    const specJson = JSON.stringify(spec).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'; img-src ${webview.cspSource} data: https:;" />
    <title>${title}</title>
    <link rel="stylesheet" href="${swaggerCss}" />
    <style>
        body { 
            margin: 0; 
            padding: 0; 
            background: var(--vscode-editor-background, #fafafa); 
            font-family: var(--vscode-font-family, sans-serif);
        }
        #swagger-ui { width: 100%; min-height: 100vh; }
        
        /* Loading indicator */
        .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            color: var(--vscode-descriptionForeground);
        }
        .spinner {
            border: 3px solid rgba(0,0,0,.1);
            border-top: 3px solid var(--vscode-progressBar-background, #007acc);
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin-bottom: 10px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* Standard sharp filter for dark mode */
        .vscode-dark .swagger-ui {
            filter: invert(1) hue-rotate(180deg);
            backface-visibility: hidden;
        }
        
        /* Protect code and images from double inversion */
        .vscode-dark .swagger-ui img, 
        .vscode-dark .swagger-ui .highlight-code {
            filter: invert(1) hue-rotate(180deg);
        }

        /* Essential Header Hide & Sticky/Padding Overrides */
        .swagger-ui .topbar { display: none !important; }
        .swagger-ui .scheme-container { position: static !important; padding: 10px 0 !important; margin: 0 !important; }
        .swagger-ui .opblock-tag { position: static !important; top: auto !important; padding: 5px 20px !important; }
        .swagger-ui .filter-container { position: static !important; }
        .swagger-ui .info { margin: 15px 0 !important; }
        .swagger-ui .info .title { font-size: 24px !important; margin-bottom: 5px !important; }

        .error-box {
            padding: 24px;
            margin: 20px;
            font-family: var(--vscode-editor-font-family, sans-serif);
            background: var(--vscode-inputValidation-errorBackground, #fdecea);
            color: var(--vscode-inputValidation-errorForeground, #611a15);
            border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
            border-radius: 4px;
        }
        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            background: rgba(0,0,0,0.05);
            padding: 10px;
        }
    </style>
</head>
<body>
    <div id="swagger-ui">
        <div class="loading-container">
            <div class="spinner"></div>
            <div>Initializing Swagger UI...</div>
        </div>
    </div>
    <script src="${swaggerBundle}"></script>
    <script src="${swaggerPreset}"></script>
    <script>
        (function() {
            console.log('OpenAPI Viewer initializing...');
            try {
                const specData = ${specJson};
                
                function showError(message, details) {
                    const container = document.getElementById('swagger-ui');
                    if (container) {
                        container.innerHTML = '<div class="error-box">'
                            + '<h1>OpenAPI render failed</h1>'
                            + '<p>' + message + '</p>'
                            + (details ? '<pre>' + details + '</pre>' : '')
                            + '</div>';
                    }
                }

                function initSwagger() {
                    console.log('SwaggerUIBundle type:', typeof SwaggerUIBundle);
                    if (typeof SwaggerUIBundle === 'undefined') {
                        showError('SwaggerUIBundle not loaded', 'The main Swagger UI script failed to load. Please check if node_modules/swagger-ui-dist is correctly installed.');
                        return;
                    }

                    console.log('Creating SwaggerUI instance...');
                    window.ui = SwaggerUIBundle({
                        spec: specData,
                        dom_id: '#swagger-ui',
                        deepLinking: true,
                        presets: [
                            SwaggerUIBundle.presets.apis,
                            SwaggerUIBundle.plugins.DownloadUrl
                        ],
                        layout: 'BaseLayout',
                        onComplete: function() {
                            console.log('Swagger UI rendering complete');
                        }
                    });
                }

                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', initSwagger);
                } else {
                    initSwagger();
                }
            } catch (error) {
                console.error('Initialization error:', error);
                const errorBox = document.createElement('div');
                errorBox.className = 'error-box';
                errorBox.innerHTML = '<h3>Initialization Error</h3><pre>' + (error.stack || error.message) + '</pre>';
                document.body.appendChild(errorBox);
            }
        })();
    </script>
</body>
</html>`;
}

/**
 * Common logic to check if text is OpenAPI/Swagger
 */
function isOpenApi(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    // Quick match for openapi/swagger patterns
    return lowerText.includes('"openapi"') || 
           lowerText.includes('"swagger"') || 
           lowerText.includes('openapi:') || 
           lowerText.includes('swagger:');
}

/**
 * Common logic to parse spec from text
 */
function parseSpec(text) {
    const trimmed = text.trim();
    if (trimmed.startsWith('{')) {
        return JSON.parse(text);
    }
    return yaml.load(text);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
    isOpenApi,
    parseSpec
};

