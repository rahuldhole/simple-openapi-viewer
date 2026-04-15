# Simple OpenAPI Viewer

A minimal VS Code extension that displays OpenAPI YAML or JSON files in a lightweight Swagger UI webview. The viewer uses local OpenAPI assets installed as dependencies, so it works without relying on CDN scripts.

## Features

- Open the current editor file in the OpenAPI viewer
- Right-click supported `.yaml`, `.yml`, or `.json` files in Explorer and choose **Open File in Viewer**
- Tab title button appears for supported files
- Keyboard shortcut: `Cmd+Alt+O`

## Usage

1. Open a `.yaml`, `.yml`, or `.json` OpenAPI file in VS Code.
2. Use the command palette and run **Simple OpenAPI Viewer: Open Current File**.
3. Or right-click the file in Explorer and choose **Simple OpenAPI Viewer: Open File in Viewer**.
4. The viewer opens in a new tab and shows the API documentation.

## Development

- Run `pnpm install` in `simple-openapi-viewer`
- Press `F5` in VS Code to launch the extension in the Extension Development Host
- Package with `pnpx vsce package`
