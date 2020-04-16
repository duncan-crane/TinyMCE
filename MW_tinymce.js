var mw_server = 'https://' + mw.config.get( 'wgServer' ) + '/';
var mw_scriptPath = mw.config.get( 'wgScriptPath' );
var mw_extensionAssetsPath = mw.config.get( 'wgExtensionAssetsPath' );
var mw_namespaces = mw.config.get( 'wgNamespaceIds' );
var mw_url_protocols = mw.config.get( 'wgUrlProtocols' );
var mw_canonical_namespace = mw.config.get( "wgCanonicalNamespace" ); 
var mw_title = mw.config.get( "wgTitle" );
var tinyMCEMacros = mw.config.get( 'wgTinyMCEMacros' );
var tinyMCETagList = mw.config.get( 'wgTinyMCETagList' );
var tinyMCEPreservedTagList = mw.config.get( 'wgTinyMCEPreservedTagList' );
var tinyMCELanguage = mw.config.get( 'wgTinyMCELanguage' );
var tinyMCEDirectionality = mw.config.get( 'wgTinyMCEDirectionality' );
var tinyMCELangURL = null;
var mw_skin = mw.config.get( 'skin' );
var mw_skin_css = '/load.php?debug=false&lang=en-gb&modules=mediawiki.legacy.commonPrint%2Cshared%7Cmediawiki.sectionAnchor%7Cmediawiki.skinning.interface%7Cskins.' + mw_skin + '.styles&only=styles&skin=' + mw_skin ;
var mw_shared_css = '/resources/src/mediawiki.legacy/shared.css' ;
var	mw_htmlInvariants = [ //these tags have no wiki code equivalents so don't need converting
//DC TODO make sure TinyMCE set up to process all these tags itself otherwise you'll
//need to add them back into mw_htmlPairsStatic or mw_htmlSingle. below
	'abbr', 'b', 'bdi', 'bdo', 
	'caption', 'center', 'cite',// 'code',
	'data', 'del', 'dfn',  
	'ins', 'kbd', 'mark', 'p', 'q',
	'rb', 'rp', 'rt', 'rtc', 'ruby',
	's',  'strike', //'span',
	'time', 'tt', 'u', 
	'link', 'meta', 'var', 'wbr',
];
var	mw_htmlPairsStatic = [ //now just non-nestable
/*	'abbr', 'b', 'bdi', 'big', 'blockquote', 
	'caption', 'center', 'cite', 'code',
	'data', 'dd', 'del',  'dfn', 'div', 'dl', 'dt', 'em', 'font',  
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
	'i', 'ins', 'kbd', 'li', 'mark',  'ol', 'p', 'pre',
	'ruby', 'rb', 'rp', 'rt', 'rtc',
	's', 'samp','small', 'span', 'strike', 'strong', 'sub', 'sup', 
	'table', 'time', 'tt', 'u', 'ul', 'var', */
//	'abbr',
	'b',
//	'bdi', 
//	'caption', 'center', 'cite',
	'code', // although code is a wiki invariant html tag treat as static pair so contained wiki code correctly parsed
//	'data', 'del',  'dfn',  
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
	'img', 
    'ol', 'ul', 'li',
    'p', 'pre', 
    'blockquote',
    'dl','dd','dt',
    'div',
    'hr',
	'source',
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
	'table', 'td', 'th', 'tr', 'ul', 'var',
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

window.mwTinyMCEInit = function( tinyMCESelector ) {
	window.tinymce.init({
		selector: tinyMCESelector,
///		theme_url: mw_extensionAssetsPath + '/TinyMCE/tinymce/themes/modern/theme.js',
		theme_url: mw_extensionAssetsPath + '/TinyMCE/tinymce/themes/silver/theme.js',
///		skin_url: mw_extensionAssetsPath + '/TinyMCE/tinymce/skins/lightgray',
		skin_url: mw_extensionAssetsPath + '/TinyMCE/tinymce/skins/ui/oxide',
		content_css:
			[ 
			mw_scriptPath + mw_skin_css,
			mw_scriptPath + mw_shared_css,
			mw_extensionAssetsPath + '/TinyMCE/MW_tinymce.css',
			mw_extensionAssetsPath + '/TinyMCE/fontawesome/plugins/fontawesome/css/font-awesome.min.css',
			mw_extensionAssetsPath + '/SyntaxHighlight_GeSHi/modules/pygments.wrapper.css',
			mw_extensionAssetsPath + '/SyntaxHighlight_GeSHi/modules/pygments.generated.css',
		],
		external_plugins: {
			'anchor': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/anchor/plugin.js',
			'autolink': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/autolink/plugin.js',
//DC TODO autoresize is broken - it just endlessly extends the editor window?
//			'autoresize': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/autoresize/plugin.js',
			'autosave': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/autosave/plugin.js',
			'charmap': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/charmap/plugin.js',
			'insertdatetime': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/insertdatetime/plugin.js',
			'lists': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/lists/plugin.js',
			'noneditable': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/noneditable/plugin.js',
			'paste': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/paste/plugin.js',
			'preview': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/preview/plugin.js',
			'save': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/save/plugin.js',
			'searchreplace': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/searchreplace/plugin.js',
			'visualblocks': mw_extensionAssetsPath + '/TinyMCE/tinymce/plugins/visualblocks/plugin.js',
// DC TODO fix fontawesome for TMCE v 5
//			'fontawesome': mw_extensionAssetsPath + '/TinyMCE/fontawesome/plugins/fontawesome/plugin.js',
// DC TODO fix tables for TMCE v 5
//			'table': mw_extensionAssetsPath + '/TinyMCE/mediawiki/plugins/mw_table/plugin.js',
			'wikicode': mw_extensionAssetsPath + '/TinyMCE/mediawiki/plugins/mw_wikicode/plugin.js',
//			'wikiupload': mw_extensionAssetsPath + '/TinyMCE/mediawiki/plugins/mw_upload/plugin.js',
		},
		//
		// *** tinymce configuration ***
		//
		// ** mediawiki related settings**
		// 
		// set the page title
		wiki_page_title: mw_canonical_namespace + ':' + mw_title,
		// set the path to the wiki api
		wiki_api_path: mw_scriptPath + '/api.php',
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
		//
		// ** TinyMCE editor settings **
		//
		// the following codes are used to display placeholders in the editor window for
		// mediawiki markup that is not rendered in the page window.  These allow them to be
		// identified and edited in the TinyMCE editore window
		//
		// single new lines: set non_rendering_newline_character to false if you don't use non-rendering single new lines in wiki
		wiki_non_rendering_newline_character: '&#120083', // was &para;
		// comments: set non_rendering_comment_character to false if you don't use non-rendering comments in wiki
		wiki_non_rendering_comment_character: '&#8493',
		// <nowiki /> tags: set non_rendering_nowiki_character to false if you don't use non-rendering nowiki tag in wiki
		wiki_non_rendering_nowiki_character: '&#120081',
		// <br /> tags: set rendering_br_character to false if you don't use rendering br tag in wiki
		wiki_rendering_br_character: '&#8492',
		// Images are frequntly displayed on the page in a location separate from where the markup appears within the wiki
		// markup so the following character is used to located the non-rendering image in the editor window.  The image is 
		// also disdplayed, in the editor window where one would expect
		// Elements containing <img> tags: set non-rendering_img_character to false if you don't use non-rendering img tag in wiki
		wiki_non_rendering_img_character: '&#8464',
		// non-rendering parser output: this is used so the parsed element can be edited in the editor.
		// set non_rendering_parser_output_character to false if you don't use non-rendering parser output placeholder in wiki
		wiki_non_rendering_parser_output_character: '&#120090',
		//
		valid_elements: mw_preservedTagsList,
		branding: false,
//		relative_urls: false,
//		remove_script_host: false,
//		document_base_url: server,
		tinyMCEMacros: tinyMCEMacros,
		automatic_uploads: true,
		paste_data_images: true,
		paste_word_valid_elements: 'b,strong,i,em,h1,h2,h3,h4,h5,table,tr,th,td,ol,ul,li,a,sub,sup,strike,br,del,div,p',
		invalid_elements: 'tbody,thead,tfoot,colgroup,col',
		browser_spellcheck: true,
		allow_html_in_named_anchor: true,
		visual : false,
		wikimagic_context_toolbar: true,
		browsercontextmenu_context_toolbar: true,
		contextmenu: "undo redo | cut copy paste insert | link wikimagic inserttable | styleselect removeformat | browsercontextmenu",
		convert_fonts_to_spans: true,
		link_title: false,
		link_assume_external_targets: true,
		link_class_list: [
			{title: 'External', value: 'mceNonEditable mwt-wikiMagic mwt-externallink'},
			{title: 'Internal', value: 'mceNonEditable mwt-wikiMagic mwt-internallink'},
		],
		target_list: false,
//		visual_table_class : "wikitable",
		visual_table_class : " ",
/*		table_default_attributes: {
			class: 'wikitable'
		},*/
		height: 400,
		autoresize_max_height: 600,
		code_dialog_width: 1200,
		code_dialog_height: 500,
		statusbar: false,
		// the default text direction for the editor
		directionality: tinyMCEDirectionality,
		// default language
		//language: 'en',
		language_url: tinyMCELangURL,
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
		remove_trailing_brs: false,
		// indentation depth
		// keep current style on pressing return
		keep_styles: true,
		// save plugin
		save_enablewhendirty: true,
		// Allow style tags in body and unordered lists in spans (inline)
//		valid_children: "+span[ul],+span[div]",
//		extended_valid_elements: "nowiki",
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
		removed_menuitems: 'media',
		// fontawesome configuration
		noneditable_noneditable_class: 'fa',
		extended_valid_elements: 'span[*]',
		// tinymce configuration
//DC  TODO fix fontawesome for TinyMCE v5
//		toolbar1: 'undo redo | cut copy paste insert | bold italic underline strikethrough subscript superscript forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | charmap fontawesome singlelinebreak wikilink unlink table wikiupload wikimagic wikisourcecode | formatselect styleselect removeformat | searchreplace ',
		toolbar1: 'undo redo | cut copy paste insert | bold italic underline strikethrough subscript superscript forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | charmap singlelinebreak wikilink unlink table wikiupload wikimagic wikisourcecode | formatselect styleselect removeformat | searchreplace ',
		style_formats_merge: true,
		style_formats: [
			{title: "Table", items: [
				{title: "Sortable", selector: "table", classes: "sortable"},
				{title: "Wikitable", selector: "table", classes: "wikitable"},
				{title: "Contenttable", selector: "table", classes: "contenttable"},
			]},
			{title: "Cell", items: [
				{title: "Left", selector: "td", format: "alignleft", icon: "alignleft"},
				{title: "Center", selector: "td", format: "aligncenter", icon: "aligncenter"},
				{title: "Right", selector: "td", format: "alignright", icon: "alignright"},
				{title: "Align Top", selector: "td", styles: {verticalalign: "top"}},
				{title: "Align Middle", selector: "td", styles: {verticalalign: "middle"}},
				{title: "Align Bottom", selector: "td", styles: {verticalalign: "bottom"}}
			]},
			{title: "Pre", block: "pre", classes: "mw_pre_from_space" },
			{title: "Paragraph", block: "p" }
		],
		block_formats: 'Paragraph=p;Heading 1=h1;Heading 2=h2;Heading 3=h3;Heading 4=h4;Heading 5=h5;Heading 6=h6;Preformatted=pre;Code=code',
		images_upload_credentials: true,
		autoresize_max_height: 400,
		setup: function(editor) {
		},
		init_instance_callback: function (instance) {
			// For some reason, in some installations this only works as an inline function,
			// instead of a named function defined elsewhere.
			var minimizeOnBlur = $("textarea#" + instance.id).hasClass( 'mceMinimizeOnBlur' );
			if ( minimizeOnBlur ) {
				var mcePane = $("textarea#" + instance.id).prev();
				// Keep a little sliver of the toolbar so that users see it.
				mcePane.find(".mce-toolbar-grp").css("height", "10px");
				mcePane.find(".mce-toolbar-grp .mce-flow-layout").hide("medium");
			}
		},
		file_picker_callback: function(cb, value, meta) {
			var input = document.createElement('input');
			input.setAttribute('type', 'file');
			input.onchange = function() {
				var file = this.files[0];

				var reader = new FileReader();
				reader.onload = function (e) {
					var fileContent = file;
					// call the callback and populate the src field with the file name
					// and srccontent field with the content of the file
					cb(e.target.result, { srccontent: fileContent, src: file.name });
				};
				reader.readAsDataURL(file);
			};

			input.click();
		}
	});
};

mwTinyMCEInit( '.tinymce, #wpTextbox1' );

// Let others know we're done here
$( document ).trigger( 'TinyMCELoaded' ); 
