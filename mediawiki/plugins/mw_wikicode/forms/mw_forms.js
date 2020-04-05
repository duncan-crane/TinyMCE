/**
 * mw_forms.js
 *
 * Version: 1.0.0 (17/01/2019)
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * mw_forms does provides the dialog functionality for mw_wikicode
 *
 */
define(
  [
//    "wikicode"
  ],
  function Tools(){
	function showWikiLinkDialog() {
		var selectedNode = _ed.selection.getNode(),
			data = {},
			dataType = '',
			isWikiLink = '',
			linkParts = [],
			value = '',
			aLink = '',
			classListCtrl,
			linkCtrl,
			labelCtrl;

		function buildListItems(inputList, itemCallback, startItems) {
			function appendItems(values, output) {
				output = output || [];
	
				tinymce.each(values, function(item) {
					var menuItem = {text: item.text || item.title};
	
					if (item.menu) {
						menuItem.menu = appendItems(item.menu);
					} else {
						menuItem.value = item.value;
	
						if (itemCallback) {
							itemCallback(menuItem);
						}
					}
					
					output.push(menuItem);
				});
	
				return output;
			}
	
			return appendItems(inputList, startItems || []);
		}
		if (typeof(selectedNode.attributes["data-mw-type"]) !== "undefined" ) {
			data.class = selectedNode.attributes["class"].value;
			if (data.class =='link internal mw-internal-link mceNonEditable new') {
				data.class = 'link internal mw-internal-link mceNonEditable';
			}
			dataType = selectedNode.attributes["data-mw-type"].value;
			isWikiLink = 
				dataType == "internal_link" || 
				dataType == "external_link" ;	
		}

		if (isWikiLink) {
			value = decodeURI(selectedNode.attributes["data-mw-wikitext"].value);
			if (dataType == 'internal_link') {
				value = value.substr(2, value.length - 4);
				linkParts = value.split("|");
				aLink = linkParts[0];
				if (linkParts.length > 1) {
					value = linkParts[1];
				} else {
					value = '';
				}
			} else if (dataType == 'external_link') {
				value = value.substr(1, value.length - 2);
				linkParts = value.split(" ");
				aLink = linkParts[0];
				if (linkParts.length > 1) {
					linkParts.shift();
					value = linkParts.join(" ");
				} else {
					value = '';
				}
			}
		} else {
			value = _ed.selection.getContent({format : 'text'});
		}
		data.href = aLink;
		data.text = value;
		
		if (_ed.settings.link_class_list) {
			classListCtrl = {
				name: 'class',
				type: 'listbox',
				label: mw.msg("tinymce-link-type-label"),
				value: data.class,
				values: buildListItems(
					_ed.settings.link_class_list,
					function(item) {
						if (item.value) {
							item.textStyle = function() {
								return _ed.formatter.getCssText({inline: 'a', classes: [item.value]});
							};
						}
					}
				)
			};
		}

		linkCtrl = {
			name: 'href',
			type: 'textbox',
			size: 40,
			label: mw.msg("tinymce-link-url-page-label"),
			value: data.href,
			onchange: function() {
				data.href = this.value();
			}
		};

		labelCtrl = {
			name: 'text',
			type: 'textbox',
			size: 40,
			label: mw.msg("tinymce-link-display-text-label"),
			value: data.text,
			onchange: function() {
				data.text = this.value();
			}
		};

		_ed.windowManager.open({
			title: mw.msg('tinymce-link-title'),
			data: data,
			body: [
				classListCtrl,
				linkCtrl,
				labelCtrl
			],
			onsubmit: function(e) {
				/*eslint dot-notation: 0*/
				var href;
				data = tinymce.extend(data, e.data);
				href = data.href;

				// Delay confirm since onSubmit will move focus
				function delayedConfirm(message, callback) {
					var rng = _ed.selection.getRng();

					tinymce.util.Delay.setEditorTimeout(_ed, function() {
						_ed.windowManager.confirm(message, function(state) {
							_ed.selection.setRng(rng);
							callback(state);
						});
					});
				}

				function insertLink() {
					//Trim left and right everything (including linebreaks) that is not a starting or ending link code
					//This is necessary to avoid the bswikicode parser from breaking the markup
					var href = data.href.replace(/(^.*?\[|\].*?$|\r\n|\r|\n)/gm, ''); //first layer of '[...]' //external-, file- and mailto- links
					href = href.replace(/(^.*?\[|\].*?$|\r\n|\r|\n)/gm, ''); //potential second layer of '[[...]]' //internal and interwiki links
					var aLink = decodeURIComponent(href).replace("_"," ");
					var aLabel = decodeURI(data.text).replace("_"," ");
					var wikitext = "";
					
					if (data["class"] == "link internal mw-internal-link mceNonEditable") { 
						if (aLabel) {
							wikitext = "[[" + aLink + "|" + aLabel + "]]";
						} else {
							wikitext = "[[" + aLink + "]]";			
						}
					} else if (data["class"] == "link external mw-external-link mceNonEditable") {
						if (aLabel) {
							wikitext = "[" + aLink + " " + aLabel + "]";
						} else {
							wikitext = "[" + aLink + "]";
						}
					}
					
					_ed.undoManager.transact(function(){
						_ed.focus();
						_ed.selection.setContent(wikitext);
						_ed.undoManager.add();
						_ed.format = 'raw';
					});
				}

				if (!href) {
					_ed.execCommand('unlink');
					return;
				}

				// Is email and not //user@domain.com
				if (href.indexOf('@') > 0 && href.indexOf('//') == -1 && href.indexOf('mailto:') == -1) {
					delayedConfirm(
						mw.msg("tinymce-link-want-to-link-email"),
						function(state) {
							if (state) {
								data.href = 'mailto:' + data.href;
							}
							insertLink();
						}
					);
					return;
				}

				// Is not protocol prefixed
				var hasUrl,
				urlProtocolMatch = "/^" + mw.config.get( 'wgUrlProtocols' ) + "/i";
				urlProtocolMatch = urlProtocolMatch.replace(/\|/g,"|^");
				if (href.match(urlProtocolMatch) ||
					href.substr(0,2) === "//" ) {
					hasUrl = true;
				}
				
				if ((data["class"] == "link external mw-external-link mceNonEditable") &&
					(_ed.settings.link_assume_external_targets && !hasUrl)) {
					delayedConfirm(
						mw.msg("tinymce-link-want-to-link-external"),
						function(state) {
							if (state) {
								data.href = '//' + data.href;
							}
							insertLink();
						}
					);
					return;
				}

				insertLink();
				return;
			}
		});
		return;
	}

	function showWikiMagicDialog() {
		var selectedNode = _ed.selection.getNode(),
			nodeType = '',
			isWikimagic = '',
			value = '';

		if (typeof(selectedNode.attributes["data-mw-type"]) !== "undefined" ) {
			nodeType = selectedNode.attributes["data-mw-type"].value;
			isWikimagic = 
				nodeType == "template" || 
				nodeType == "switch" || 
				nodeType == "tag" ||
				nodeType == "comment" ;	
		}

		if (isWikimagic) {
			value = decodeURI(selectedNode.attributes["data-mw-wikitext"].value);
		} else {
			value = _ed.selection.getContent({format : 'text'});
		}
		
		_ed.windowManager.open({
			title: mw.msg('tinymce-wikimagic-title'),
			body: {
				type: 'textbox', 
				name: 'code', 
				size: 40, 
				label: 'Code value', 
				multiline: true,
				minWidth: _ed.getParam("code_dialog_width", 600),
				minHeight: _ed.getParam("code_dialog_height", 
				Math.min(tinymce.DOM.getViewPort().h - 200, 500)),
				spellcheck: false,
				style: 'direction: ltr; text-align: left',
				value: value
				},
			onsubmit: function(e) {
				_ed.undoManager.transact(function(){
					e.load = true;
					_ed.focus();
					_ed.selection.setContent(e.data.code,e);
					_ed.undoManager.add();
					_ed.format = 'raw';
				});
				return;
			}
		});
		return;
	}
	
	function showWikiSourceCodeDialog() {
		var originalValue = _ed.getContent({source_view: true});
		var win = _ed.windowManager.open({
			title: mw.msg("tinymce-wikisourcecode"),
			body: {
				type: 'textbox',
				name: 'code',
				multiline: true,
				minWidth: _ed.getParam("code_dialog_width", 600),
				minHeight: _ed.getParam("code_dialog_height", 
				Math.min(tinymce.DOM.getViewPort().h - 200, 500)),
				spellcheck: false,
				style: 'direction: ltr; text-align: left',
			},
			onSubmit: function(e) {
				// We get a lovely "Wrong document" error in IE 11 if we
				// don't move the focus to the editor before creating an undo
				// transation since it tries to make a bookmark for the current selection
				_ed.undoManager.transact(function() {
					e.load = true;
					_ed.focus();
					_ed.setContent(e.data.code,e);	
					_ed.undoManager.add();
					_ed.format = 'raw';
				});
				_ed.selection.setCursorLocation();
				_ed.nodeChanged();
			}, 
		});

		// Gecko has a major performance issue with textarea
		// contents so we need to set it when all reflows are done
		win.find('#code').value(originalValue);
	}
  }
);
