/**
 * mw-link plugin
 *
 * This pluging creates and displays a dialog for editing internal and external
 * links in the content of the editor
 *
 * Copyright (c) Aoxomoxoa Limited. All rights reserved.
 * Author: Duncan Crane, duncan.crane@aoxomoxoa.co.uk
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 *
 * Version: 1.0.0 (2020-05-30)
 */
var wikilink = function (editor) {

    'use strict';

    var pluginManager = tinymce.util.Tools.resolve('tinymce.PluginManager');

	var editor = tinymce.activeEditor;
	
	var utility = editor.getParam("wiki-utility");
	
	var setContent = utility.setContent;

	var setSelection = utility.setSelection;

	var getContent = utility.getContent;

	var getSelection = utility.getSelection;

	var htmlDecode = utility.htmlDecode;
	
	var toggleEnabledState = utility.toggleEnabledState;

	var unlink = function ( editor ) {
		var selectedNode = editor.selection.getNode(),
			selectors = ["mwt-internallink", "mwt-externallink"],
			args = {format: 'wiki', load: 'true', convert2html: false};

		while (selectedNode.parentNode != null) {
			if (typeof selectedNode.className != "undefined") {
				for (var selector in selectors) {
					if (selectedNode.className.indexOf( selectors[ selector ]) > -1) {
						setSelection(editor, selectedNode.attributes["data-mwt-wikitext"].value.replace(/\[/m,"&lsqb;"), args);
						return;
					}
				}
			}
			selectedNode = selectedNode.parentNode;
		}
	};

	var open = function ( editor ) {
		var selectedNode = editor.selection.getNode(),
			dataType = '',
			isWikiLink = '',
			linkParts = [],
			value = '',
			aClass = '',
			aLink = '',
			aLabel = '',
			aTrail = '',
			dialogItems,
			initialData;

		if (typeof(selectedNode.attributes["data-mwt-type"]) !== "undefined" ) {
			aClass = selectedNode.attributes["class"].value;
			dataType = selectedNode.attributes["data-mwt-type"].value;
			isWikiLink = 
				dataType == "internallink" || 
				dataType == "externallink" ;	
		}

		if (isWikiLink) {
			value = htmlDecode (selectedNode.attributes["data-mwt-wikitext"].value);
			if (dataType == 'internallink') {
				value = value.replace(/^\[\[(.*?)\]\](\w*)/, function (match, $1, $2) {
					// $1 = content of the link
					// $2 = link trail value)

					linkParts = $1.split("|");
					aLink = linkParts[0];
					if (linkParts.length > 1) {
						aLabel = linkParts[1];
					} else {
						aLabel = '';
					}
					if ($2) {
						aTrail = $2;
					} else {
						aTrail = '';
					}
					return match;
				});
			} else if (dataType == 'externallink') {
				value = value.replace(/^\[(.*?)\](\w*)/, function (match, $1, $2) {
					// $1 = content of the link
					// $2 = link trail value)
					
					linkParts = $1.split(" ");
					aLink = linkParts[0];
					if (linkParts.length > 1) {
						aLabel = linkParts[1];
					} else {
						aLabel = '';
					}
					if ($2) {
						aTrail = $2;
					} else {
						aTrail = '';
					}
					return match;
				});
			}
		} else {
			aLabel = getSelection( editor, {format : 'raw', convert2wiki : true});
		}

		var initialData = {
			class: aClass,
			href: aLink,
			text: aLabel,
			trail: aTrail
		};

		var dialogBody = function ( initialData ) {

			// for inputing the type of link, internal or external
			var classListCtrl = {
				name: 'class',
				type: 'selectbox',
				label: mw.msg("tinymce-link-type-label"),
				items: [
					{text: mw.msg("tinymce-link-type-external"), value: 'mceNonEditable mwt-wikiMagic mwt-externallink'},
					{text: mw.msg("tinymce-link-type-internal"), value: 'mceNonEditable mwt-wikiMagic mwt-internallink'},
				]
			};
	
			// for inputing the target location of the link
			var linkCtrl = {
				name: 'href',
				type: 'input',
				label: mw.msg("tinymce-link-url-page-label"),
				inputMode: 'text',
				maximized: true,
			};
	
			// for inputing any alternative text for the link which is displayed on the page
			var labelCtrl = {
				name: 'text',
				type: 'input',
				label: mw.msg("tinymce-link-display-text-label"),
				inputMode: 'text',
				maximized: true,
			};
	
			// for updating any link trails (see https://www.mediawiki.org/wiki/Help:Links)for the link
			var trailCtrl = {
				name: 'trail',
				type: 'input',
				label: mw.msg(	"tinymce-link-link-trail-label"),
				inputMode: 'text',
				maximized: true,
			};
			
			var initialDialogItems = [
				classListCtrl,
				linkCtrl,
				labelCtrl
			];
	
			var linkTrailDialogItems = [
				classListCtrl,
				linkCtrl,
				labelCtrl,
				trailCtrl
			];
			
			if ( initialData.trail ) {
				dialogItems = linkTrailDialogItems;
			} else {
				dialogItems = initialDialogItems;
			}

			return {
				type: 'panel', 
				items: dialogItems
			};
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

		var dialogChange = function( api, changed ) {
/*			var newData;

			newData = api.getData();
			switch (changed.name) {
				case 'class': 
					// class of link has changed
					data.class = newData.class;
					break;
				case 'href':
					// href of link hjas changed
					data.href = newData.href;
					break;
				case 'text':
					// text of link has changed
					data.text = newData.text;
					break;
				case 'trail':
					// href of link hjas changed
					data.trail = newData.trail;
					break;
			}*/
		};

		var dialogSubmit = function (api) {
			var href = '',
				hasUrl = false,
				urlProtocolMatch,
				newData = '';


			// Delay confirm since onSubmit will move focus
			function delayedConfirm(message, callback) {
				var rng = editor.selection.getRng();

				tinymce.util.Delay.setEditorTimeout(editor, function() {
					editor.windowManager.confirm(message, function(state) {
						editor.selection.setRng(rng);
						callback(state);
					});
				});
			}

			function insertLink(data) {
				//Trim left and right everything (including linebreaks) that is not a starting or ending link code
				//This is necessary to avoid the wikicode parser from breaking the markup
				var href,
					aLink,
					aLabel,
					aTrail,
					wikitext = '',
					args;

				//first layer of '[...]' //external-, file- and mailto- links
				href = data.href.replace(/(^.*?\[|\].*?$|\r\n|\r|\n)/gm, ''); 
				
				//potential second layer of '[[...]]' //internal and interwiki links
				href = href.replace(/(^.*?\[|\].*?$|\r\n|\r|\n)/gm, ''); 
				aLink = href;
				aLabel = htmlDecode(data.text).replace("_"," ");

				if (data.trail) {
					aTrail = data.trail;
				} else {
					aTrail = '';
				}
			
				if (data["class"].indexOf("mwt-internallink") > -1){ 
						aLink = aLink.replace("_"," ");
					if (aLabel) {
						wikitext = "[[" + aLink + "|" + aLabel + "]]" + aTrail;
					} else {
						wikitext = "[[" + aLink + "]]" + aTrail;			
					}
				} else if (data["class"].indexOf("mwt-externallink") > -1) {
					if (aLabel) {
						wikitext = "[" + aLink + " " + aLabel + "]" + aTrail;
					} else {
						wikitext = "[" + aLink + "]" + aTrail;
					}
				}
				
				args = {format: 'wiki', load: 'true', convert2html: true};
				setSelection( editor, wikitext, args );
			}

			newData = api.getData();
			href = newData.href;

			// if no href is specified then unlink the link
			if (!href) {
				editor.execCommand('wikiunlink');
			}

			// Is email and not //user@domain.com
			if (href.indexOf('@') > 0 && href.indexOf('//') == -1 && href.indexOf('mailto:') == -1) {
				delayedConfirm(
					mw.msg("tinymce-link-want-to-link-email"),
					function(state) {
						if (state) {
							newData.href = 'mailto:' + newData.href;
						}
						insertLink( newData );
					}
				);
				return;
			}

			// Is not protocol prefixed
			urlProtocolMatch = "/^" + mw.config.get( 'wgUrlProtocols' ) + "/i";
			urlProtocolMatch = urlProtocolMatch.replace(/\|/g,"|^");
			if (href.match(urlProtocolMatch) ||
				href.substr(0,2) === "//" ) {
				hasUrl = true;
			}
			
			if ((newData["class"].indexOf("mwt-externallink") > -1) &&
				(editor.settings.link_assume_external_targets && !hasUrl)) {
				delayedConfirm(
					mw.msg("tinymce-link-want-to-link-external"),
					function(state) {
						if (state) {
							newData.href = '//' + encodeURI(newData.href);
							insertLink( newData );
							
							api.close();
						}
					}
				);
				return;
			}

			insertLink( newData );
			api.close();
		};
		
		editor.windowManager.open({
			title: mw.msg('tinymce-link-title'),
			size: 'normal',
			body: dialogBody ( initialData ),
			buttons: dialogButtons,
			initialData: initialData,
			onChange: dialogChange,
			onSubmit: dialogSubmit,
		});
	}

	var registerCommands = function ( editor ) {
		editor.addCommand('wikilink', function () {
			open( editor );
		});
		editor.addCommand('wikiunlink', function () {
			unlink( editor );
		});
	};
	
	var registerKeys = function ( editor ) {
		editor.ui.registry.addButton( 'wikilink', {
			icon: 'link',
			tooltip: mw.msg("tinymce-link-link-button-tooltip"),
			shortcut: 'Meta+K',
			onAction: function () {
				return open( editor );
			},
		});
		editor.ui.registry.addMenuItem( 'wikilink', {
			icon: 'link',
			text: mw.msg('tinymce-link'),
			tooltip: mw.msg("tinymce-link-link-button-tooltip"),
			context: 'insert',
			onAction: function () {
				return open( editor );
			}
		});
		editor.ui.registry.addToggleButton('wikiunlink', {
			icon: 'unlink',
			onAction: function () {
				return unlink( editor );
			},
			onSetup: toggleEnabledState(editor, ["mwt-internallink", "mwt-externallink"])
		});
		editor.shortcuts.add('Meta+K', '', function () {
			open( editor );
		});
	};

	this.init = function(editor) {
		registerCommands ( editor );
		registerKeys ( editor );
	}
};

tinymce.PluginManager.add('wikilink', wikilink);
