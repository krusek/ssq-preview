"use strict"
import * as vscode from 'vscode';
import * as Constants from './Constants';
import * as fs from 'fs';
import * as path from 'path';
import { convertJson } from './ssqConfig';
import { htmlTemplate } from './html-template';
import { disposeAll } from './utils/dispose';

export default class Preview {
    panel: vscode.WebviewPanel | undefined = undefined;
    editor: vscode.TextEditor | undefined = undefined;
    line: number = 0;
    disableWebViewStyling: boolean = false;
    context: vscode.ExtensionContext;
    ssqViewerConfig: any = undefined;
    private _resource: vscode.Uri | undefined = undefined;
    private readonly disposables: vscode.Disposable[] = [];
    private _disposed: boolean = false;
    private readonly _onDisposeEmitter = new vscode.EventEmitter<void>();
    public readonly onDispose = this._onDisposeEmitter.event;
    private readonly _onDidChangeViewStateEmitter = new vscode.EventEmitter<vscode.WebviewPanelOnDidChangeViewStateEvent>();

    //returns true if an html document is open
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async handleTextDocumentChange(): Promise<void> {
        if (this._disposed) return;
        this.ssqViewerConfig = vscode.workspace.getConfiguration('ssq');
        const editor = vscode.window.activeTextEditor;
        if (editor && this.checkDocumentIsJson(true) && this.panel && this.panel.visible) {
            let currentHTMLtext = editor.document.getText();
            const filePaths = editor.document.fileName.split('/');
            const fileName = filePaths[filePaths.length - 1];
            this.panel.title = `[Preview] ${fileName}`;
            try {
                JSON.parse(currentHTMLtext);
            } catch {
                console.log(currentHTMLtext);
            }
            let currentHTMLContent = await convertJson(JSON.parse(currentHTMLtext));
            this._resource = editor.document.uri;
            this.panel.webview.html = this.getWebviewContent(currentHTMLContent, fileName);
        }
    }

    getWebviewContent(html: string, fileName: string): string {
        const filePaths = fileName.split('/');
        fileName = filePaths[filePaths.length - 1];
        const reg = /<img src\s*=\s*"(.+?)"/g;
        let m: RegExpExecArray | null;
        do {
            m = reg.exec(html);
            if (m) {
                let imagePath = m[1].split('/');
                let imageName = imagePath[imagePath.length - 1];
                let vsCodeImagePath = this.getDynamicContentPath(imageName);
                html = html?.replace(m[0], m[0].replace(m[1], vsCodeImagePath.toString()));
            }
        } while (m);
        return htmlTemplate(this.context, this.panel!, html, fileName);
    }

    getDynamicContentPath(filepath: string): vscode.Uri {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const onDiskPath = vscode.Uri.file(path.join(workspaceFolder || '', 'content/media', filepath));
        return this.panel ? this.panel.webview.asWebviewUri(onDiskPath) : onDiskPath;
    }

    getDocumentType(): string {
        const editor = vscode.window.activeTextEditor;
        let languageId = editor?.document.languageId.toLowerCase() || '';
        return languageId;
    }

    checkDocumentIsJson(showWarning: boolean): boolean {
        return true;
        let result = this.getDocumentType() === "json";
        if (!result && showWarning) {
            vscode.window.showInformationMessage(Constants.ErrorMessages.NO_MARKDOWN);
        }
        return result;
    }

    async initMarkdownPreview(viewColumn: number) {
        let proceed = this.checkDocumentIsJson(true);
        const editor = vscode.window.activeTextEditor;
        if (proceed && editor) {
            const filePaths = editor.document.fileName.split('/');
            const fileName = filePaths[filePaths.length - 1];
            // Create and show a new webview
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            this.panel = vscode.window.createWebviewPanel(
                'liveHTMLPreviewer',
                '[Preview] ' + fileName,
                viewColumn,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(this.context.extensionPath, 'assets')),
                        vscode.Uri.file(path.join(workspaceFolder || '', 'content/media'))
                    ]
                }
            );
            this.panel.iconPath = this.iconPath;
            this._disposed = false;

            this.editor = editor;
            await this.handleTextDocumentChange.call(this);

            vscode.workspace.onDidChangeTextDocument(this.handleTextDocumentChange.bind(this));
            vscode.workspace.onDidChangeConfiguration(this.handleTextDocumentChange.bind(this));
            vscode.workspace.onDidSaveTextDocument(this.handleTextDocumentChange.bind(this));
            vscode.window.onDidChangeActiveTextEditor(this.handleTextDocumentChange.bind(this));

            vscode.window.onDidChangeTextEditorVisibleRanges(({ textEditor, visibleRanges }) => {
                this.ssqViewerConfig = vscode.workspace.getConfiguration('ssq');
                if (textEditor.document.languageId === 'markdown' && this.ssqViewerConfig.get('preview.scrollPreviewWithEditor')) {
                    this.postMessage({
                        type: 'scroll',
                        line: visibleRanges,
                        source: textEditor.document
                    });
                }
            });

            this.panel.webview.onDidReceiveMessage(e => {
                this.onDidScrollPreview(e.body.line);
            });

            this.panel.onDidDispose(() => {
                this.dispose();
            }, null, this.disposables);
        }
    }

    private onDidScrollPreview(line: number) {
        this.line = line;
        for (const editor of vscode.window.visibleTextEditors) {
            if (!this.isPreviewOf(editor.document.uri)) {
                continue;
            }
            const sourceLine = Math.floor(line);
            const fraction = line - sourceLine;
            const text = editor.document.lineAt(sourceLine).text;
            const start = Math.floor(fraction * text.length);
            editor.revealRange(
                new vscode.Range(sourceLine, start, sourceLine + 1, 0),
                vscode.TextEditorRevealType.AtTop);
        }
    }

    private isPreviewOf(resource: vscode.Uri): boolean {
        return !!this._resource && this._resource.fsPath === resource.fsPath;
    }

    private get iconPath() {
        const root = path.join(this.context.extensionPath, 'assets/icons');
        return {
            light: vscode.Uri.file(path.join(root, 'Preview.svg')),
            dark: vscode.Uri.file(path.join(root, 'Preview_inverse.svg'))
        };
    }

    private postMessage(msg: any) {
        if (!this._disposed && this.panel) {
            this.panel.webview.postMessage(msg);
        }
    }

    public dispose() {
        if (this._disposed) {
            return;
        }

        this._disposed = true;
        this._onDisposeEmitter.fire();

        this._onDisposeEmitter.dispose();
        if (this.panel) {
            this.panel.dispose();
        }

        disposeAll(this.disposables);
    }
}