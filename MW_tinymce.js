	var editor = tinymce.activeEditor
	var mw_server = 'https://' + mw.config.get( 'wgServer' ) + '/';
	var mw_scriptPath = mw.config.get( 'wgScriptPath' );
	var	mw_api = mw_scriptPath + '/api.php';
	var mw_extensionAssetsPath = mw.config.get( 'wgExtensionAssetsPath' );
	var mw_namespaces = mw.config.get( 'wgNamespaceIds' );
	var mw_url_protocols = mw.config.get( 'wgUrlProtocols' );
	var mw_canonical_namespace = mw.config.get( "wgCanonicalNamespace" ); 
	var mw_title = mw.config.get( "wgTitle" );
	var tinyMCETemplates = mw.config.get( 'wgTinyMCETemplates' );
	var tinyMCETagList = mw.config.get( 'wgTinyMCETagList' );
	var tinyMCEPreservedTagList = mw.config.get( 'wgTinyMCEPreservedTagList' );
	var tinyMCELanguage = mw.config.get( 'wgTinyMCELanguage' );
	var tinyMCEDirectionality = mw.config.get( 'wgTinyMCEDirectionality' );
	var tinyMCESettings = mw.config.get( 'wgTinyMCESettings' );
	var tinyMCELangURL = null;
	var mw_skin = mw.config.get( 'skin' );
	var mw_skin_css = '/load.php?debug=false&lang=en-gb&modules=mediawiki.legacy.commonPrint%2Cshared%7Cmediawiki.sectionAnchor%7Cmediawiki.skinning.interface%7Cskins.' + mw_skin + '.styles&only=styles&skin=' + mw_skin ;
	var mw_shared_css = '/resources/src/mediawiki.legacy/shared.css' ;
	var	mw_htmlInvariants = [ //these tags have no wiki code equivalents so don't need converting
	//DC TODO make sure TinyMCE set up to process all these tags itself otherwise you'll
	//need to add them back into mw_htmlPairsStatic or mw_htmlSingle. below
	  'abbr', 'b', 'bdi', 'bdo', 
	  'caption', 'center', 'reference',// 'code',
	  'data', 'del', 'dfn',  
	  'ins', 'kbd', 'mark', 'p', 'q',
	  'rb', 'rp', 'rt', 'rtc', 'ruby',
	  's',  'strike', //'span',
	  'time', 'tt', 'u', 
	  'link', 'meta', 'var', 'wbr',
	];
	var	mw_htmlPairsStatic = [ //now just non-nestable
		'a',
	//	'abbr',
	  'b',
	//	'bdi', 
	//	'caption', 'center', 'cite',
	  'code', // although code is a wiki invariant html tag treat as static pair so contained wiki code correctly parsed
	//	'data', 'del',  'dfn',  
		'img', 
	  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
	  'i',
	//  'ins', 'mark',
	  'p', // 'pre',
	//	'rb', 'rp', 'rt', 'rtc',
	//	's', 'strike', 
	//	'time', 'tt', 'u', 
	];
	var	mw_htmlBlockPairsStatic = [
		'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
		'ol', 'ul', 'li',
//		p', 'pre', 
		'p',
		'blockquote',
		'dl','dd','dt',
		'div',
		'hr',
//		'source',
		'table', 
	];
	var mw_htmlSingle = [
	  //'br', //don't render properly if process as a preserved tag!
	  'dd', 'dt', 'hr', 'li',
	//  'link', 'meta', 'wbr',
	];
	var mw_htmlSingleOnly = [
	  'br', 'hr', 'link', 'meta', 'wbr',
	];
	var mw_htmlNestable = [
	  'bdo', 'big', 
	  'blockquote', 
	  'dd', 'div', 'dl', 'dt', 'em', 'font',
	  'kbd', 'li', 'ol', 'q', 'ruby', 
	  'samp', 'small', 'span', 'strong', 'sub', 'sup',
	  'table', 'td', 'th', 'tr', 'ul', 'var', 'tbody',
	];
	var mw_htmlInsideTable = [
	  'td', 'th', 'tr',
	];
	var mw_htmlList = [
	  'ol', 'ul', 
	];
	var mw_htmlInsideList = [
	  'li',
	];
	var mw_preservedTagsList = mw_htmlPairsStatic.concat(mw_htmlSingleOnly, mw_htmlNestable, mw_htmlInvariants).join("|") + "|" + tinyMCETagList; 
	
	//set up other mw related constants
	
	// set up language url if language not 'en'
	if ( tinyMCELanguage !== 'en' ) {
		tinyMCELanguage = tinyMCELanguage.replace(/^([^-]*)(-)([^-]*)$/i, function( match, $1, $2, $3 ) {
			// tinymce expects '-' to be '_' and part after '_' to be upper case
			
			if ( $2 == '-' ) $2 = '_';
			return $1 + $2 + $3.toUpperCase;
		});
		tinyMCELangURL = mw_extensionAssetsPath + '/TinyMCE/tinymce/langs/' +
			tinyMCELanguage + '.js';
	};

	//get the local language name of the 'file' namespace
	mw_fileNamespace = 'file';
	for (var key in mw_namespaces ) {
	  if ( mw_namespaces[key] == 6 ) {
		  mw_fileNamespace = key;
	  }
	};


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
		var nonEditableParents = [],
			bm;

		editor.focus();
		nonEditableParents = editor.dom.getParents( editor.selection.getNode(),function ( aNode ) {
			if ( aNode.contentEditable === 'false' ) {
				return aNode
			}
		});

		if ( nonEditableParents.length > 0 ) {
			editor.selection.select ( nonEditableParents[ nonEditableParents.length - 1 ] );
		}

		editor.undoManager.transact ( function () {
			editor.selection.setContent ( content, args );
		});

		editor.nodeChanged();

		bm = editor.selection.getBookmark();

		editor.selection.moveToBookmark( bm )
	};

	var getContent = function ( editor, args ) {
		return editor.getContent( args );
	};

	var getSelection = function ( editor, args ) {
		return editor.selection.getContent( args );
	};

	var htmlDecode = function ( value ) {
//		return $("<textarea/>").html( value ).text();
		return tinymce.DOM.decode( value );
	};
	
	var  htmlEncode = function (value) {
//		return $('<textarea/>').text(value).html();
		return tinymce.DOM.encode( value );
	};
	
	var  createUniqueNumber = function() {
		return Math.floor( ( Math.random() * 100000000 ) + Date.now());
	};
	
	var translate = function( message ) {
		return mw.msg( message )
	};

