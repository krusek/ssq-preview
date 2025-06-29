"use strict"
import * as vscode from 'vscode'
import Preview from "./Preview"
import * as Constants from './Constants'

export default class StatusBarItem {

    statusBarItem: vscode.StatusBarItem;
    previewUtil: Preview;

    constructor(context: vscode.ExtensionContext, utilities?: Preview) {

        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.statusBarItem.command = "ssq.sidePreview";
        this.statusBarItem.tooltip = Constants.ExtensionConstants.STATUS_BAR_HTML_TOOLTIP;
        this.previewUtil = utilities && utilities || new Preview(context);

    }

    updateStatusbar() {
        const ssqConfig = vscode.workspace.getConfiguration('ssq');
        let editor = vscode.window.activeTextEditor;
        if (!editor || !!ssqConfig.get<boolean>('preview.showPreviewOptionInMenuBar')) {
            this.statusBarItem.hide();
            return;
        }
        // Update status if an markdown file:
        if (this.previewUtil.checkDocumentIsJson(false)) {
            this.statusBarItem.text = Constants.ExtensionConstants.STATUS_BAR_HTML_TEXT;
            this.statusBarItem.command = "ssq.sidePreview";
            this.statusBarItem.show();

        } else {
            this.statusBarItem.hide();
        }
    }
}