/**
 * Copyright (c) Aoxomoxoa Ltd. All rights reserved.
 * Licensed under the LGPL license.
 * For LGPL see License.txt in the project root for license information.
 *
 * mw_wikireference plugin
 *
 * Version: 1.0.0 (2020-08-01)
 */
(function () {
	'use strict';

	var pluginManager = tinymce.util.Tools.resolve('tinymce.PluginManager');

	var	editor = tinymce.activeEditor;

	var extensionTagsList = editor.getParam("wiki_extension_tags_list");
	
	var utility = editor.getParam("wiki_utility");

	var setSelection = utility.setSelection;
	
	var createUniqueNumber = utility.createUniqueNumber;

	var translate = utility.translate;

	var insertReference = function (editor, times) {

		var args = {format: 'wiki', load: 'true', convert2html: true},
			reference,
			id = 'R' + createUniqueNumber();

		reference = '<ref>' + '<span class="mwt-dummyReference" id="' + id + '"> </span>' + '</ref>&nbsp;';

		setSelection( editor, reference, args );
		editor.selection.select( editor.dom.select('#' + id )[0]); //select the inserted element
		editor.selection.collapse( 0 ); //collapses the selection to the end of the range, so the cursor is after the inserted element

    };

	var registerCommands = function (editor) {
		editor.addCommand('mwt-insertReference', function () {
			insertReference(editor, 1);
		});
	};

	var registerButtons = function (editor) {
		editor.ui.registry.addButton('reference', {
			icon: 'dagger',
			tooltip: translate( 'tinymce-reference-insertReference' ),
			onAction: function () {
				return editor.execCommand('mwt-insertReference');
			}
		});
		editor.ui.registry.addMenuItem('reference', {
			icon: 'dagger',
			text: translate( 'tinymce-reference-insertReference' ),
			onAction: function () {
				return editor.execCommand('mwt-insertReference');
			}
		});
	};

    var setup = function (editor) {
		editor.on('keydown', function (evt) {
			if ( evt.keyCode == 56 ) {
				var html,
					args,
					element,
					outerHTML;
				if (( evt.ctrlKey == true ) && ( evt.shiftKey == true )) {
					editor.execCommand('mwt-insertReference');
				}
				return true;
			}
		});
    };


    function Plugin () {
		// only load plugin if the 'cite' extension is enabled
		// in the wiki, eg, if 'ref' tag is in extension tag list
		if ( extensionTagsList.split('|').indexOf('ref') > -1 ) {
			pluginManager.add('wikireference', function (editor) {
				registerCommands( editor );
				registerButtons( editor );
				setup( editor );
			});
		}
	}

    Plugin();

}());
