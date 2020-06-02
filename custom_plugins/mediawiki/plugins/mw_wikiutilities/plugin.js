/**
 * Copyright (c) Aoxomoxoa Limited. All rights reserved.
 * Licensed under the LGPL.
 * For LGPL see License.txt in the project root for license information.
 *
 * Version: 1.0.0 (2020-05-28)
 */
(function () {
    'use strict';

	var pluginManager = tinymce.util.Tools.resolve('tinymce.PluginManager');
	
	var editor = tinymce.activeEditor

	var setContent = function ( editor, content, args ) {
		// sets the content of the editor window
		editor.focus();
		editor.undoManager.transact( function () {
			editor.setContent( content, args );
		});
		editor.selection.setCursorLocation();
		editor.nodeChanged();
	};

	var setSelection = function ( editor, content, args ) {
		// sets the content of the selection.  If nothing is selected
		// it will insert content at the cursor.  If the selection is
		// contained in non-editable elements, the whole of the top
		// level non-editable element is replaced with the content
		editor.focus();
		var nonEditableParents = editor.dom.getParents( editor.selection.getNode(),function ( aNode ) {
			if (aNode.contentEditable === 'false') {
				return aNode
			}
		});
		if (nonEditableParents) {
			editor.selection.select ( nonEditableParents[ nonEditableParents.length - 1 ] );
		}
		editor.undoManager.transact ( function () {
			editor.selection.setContent ( content, args );
		});
		editor.selection.setCursorLocation ();
		editor.nodeChanged ();
	};

	var getContent = function ( editor, args ) {
		return editor.getContent( args );
	};

	var getSelection = function ( editor, args ) {
		return editor.selection.getContent( args );
	};

	var htmlDecode = function ( value ) {
		return $("<textarea/>").html( value ).text();
	};
	
	var  htmlEncode = function (value) {
		return $('<textarea/>').text(value).html();
	};
	
	var  createUniqueNumber = function() {
		return Math.floor( ( Math.random() * 100000000 ) + Date.now());
	};
	
	var onDblClickLaunch = function ( aTarget, aClass, aCommand) {	
		var selectedNodeParents = editor.dom.getParents( aTarget, function ( aNode ) {
			if ( aNode.className.indexOf( aClass ) > -1 ) {
				return aNode;
			} else {
				return;
			}
		});

		if (selectedNodeParents.length > 0 ) {
			editor.selection.select( selectedNodeParents[ selectedNodeParents.length - 1 ]);
			editor.execCommand( aCommand );
			return true;
		}
		return false;	
	}

	var toggleEnabledState = function( editor, selectors ) {
		// function to toggle a button's enabled state dependend
		// on which nodes are selected in the editor
		return function (api) {
			editor.on('NodeChange', function (e) {
				var selectedNode = e.element;
				api.setDisabled(true);
				while (selectedNode.parentNode != null) {
					if (typeof selectedNode.className != "undefined") {
						for (var selector in selectors) {
							if (selectedNode.className.indexOf( selectors[ selector ]) > -1) {
								editor.selection.select(selectedNode);
								editor.off('NodeChange', true);
								return api.setDisabled(false)
							}
						}
					}
					selectedNode = selectedNode.parentNode;
				}
			});
			return editor.off('NodeChange', true);
		};
	};

	var utility = {
		setContent: setContent,
		setSelection: setSelection,
		getContent: getContent,
		getSelection: getSelection,
		htmlDecode: htmlDecode,
		htmlEncode: htmlEncode,
		createUniqueNumber: createUniqueNumber,
		onDblClickLaunch: onDblClickLaunch,
		toggleEnabledState: toggleEnabledState
    };
	
	var wikiutiilities = function (editor) {
debugger;
		editor.settings[ "wiki-utility" ] = utility ;
		return {};
	};

	function Plugin () {
		pluginManager.add( 'wikiutiilities', wikiutiilities );
	}

	Plugin();

}());
