/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const path = require('path');

module.exports = {
	mode: "production",
	entry: {
		index: './src/preview/index.ts'
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/
			}
		]
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js']
	},
	devtool: 'source-map',
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'assets/js'),
		clean: true
	},
	optimization: {
		minimize: true
	},
	performance: {
		hints: false
	}
};