/*	var onDblClickLaunch = function ( editor, aTarget, aClass, aCommand) {	
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
	}*/

	var toggleEnabledState = function( editor, selectors, on ) {
		// function to toggle a button's enabled state dependend
		// on which nodes are selected in the editor
		// if 'on' = true then the button is toggled on when the
		// given selectors are true otherwise it's toggled off
		return function (api) {
			editor.on('NodeChange', function (e) {
				var selectedNode = e.element,
					parents;
//debugger;
//				api.setDisabled(true);
				api.setDisabled( on );
				
				for (var selector in selectors) {
					if (selectedNode.className.indexOf( selectors[ selector ]) > -1) {
//						editor.selection.select(selectedNode);
						editor.off('NodeChange', true);
						return api.setDisabled( !on );						
					}
				}

				parents = $( selectedNode ).parents( selectors.join(",") );

				if (parents.length > 0 ) {
					editor.off('NodeChange', !on );
					return api.setDisabled(false);						
				}
				
/*				while (selectedNode.parentNode != null) {
					if (typeof selectedNode.className != "undefined") {
						for (var selector in selectors) {
							if (selectedNode.className.indexOf( selectors[ selector ]) > -1) {
								editor.selection.select(selectedNode);
								editor.off('NodeChange', true);
								return api.setDisabled(false);						
							}
						}
					}
					selectedNode = selectedNode.parentNode;
				}*/
			});
//			return editor.off('NodeChange', true);
		};
	};

	var doUpload = function(fileType, fileToUpload, fileName, fileSummary, ignoreWarnings){
		var uploadData = new FormData(),
			uploadDetails;

		uploadData.append("action", "upload");
		uploadData.append("filename", fileName);
		uploadData.append("text", fileSummary);
		uploadData.append("token", mw.user.tokens.get( 'csrfToken' ) );
		uploadData.append("ignorewarnings", ignoreWarnings );
		if (fileType == 'File') uploadData.append("file", fileToUpload);
		if (fileType == 'URL') uploadData.append("url", fileToUpload);
		uploadData.append("format", 'json');
		
		//as we now have created the data to send, we send it...
		$.ajax( { //http://stackoverflow.com/questions/6974684/how-to-send-formdata-objects-with-ajax-requests-in-jquery
			url: mw_api,
			contentType: false,
			processData: false,
			type: 'POST',
			async: false,
			data: uploadData,//the formdata object we created above
			success: function(data){
					uploadDetails = data;
			},
			error:function(xhr,status, error){
				uploadDetails['responseText'] = xhr.responseText;
				console.log(error);
			}
		});

		return uploadDetails;
	}

	var checkUploadDetail = function (editor, uploadDetails, ignoreWarnings, uploadName) {
		var message,
			result = [];
debugger;
		if (typeof uploadDetails == "undefined") {
			message = mw.msg("tinymce-upload-alert-unknown-error-uploading",
				uploadName );
			result = false;
		} else if (typeof uploadDetails.responseText != "undefined") {
			message = mw.msg("tinymce-upload-alert-error-uploading",uploadDetails.responseText);
			editor.windowManager.alert(message);
			result = false;
		} else if (typeof uploadDetails.error != "undefined") {
			message = mw.msg("tinymce-upload-alert-error-uploading",uploadDetails.error.info);
			// if the error is because the file exists then we can ignore and
			// use the existing file
			if (uploadDetails.error.code == "fileexists-no-change") {
				result = 'exists';
			} else {
				result = false;
				editor.windowManager.alert(message);
			}
		} else if (typeof uploadDetails.upload.warnings != "undefined" && (!ignoreWarnings)) {
			message = mw.msg("tinymce-upload-alert-warnings-encountered", uploadName) + "\n\n" ;
			result = 'warning';
			for (warning in uploadDetails.upload.warnings) {
				warningDetails = uploadDetails.upload.warnings[warning];
				if (warning == 'badfilename') {
					message = message + "	" + mw.msg("tinymce-upload-alert-destination-filename-not-allowed") + "\n";
					editor.windowManager.alert(message);
					result = false;
				} else if (warning == 'exists') {
//					message = message + "	" + mw.msg("tinymce-upload-alert-destination-filename-already-exists") + "\n";
					editor.windowManager.confirm(mw.msg("tinymce-upload-confirm-file-already-exists", uploadName),
						function(ok) {
							if (ok) {
								result = 'exists';
							} else {
								result = false;
							}
						});
				} else if (warning == 'duplicate') {
//					duplicate = warningDetails[ 0 ];
					editor.windowManager.confirm(mw.msg("tinymce-upload-confirm-file-is-duplicate", uploadName, warningDetails[ 0 ]),
						function(ok) {
							if (ok) {
								result = warningDetails[ 0 ];
							} else {
								result = false;
							}
						});
/*					message = message + "	" + mw.msg("tinymce-upload-alert-duplicate-file",warningDetails[ 0 ]) + "\n"
					result = 'duplicate';*/
				} else {
					message = message + "	" + mw.msg("tinymce-upload-alert-other-warning",warning) + "\n"
					editor.windowManager.alert(message);
					result = false;
				}
			}
//			editor.windowManager.alert(message);
		} else if (typeof uploadDetails.upload.imageinfo != "undefined") {
//			result = uploadDetails.upload.imageinfo.url;
			result["url"] = uploadDetails.upload.imageinfo.url;
			result["page"] = uploadDetails.upload.imageinfo.canonicaltitle;
		}
		return result;
	}

	var utility = {
		setContent: setContent,
		setSelection: setSelection,
		getContent: getContent,
		getSelection: getSelection,
		htmlDecode: htmlDecode,
		htmlEncode: htmlEncode,
		createUniqueNumber: createUniqueNumber,
//		onDblClickLaunch: onDblClickLaunch,
		toggleEnabledState: toggleEnabledState,
		translate: translate,
		doUpload: doUpload,
		checkUploadDetail: checkUploadDetail
	};

