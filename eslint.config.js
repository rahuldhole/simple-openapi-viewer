module.exports = [
    {
        files: ["src/**/*.js"],
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error"
        },
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: {
                require: "readonly",
                module: "readonly",
                process: "readonly",
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                vscode: "readonly",
                console: "readonly"
            }
        }
    },
    {
        ignores: ["src/test/**"]
    }
];
