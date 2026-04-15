# Changelog

All notable changes to the "Simple OpenAPI Viewer" extension will be documented in this file.

## [0.0.2] - 2026-04-15

### Fixed
- **Custom Editor (Open With...) Support**: Resolved the issue where using "Open With... -> OpenAPI Viewer" would show an infinite loader. It now correctly renders as a primary editor tab.
- **Improved Loading Reliability**: Optimized Content Security Policy (CSP) and webview initialization logic to ensure smooth rendering under more restrictive environments.
- **Safer Spec Rendering**: Improved data injection to be more robust against complex API descriptions.

### Added
- **Core Logic Tests**: Introduced an automated test suite verifying OpenAPI detection and parsing logic, ensuring high reliability.
- **Enhanced Webview Feedback**: Added a native loading indicator for a smoother initial experience.

## [0.0.1] - 2026-04-15

- Support for OpenAPI 3.x and Swagger 2.0.
- Lightweight Swagger UI webview with local assets.
- Dark/Light mode theme awareness.
- Explorer and Editor context menu integration.
- Quick-access title bar button.