var defaultSettings = function(selector) {
	return {
		selector: selector,
		base_url: mw_extensionAssetsPath + '/TinyMCE/tinymce',
		theme_url: mw_extensionAssetsPath + '/TinyMCE/tinymce/themes/silver/theme.min.js',
		skin_url: mw_extensionAssetsPath + '/TinyMCE/tinymce/skins/ui/oxide',
		icons_url: mw_extensionAssetsPath + '/TinyMCE/custom_plugins/mediawiki/plugins/mw_wikiparser/icons/icons.js',
//		mw_extensionAssetsPath + '/TinyMCE/custom_plugins/mediawiki/plugins/mw_wikireference/icons/icons.js',
//		icons_url: mw_extensionAssetsPath + '/TinyMCE/custom_plugins/mediawiki/plugins/mw_wikireference/icons/icons.js',
		icons: 'mwt',
		language_url: tinyMCELangURL,
		language: tinyMCELanguage,
  		wiki_utility: utility,
		content_css:
			[
				mw_scriptPath + mw_skin_css,
				mw_scriptPath + mw_shared_css,
				mw_extensionAssetsPath + '/TinyMCE/MW_tinymce.css',
				mw_extensionAssetsPath + '/SyntaxHighlight_GeSHi/modules/pygments.wrapper.css',
				mw_extensionAssetsPath + '/SyntaxHighlight_GeSHi/modules/pygments.generated.css',
			],
		external_plugins: {
			// load 'wikiutiilities' first as it is used in other plugins
//			'wikiutiilities': mw_extensionAssetsPath + '/TinyMCE/custom_plugins/mediawiki/plugins/mw_wikiutilities/plugin.js',
			'advlist': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/advlist/plugin.js',
			'anchor': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/anchor/plugin.js',
			'autolink': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/autolink/plugin.js',
//DC TODO autoresize is broken - it just endlessly extends the editor window?
//			'autoresize': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/autoresize/plugin.js',
			'autosave': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/autosave/plugin.js',
//			'charmap': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/charmap/plugin.js',
			'insertdatetime': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/insertdatetime/plugin.js',
//			'image': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/image/plugin.js',
//			'link': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/link/plugin.js',
			'lists': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/lists/plugin.js',
//			'media': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/media/plugin.js',
			'noneditable': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/noneditable/plugin.js',
//			'paste': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/paste/plugin.js',
			'preview': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/preview/plugin.js',
			'save': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/save/plugin.js',
			'searchreplace': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/searchreplace/plugin.js',
			'template': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/template/plugin.js',
//			'visualblocks': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/visualblocks/plugin.js',
//			'visualchars': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/visualchars/plugin.js',
			'wikilink': mw_extensionAssetsPath + '/TinyMCE/custom_plugins/mediawiki/plugins/mw_wikilink/plugin.js',
 			'wikinonbreaking': mw_extensionAssetsPath + '/TinyMCE/custom_plugins/mediawiki/plugins/mw_wikinonbreaking/plugin.js',
 			'wikinonrenderinglinebreak': mw_extensionAssetsPath + '/TinyMCE/custom_plugins/mediawiki/plugins/mw_wikinonrenderinglinebreak/plugin.js',
			'wikiparser': mw_extensionAssetsPath + '/TinyMCE/custom_plugins/mediawiki/plugins/mw_wikiparser/plugin.js',
			'wikipaste': mw_extensionAssetsPath + '/TinyMCE/custom_plugins/mediawiki/plugins/mw_wikipaste/plugin.js',
			'wikireference': mw_extensionAssetsPath + '/TinyMCE/custom_plugins/mediawiki/plugins/mw_wikireference/plugin.js',
			'wikitable': mw_extensionAssetsPath + '/TinyMCE/custom_plugins/mediawiki/plugins/mw_wikitable/plugin.js',
			'wikitext': mw_extensionAssetsPath + '/TinyMCE/custom_plugins/mediawiki/plugins/mw_wikitext/plugin.js',
			'wikitoggle': mw_extensionAssetsPath + '/TinyMCE/custom_plugins/mediawiki/plugins/mw_wikitoggle/plugin.js',
			'wikiupload': mw_extensionAssetsPath + '/TinyMCE/custom_plugins/mediawiki/plugins/mw_wikiupload/plugin.js',
//			'wslink': mw_extensionAssetsPath + '/TinyMCE/custom_plugins/wikibase/plugins/ws_link/plugin.js',
		},
		//
		// *** tinymce configuration ***
		//
		// ** mediawiki related settings**
		//
		// single new lines: set non_rendering_newline_character to false if you don't use non-rendering single new lines in wiki
		wiki_non_rendering_newline_character: '&#120083', // was &para;
		// set the page title
		wiki_page_mwtPageTitle: mw_canonical_namespace + ':' + mw_title,
		// set the path to the wiki api
		wiki_api_path: mw_api,
		// set the valid wiki namespaces
		wiki_namespaces: mw_namespaces,
		// set the local name of the 'file' namespace
		wiki_fileNamespace: mw_fileNamespace,
		// set the valid wiki protocols
		wiki_url_protocols: mw_url_protocols,
		// following allowed html tags are taken from
		// https://phabricator.wikimedia.org/source/mediawiki/browse/REL1_29/includes/Sanitizer.php
//		wiki_tags_list: tinyMCETagList + '|' + tinyMCEPreservedTagList,
		wiki_extension_tags_list: tinyMCETagList,
		wiki_preserved_tags_list: mw_preservedTagsList,
		wiki_preserved_single_tags_list: mw_htmlSingle.concat(mw_htmlInsideTable).join("|"),
		wiki_preserved_pairs_static_tags_list: mw_htmlPairsStatic.join("|"),
		wiki_preserved_pairs_nestable_tags_list: mw_htmlNestable.join("|"),
		wiki_preserved_pairs_tags_list: mw_htmlPairsStatic.concat(mw_htmlNestable).join("|"),
//		wiki_preserved_tags_list: mw_htmlPairsStatic.concat(mw_htmlSingleOnly, mw_htmlNestable).join("|") + tinyMCETagList,
		wiki_block_tags: mw_htmlBlockPairsStatic.join("|"),
		wiki_invariant_tags: mw_htmlInvariants.join("|"),
//		wiki_preserved_html_tags: mw_preserveHtml.join("|"),
		//
		// ** TinyMCE editor settings **
		//
		// the following codes are used to display placeholders in the editor window for
		// mediawiki markup that is not rendered in the page window.  These allow them to be
		// identified and edited in the TinyMCE editore window
		//
		// single new lines: set non_rendering_newline_character to false if you don't use non-rendering single new lines in wiki
		showPlaceholders: false,
//		showPlaceholders: true,
		branding: false,
//		relative_urls: false,
//		remove_script_host: false,
//		document_base_url: server,
//		tinyMCETemplates: tinyMCETemplates,
//		entity_encoding: 'raw',
		automatic_uploads: true,
		paste_data_images: true,
		paste_word_valid_elements: 'b,strong,i,em,h1,h2,h3,h4,h5,table,tr,th,td,ol,ul,li,a,sub,sup,strike,br,del,div,p',
		paste_webkit_styles: "none",
		browser_spellcheck: true,
		allow_html_in_named_anchor: true,
		visual: false,
		nonbreaking_wrap: false,
		wikimagic_context_toolbar: true,
		browsercontextmenu_context_toolbar: true,
		contextmenu: "undo redo | cut copy paste insert | link wikimagic table | styleselect removeformat | browsercontextmenu",
		convert_fonts_to_spans: true,
		link_title: false,
		link_assume_external_targets: true,
		link_class_list: [
			{title: 'External', value: 'mwt-nonEditable mwt-wikiMagic mwt-externallink'},
			{title: 'Internal', value: 'mwt-nonEditable mwt-wikiMagic mwt-internallink'},
		],
		target_list: false,
//		visual_table_class : "wikitable",
		visual_table_class: " ",
/*		table_default_attributes: {
			class: 'wikitable'
		},*/
		height: 500,
		autoresize_max_height: 600,
//		code_dialog_width: 1200,
//		code_dialog_height: 500,
		statusbar: false,
		// the default text direction for the editor
		directionality: tinyMCEDirectionality,
		// don't wrap the editable element?
		nowrap: false,
		// enable resizing for element like images, tables or media objects
		object_resizing: true,
		// the html mode for tag creation (we need xhtml)
		element_format: 'xhtml',
//		element_format: 'html',
		// define the element what all inline elements needs to be wrapped in
		forced_root_block: 'p',
		forced_root_block_attrs: {
			'class': 'mwt-paragraph'
		},
//		end_container_on_empty_block: true,
		remove_trailing_brs: false,
		// indentation depth
		// keep current style on pressing return
		keep_styles: true,
		// save plugin
		save_enablewhendirty: true,
		// Allow style tags in body and unordered lists in spans (inline)
		valid_children: "+span[ul],+span[div],+em[div],+big[div],+small[div],+p[div]",
		extended_valid_elements: "big,small",
//	    custom_elements: "~nowiki",
//		closed: /^(br|hr|input|meta|img|link|param|area|nowiki)$/,
//		valid_children: "+*[*]",
		// Set the ID of the body tag in iframe to bodyContent, so styles do
		// apply in a correct manner. This may be dangerous.
		body_id: 'bodyContent',
		// Allowable file types for file picker
		file_picker_types: 'file image media',
		// Enable/disable options in upload popup
		image_description: true,
		image_title: true,
		image_dimensions: true,
		image_advtab: true,
		image_class_list: [
			{title: mw.msg("tinymce-upload-type-label-file"), value: 'File'},
			{title: mw.msg("tinymce-upload-type-label-url"), value: 'URL'},
			{title: mw.msg("tinymce-upload-type-label-wiki"), value: 'Wiki'}
		],
		menubar: false, //'edit insert view format table tools',
		contextmenu_never_use_native: false,
//		removed_menuitems: 'media',
		// fontawesome configuration
		noneditable_noneditable_class: 'fa',
		extended_valid_elements: 'span[*]',
		// tinymce configuration
		toolbar_sticky: true,
//		toolbar1: 'undo redo | cut copy paste insert | bold italic underline strikethrough subscript superscript forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | charmap fontawesome singlelinebreak wikilink unlink table wikiupload wikimagic wikisourcecode | formatselect styleselect removeformat | searchreplace ',
		toolbar: 'undo redo | cut copy paste insert selectall| bold italic underline strikethrough subscript superscript forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist advlist outdent indent | wikilink wikiunlink table image media | formatselect removeformat| visualchars visualblocks| searchreplace |  wikimagic wikisourcecode wikitext wikiupload | wikitoggle nonbreaking singlelinebreak reference template',
		//style_formats_merge: true,
		style_formats: [
			{
				title: "Table", items: [
					{title: "Sortable", selector: "table", classes: "sortable"},
					{title: "Wikitable", selector: "table", classes: "wikitable"},
					{title: "Contenttable", selector: "table", classes: "contenttable"},
				]
			},
			{
				title: "Cell", items: [
					{title: "Left", selector: "td", format: "alignleft", icon: "alignleft"},
					{title: "Center", selector: "td", format: "aligncenter", icon: "aligncenter"},
					{title: "Right", selector: "td", format: "alignright", icon: "alignright"},
					{title: "Align Top", selector: "td", styles: {verticalalign: "top"}},
					{title: "Align Middle", selector: "td", styles: {verticalalign: "middle"}},
					{title: "Align Bottom", selector: "td", styles: {verticalalign: "bottom"}}
				]
			},
			{title: "Pre", block: "pre", classes: "mw_pre_from_space"},
			{title: "Paragraph", block: "p"}
		],
		formats: {
			// Changes the default format for h1 to have a class of mwt-heading
			h1: { block: 'h1', classes: 'mwt-heading', attributes: { 'data-mwt-headingSpacesBefore': ' ' , 'data-mwt-headingSpacesAfter': ' ' } },
			h2: { block: 'h2', classes: 'mwt-heading', attributes: { 'data-mwt-headingSpacesBefore': ' ' , 'data-mwt-headingSpacesAfter': ' ' } },
			h3: { block: 'h3', classes: 'mwt-heading', attributes: { 'data-mwt-headingSpacesBefore': ' ' , 'data-mwt-headingSpacesAfter': ' ' } },
			h4: { block: 'h4', classes: 'mwt-heading', attributes: { 'data-mwt-headingSpacesBefore': ' ' , 'data-mwt-headingSpacesAfter': ' ' } },
			h5: { block: 'h5', classes: 'mwt-heading', attributes: { 'data-mwt-headingSpacesBefore': ' ' , 'data-mwt-headingSpacesAfter': ' ' } },
			h6: { block: 'h6', classes: 'mwt-heading', attributes: { 'data-mwt-headingSpacesBefore': ' ' , 'data-mwt-headingSpacesAfter': ' ' } },
			'ul': { inline: 'ul', classes: 'mwt-listItem', wrapper: true }
//			ul: { block: 'ul', classes: 'mwt-listItem' },
//			ol: { block: 'ol', classes: 'mwt-listItem' },
//			li: { block: 'li', classes: 'mwt-listItem' }
		},
		block_formats: 'Paragraph=p;Heading 1=h1;Heading 2=h2;Heading 3=h3;Heading 4=h4;Heading 5=h5;Heading 6=h6;Preformatted=pre;Code=code',
		images_upload_credentials: true,
//		autoresize_max_height: 400,
		template_selected_content_classes: "selectedcontent",
		setup: function (editor) {
		},
		init_instance_callback: function (instance) {
			// For some reason, in some installations this only works as an inline function,
			// instead of a named function defined elsewhere.
			var minimizeOnBlur = $("textarea#" + instance.id).hasClass('mceMinimizeOnBlur');
			if (minimizeOnBlur) {
				var mcePane = $("textarea#" + instance.id).prev();
				// Keep a little sliver of the toolbar so that users see it.
				mcePane.find(".mce-toolbar-grp").css("height", "10px");
				mcePane.find(".mce-toolbar-grp .mce-flow-layout").hide("medium");
			}
		},
		file_picker_callback: function (cb, value, meta) {
			var input = document.createElement('input');
			input.setAttribute('type', 'file');
			input.onchange = function () {
				var file = this.files[0];

				var reader = new FileReader();
				reader.onload = function (e) {
					var fileContent = file;
					// call the callback and populate the src field with the file name
					// and srccontent field with the content of the file
					cb(e.target.result, {srccontent: fileContent, src: file.name});
				};
				reader.readAsDataURL(file);
			};

			input.click();
		},
//		alert_message: alertMessage,
//		check_upload_permissions: mw_CheckPermissions
	};
};

