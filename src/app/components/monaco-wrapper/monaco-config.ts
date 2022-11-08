import { MonacoEditorModule, NgxMonacoEditorConfig } from 'ngx-monaco-editor';

export const monacoConfig: NgxMonacoEditorConfig = {
    // baseUrl: 'app-name/assets',
    // configure base path cotaining monaco-editor directory after build default: './assets'
    defaultOptions: { scrollBeyondLastLine: false },
    // pass default options to be used
    onMonacoLoad: () => {
        // return; // use default options
        const monaco: any = (<any>window).monaco;
        const { languages: L } = monaco;
        console.log({ monaco }, (<any>window).monaco.languages.register);

        L.register({ id: 'flux' });

        let keywords: string[] = [
            "in",
            "import",
            "package",
            "return",
            "option",
            "builtin",
            "test",
            "testcase",
            "if",
            "then",
            "else",
            "exists"
        ];
        L.setMonarchTokensProvider('flux', {
            keywords,
            operators: [
                '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
                '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
                '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
                '%=', '<<=', '>>=', '>>>=', '|>', '=>'
            ],
            symbols: /[=><!~?:&|+\-*\/\^%]+/,

            tokenizer: {
                root: [
                    [/@?[a-zA-Z][\w$]*/, {
                        cases: {
                            '@keywords': 'keyword',
                            '@default': 'variable',
                        }
                    }],
                    [/\d+/, 'number'],
                    [/".*?"/, 'string'],
                    [/\/\/.*$/, 'comment'],

                    [/[{}()\[\]]/, '@brackets'],
                    [/[<>](?!@symbols)/, '@brackets'],
                    [/@symbols/, {
                        cases: {
                            '@operators': 'operator',
                            '@default': ''
                        }
                    }],
                ]
            }
        });

        monaco.editor.defineTheme('flux-theme', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'keywords', foreground: '#FF6600', fontStyle: 'bold' },
                { token: 'comment', foreground: '#999999' },
                { token: 'string', foreground: '#009966' },
                { token: 'variable', foreground: '#333333' },
                { token: 'number', foreground: '#0000FF' },
                { token: 'operator', foreground: '#FF00FF' },
                { token: 'brackets', foreground: '#0000FF' },
            ],
            colors: []
        })
    }
};
