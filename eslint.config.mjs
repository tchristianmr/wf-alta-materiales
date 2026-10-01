import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';

export default [
    ...fioriTools.configs.recommended,
    {
        ignores: ["webapp/test/testsuite.qunit.ts"]
    },
    {
        files: ["./webapp/*.ts", "./webapp/**/*.ts"],
        ignores: [
            "**/*.d.ts",
            "webapp/localService/**",
            "webapp/test/changes_loader.ts",
            "webapp/test/changes_preview.ts"
        ],
        rules: {
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
            "@typescript-eslint/no-unnecessary-type-assertion": "off"
        }
    }
];