const path = require('path');
const vscode = require('vscode');
const yaml = require('js-yaml');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    // Function to update context key based on document content
    const updateContextKey = async (editor) => {
        let isOpenApi = false;
        if (editor && editor.document) {
            const fileName = editor.document.fileName.toLowerCase();
            if (fileName.endsWith('.json') || fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
                const text = editor.document.getText();
                // Quick check for openapi/swagger keys before full parsing
                if (text.includes('"openapi"') || text.includes('"swagger"') || text.includes('openapi:') || text.includes('swagger:')) {
                    isOpenApi = true;
                }
            }
        }
        vscode.commands.executeCommand('setContext', 'simple-openapi-viewer.isOpenApi', isOpenApi);
    };

    // Update on startup and on editor change
    updateContextKey(vscode.window.activeTextEditor);
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateContextKey));
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
            return vscode.window.showErrorMessage('Select an OpenAPI file in Explorer.');
        }
        return openApiViewer(context, resourceUri);
    });

    context.subscriptions.push(openViewer, openViewerFromExplorer);
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
        return vscode.window.showErrorMessage('Unable to read OpenAPI file.');
    }

    const fileContents = Buffer.from(fileBytes).toString('utf8');
    let spec;
    try {
        spec = fileContents.trim().startsWith('{') ? JSON.parse(fileContents) : yaml.load(fileContents);
    } catch (parseError) {
        return vscode.window.showErrorMessage(`OpenAPI parse error: ${parseError.message}`);
    }

    // Validation: Check for openapi or swagger key
    if (!spec || (!spec.openapi && !spec.swagger)) {
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
    const swaggerCss = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', 'swagger-ui-dist', 'swagger-ui.css'));
    const swaggerBundle = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', 'swagger-ui-dist', 'swagger-ui-bundle.js'));
    const swaggerPreset = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', 'swagger-ui-dist', 'swagger-ui-standalone-preset.js'));

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data: https:;" />
    <title>${title}</title>
    <link rel="stylesheet" href="${swaggerCss}" />
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            min-height: 100vh;
            background-color: var(--vscode-editor-background, #ffffff);
            color: var(--vscode-editor-foreground, #111);
        }
        #swagger-ui {
            width: 100%;
        }
        .vscode-dark .swagger-ui {
            filter: invert(88%) hue-rotate(180deg);
        }
        .vscode-dark .swagger-ui .highlight-code {
            filter: invert(100%) hue-rotate(180deg);
        }
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
    <script>
        window.onerror = function(msg, url, line, col, error) {
            const err = document.createElement('div');
            err.className = 'error-box';
            err.innerHTML = '<h3>Browser Script Error</h3>' 
                + '<p><strong>Message:</strong> ' + msg + '</p>'
                + '<p><strong>File:</strong> ' + url + '</p>'
                + '<p><strong>Line/Col:</strong> ' + line + ':' + col + '</p>';
            document.body.appendChild(err);
            return false;
        };
    </script>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="${swaggerBundle}"></script>
    <script src="${swaggerPreset}"></script>
    <script>
        (function() {
            try {
                const specData = ${JSON.stringify(spec)};
                
                function showError(message, details) {
                    const container = document.getElementById('swagger-ui');
                    if (container) {
                        container.innerHTML = '<div class="error-box">'
                            + '<h1>OpenAPI render failed</h1>'
                            + '<p>' + message + '</p>'
                            + (details ? '<pre>' + details + '</pre>' : '')
                            + '</div>';
                    } else {
                        document.body.innerHTML += '<div class="error-box"><h1>Critical Error</h1><p>' + message + '</p></div>';
                    }
                }

                if (typeof SwaggerUIBundle === 'undefined') {
                    showError('SwaggerUIBundle not loaded', 'The main Swagger UI script failed to load. Please check if node_modules/swagger-ui-dist is correctly installed.');
                    return;
                }

                window.ui = SwaggerUIBundle({
                    spec: specData,
                    dom_id: 'swagger-ui',
                    deepLinking: true,
                    presets: [
                        SwaggerUIBundle.presets.apis,
                        SwaggerUIStandalonePreset
                    ],
                    layout: 'StandaloneLayout'
                });
            } catch (error) {
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

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