var mwTinyMCEInit = function( tinyMCESelector, settings ) {
	var customSettings = updateSettings( tinyMCESelector, settings );
	window.tinymce.init( customSettings );
};

var updateSettings = function( tinyMCESelector, settings ) {
	var defaultSet = defaultSettings(tinyMCESelector);
	$.each(settings, function (k, v) {
		if ( k.endsWith( '+' ) ) {
			// adding to default parameter
			k = k.slice( 0, - 1 );
			if ($.type( defaultSet[k] ) === "string") {
				defaultSet[k] = defaultSet[k] + v;
			} else if (Array.isArray ( defaultSet[k] ) ) {
				defaultSet[k] = defaultSet[k].concat( v );
			} else if ( Object.keys( defaultSet[k]).length > 0 ) {
				$.extend( defaultSet[k], v );
			}
		} else if ( k.endsWith( '-' ) ) {
			// removing from default parameter
			k = k.slice( 0, - 1 );
			if ($.type( defaultSet[k] ) === "string") {
				// if default value is a string remove the value from it
				var str = defaultSet[k],
					regex,
					matcher;
				regex = '\\s*' + v + '\\s*';
				matcher = new RegExp(regex, 'gm');
				str = str.replace(matcher, ' ');
				defaultSet[k] = str;
			} else if (Array.isArray ( defaultSet[k] ) ) {
				// if default value is an array remove the element with
				// key == value from it
				var i = 0,
					arr = defaultSet[k];
				while (i < arr.length) {
					if (arr[i] === v) {
						arr.splice(i, 1);
    				} else {
     					++i;
    				}
				}
				defaultSet[k] = arr;
			} else if ( Object.keys( defaultSet[k] ).length > 0 ) {
				// if default value is an object remove the element with
				// key == value from it
				var obj = defaultSet[k];
				$.each( v, function ( key, val ) {
					if ( obj[ key ] == val ) {
						delete obj[ key ];
					}
				});
				defaultSet[k] = obj;
			} else if ( v == '' ) {
				// if the value is blank remove the key from the default values 
				// key == value from it
				var obj = defaultSet;
//				$.each( v, function ( key, val ) {
					if ( obj[ k ]) {
						delete obj[ k ];
					}
//				});
				defaultSet = obj;
			}
		} else {
			//replacing default parameter
			defaultSet[k] = v;
		}
	});
	return defaultSet;
};

$.each(tinyMCESettings, function (selector, settings) {
	mwTinyMCEInit(selector, settings);
	registerCommands( editor );
});
// mwTinyMCEInit( '.tinymce, #wpTextbox1' );

// Let others know we're done here
$( document ).trigger( 'TinyMCELoaded' ); 
