import * as vscode from 'vscode';
import * as path from 'path';

export const htmlTemplate = (
    context: vscode.ExtensionContext,
    panel: vscode.WebviewPanel,
    html: string,
    fileName: string
): string => {
    const nonce = getNonce();
    return `<!doctype html>
            <html lang="en">
            <head>
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${panel.webview.cspSource} 'self' 'unsafe-inline'; script-src 'nonce-${nonce}'; style-src ${panel.webview.cspSource} 'self' 'unsafe-inline'; font-src ${panel.webview.cspSource}">

                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
                <meta id="vscode-html-preview-data" data-settings="${JSON.stringify(getInitialState()).replace(/"/g, '&quot;')}">
                <script nonce="${nonce}" src="${getDynamicContentPath(context, panel, 'assets/js/main.js')}"></script>
                <script nonce="${nonce}" src="${getDynamicContentPath(context, panel, 'assets/js/index.js')}"></script>
                <link rel="stylesheet" type="text/css" href="${getDynamicContentPath(context, panel, 'assets/css/slds.css')}">
                <link rel="stylesheet" type="text/css" href="${getDynamicContentPath(context, panel, 'assets/css/main.css')}">
                <link rel="stylesheet" type="text/css" href="${getDynamicContentPath(context, panel, 'assets/css/admonitions.css')}">
            </head>
            <body class="code-line" style="background-color: white;">
                <main class="content home">
                    <section>
                        <body data-gr-c-s-loaded="true">
                            <div class="slds-p-around--small slds-container--small">
                                <article>
                                ${html}     
                                </article>
                            </div>
                        </body>
                    </section>
                </main>
            </body>
        </html>`
};

function getInitialState() {
    const editor = vscode.window.activeTextEditor;
    return {
        source: editor?.document.uri.toString() || '',
        visibleRange: editor?.visibleRanges || [],
        lineCount: editor?.document.lineCount || 0,
    };
}
function getDynamicContentPath(
    context: vscode.ExtensionContext,
    panel: vscode.WebviewPanel,
    filepath: string
): vscode.Uri {
    const onDiskPath = vscode.Uri.file(path.join(context.extensionPath, filepath));
    const styleSrc = panel.webview.asWebviewUri(onDiskPath);
    return styleSrc;
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}