/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 *
 * Version: 5.3.0 (2020-05-21)
 */
(function () {
	'use strict';

	var pluginManager = tinymce.util.Tools.resolve('tinymce.PluginManager');

	var	editor = tinymce.activeEditor;

	var utility = editor.getParam("wiki_utility");

	var setSelection = utility.setSelection;

	var insertNbsp = function (editor, times) {

		var args = {format: 'raw'},
			showPlaceholders = editor.getParam("showPlaceholders"),
			placeholderClass = showPlaceholders ? "showPlaceholder" : "hidePlaceholder",
			nbsSpan = '<span class="mwt-nonEditable mwt-placeHolder mwt-nonBreakingSpace '  + placeholderClass
			  	+ '" dragable="true" contenteditable="false">' 
			  	+ '</span>';
  
		setSelection( editor, nbsSpan, args );

    };

	var registerCommand = function (editor) {
		editor.addCommand('mceNonBreaking', function () {
			insertNbsp(editor, 1);
		});
	};


	var registerButtons = function (editor) {
		editor.ui.registry.addButton('nonbreaking', {
			icon: 'non-breaking',
			tooltip: 'Nonbreaking space',
			onAction: function () {
				return editor.execCommand('mceNonBreaking');
			}
		});
		editor.ui.registry.addMenuItem('nonbreaking', {
			icon: 'non-breaking',
			text: 'Nonbreaking space',
			onAction: function () {
				return editor.execCommand('mceNonBreaking');
			}
		});
	};

    var setup = function (editor) {
		editor.on('keydown', function (evt) {
			if ( evt.keyCode == 32 ) {
				var html,
					args,
					element,
					outerHTML;
				if (( evt.ctrlKey == true ) && ( evt.shiftKey == true )) {
					editor.execCommand('mceNonBreaking');
				}
				return true;
			}
		});
    };


    function Plugin () {
		pluginManager.add('wikinonbreaking', function (editor) {
			registerCommand( editor );
			registerButtons( editor );
			setup( editor );
		});
	}

    Plugin();

}());
