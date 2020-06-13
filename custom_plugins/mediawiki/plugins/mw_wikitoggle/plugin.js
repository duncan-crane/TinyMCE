/**
 * mw-toggle plugin
 *
 * This pluging toggles the visible placeholders for invisible
 * wiki text elements on and off
 *
 * Copyright (c) Aoxomoxoa Limited. All rights reserved.
 * Author: Duncan Crane, duncan.crane@aoxomoxoa.co.uk
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 *
 * Version: 1.0.0 (2020-05-30)
 */
var wikitoggle = function (editor) {

	'use strict';

	var editor = tinymce.activeEditor;
	
    var translate = tinymce.util.I18n.translate;

	var toggle = function ( editor ) {
		var selectedNode = editor.selection.getNode(),
			selectors = ["mwt-nonEditablePlaceHolder"],
			args = {format: 'wiki', load: 'true', convert2html: false};
		var domQuery = editor.dom.$;
			
		var test =	editor.dom.select('span.mwt-nonEditablePlaceHolder').forEach( function(a) {
				$(a).toggle();
			});
	};

	var registerCommand = function ( editor ) {
		editor.addCommand('wikiPlacehodlerToggle', function () {
			toggle( editor );
		});
	};

	var registerKeys = function ( editor ) {
		editor.ui.registry.addToggleButton('wikitoggle', {
			tooltip: translate("wikitoggle.Show wiki placeholders"),
			icon: 'visualchars',
			onAction: function () {
				return toggle( editor );
			},
      	});
		editor.ui.registry.addToggleMenuItem('wikitoggle', {
			text: translate("wikitoggle.Show wiki placeholders"),
			icon: 'visualchars',
			onAction: function () {
				return toggle( editor );
			},
		});
	};

	this.init = function(editor) {
		registerCommand ( editor );
		registerKeys ( editor );
	}
};

tinymce.PluginManager.add('wikitoggle', wikitoggle);
tinymce.PluginManager.requireLangPack('wikitoggle', 'en,nl');

