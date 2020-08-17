/**
 * This pluging creates and displays a dialog for editing the wikitext
 * equivalent of the content of the editor
 *
 * Copyright (c) Aoxomoxoa Limited. All rights reserved.
 * Author: Duncan Crane, duncan.crane@aoxomoxoa.co.uk
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 *
 * mw-wikitext plugin
 *
 * Version: 1.0.0 (2020-05-30)
 */
var wikitext = function (editor) {
    'use strict';

    var pluginManager = tinymce.util.Tools.resolve('tinymce.PluginManager');

	var editor = tinymce.activeEditor;
	
	var utility = editor.getParam("wiki_utility");
	
	var setContent = utility.setContent;

	var setSelection = utility.setSelection;

	var getContent = utility.getContent;

	var getSelection = utility.getSelection;

	var translate = utility.translate;

	var htmlDecode = utility.htmlDecode;
	
	var open = function ( editor ) {
		var	selectedNode = editor.selection.getNode(),
			wikitext = '',
			args = {format : 'raw', convert2wiki : true};

		// test to see if it is a wikiconstruct and if has a 
		// wikitext data attribute we may use that
		// otherwise use any selected content if any
		// or the whole content if nothing selected
		if ( typeof selectedNode.className != "undefined" ) {
			if ( selectedNode.className.indexOf("mwt-wikiMagic") > -1 ) {
				if ( selectedNode.attributes["data-mwt-wikitext"] != "undefined" ) {
					wikitext = htmlDecode(selectedNode.attributes["data-mwt-wikitext"].value);
				}
			} else if ( editor.selection.isCollapsed() ) {
				// if nothing is selected then select everything*/
				wikitext = getContent( editor, args );
			} else if (editor.selection) {
				// else get the content selected
				wikitext  = getSelection( editor, args );
			}
		}
		
		var initialData = {
				wikitext: wikitext
			};
			
		var dialogBody = {
			type: 'panel', 
			items: [
				{
					type: 'textarea', 
					name: 'wikitext', 
				}
			]
		};

		var dialogButtons = [
			{
				type: 'cancel',
				name: 'closeButton',
				text: 'Cancel'
			},
			{
				type: 'submit',
				name: 'submitButton',
				text: 'OK',
				primary: true
			}
		];

		var submitDialog = function (api) {
				var args = {format: 'wiki', load: 'true', convert2html: true};

				if ( editor.selection.isCollapsed() ) {
					// if nothing is selected then reset everything
					setContent( editor, api.getData().wikitext, args );
				} else if ( editor.selection ) {
					// else reset the content selected
					setSelection( editor, api.getData().wikitext, args );
				}
				api.close();
			}	
			
		editor.windowManager.open({
			title: translate("tinymce-wikisourcecode"),
			size: 'large',
			body: dialogBody,
			buttons: dialogButtons,
			initialData: initialData,
			onSubmit: submitDialog
		});
	}

	var registerCommands = function ( editor ) {
		editor.addCommand('wikitextEditor', function () {
			open( editor );
		});
	};

	var registerButtons = function ( editor ) {
		editor.ui.registry.addButton( 'wikitext', {
			icon: 'wikitext',
			stateSelector: '.wikimagic',
			tooltip: translate( 'tinymce-wikimagic' ),
			onAction: function () {
				return open( editor );
			}
		});
		editor.ui.registry.addMenuItem( 'wikitext', {
			icon: 'wikitext',
			text: mw.msg( 'tinymce-wikimagic' ),
			tooltip: translate( 'tinymce-wikimagic' ),
			context: 'insert',
			onAction: function () {
				return open( editor );
			}
		});
	};

	this.init = function(editor) {
		registerCommands ( editor );
		registerButtons ( editor );
	}
};

tinymce.PluginManager.add('wikitext', wikitext);
