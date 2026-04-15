const path = require('path');
const vscode = require('vscode');
const yaml = require('js-yaml');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
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

    const panel = vscode.window.createWebviewPanel(
        'simpleOpenApiViewer',
        `OpenAPI Viewer: ${path.basename(filePath)}`,
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(context.extensionUri, 'node_modules', 'swagger-ui-dist')
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
            height: 100vh;
        }
        /* Swagger UI overrides for Dark Theme */
        .vscode-dark .swagger-ui {
            filter: invert(88%) hue-rotate(180deg);
        }
        .vscode-dark .swagger-ui .highlight-code {
            filter: invert(100%) hue-rotate(180deg);
        }
        .error-box {
            padding: 24px;
            font-family: var(--vscode-editor-font-family, sans-serif);
            background: var(--vscode-inputValidation-errorBackground, #fdecea);
            color: var(--vscode-inputValidation-errorForeground, #611a15);
            border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
        }
        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
    </style>
    <script>
        window.onerror = function(msg, url, line, col, error) {
            const err = document.createElement('div');
            err.className = 'error-box';
            err.innerHTML = '<h3>Script Error</h3><p>' + msg + '</p><small>Line: ' + line + '</small>';
            document.body.appendChild(err);
        };
    </script>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="${swaggerBundle}"></script>
    <script src="${swaggerPreset}"></script>
    <script>
        const spec = ${JSON.stringify(spec)};

        function showError(message, details) {
            document.body.innerHTML = '<div class="error-box">'
                + '<h1>OpenAPI render failed</h1>'
                + '<p>' + message + '</p>'
                + '<pre>' + details + '</pre>'
                + '</div>';
        }

        if (!spec || typeof spec !== 'object') {
            showError('Invalid OpenAPI content', 'The document did not resolve to a JSON object.');
        } else {
            try {
                window.ui = SwaggerUIBundle({
                    spec,
                    dom_id: '#swagger-ui',
                    deepLinking: true,
                    presets: [
                        SwaggerUIBundle.presets.apis,
                        SwaggerUIStandalonePreset
                    ],
                    plugins: [
                        SwaggerUIBundle.plugins.DownloadUrl
                    ],
                    layout: 'StandaloneLayout',
                    defaultModelsExpandDepth: 1,
                    docExpansion: 'list',
                    persistAuthorization: false,
                    tryItOutEnabled: false
                });
            } catch (error) {
                showError('Swagger UI failed to render the OpenAPI spec.', error.message || String(error));
            }
        }
    </script>
</body>
</html>`;
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
