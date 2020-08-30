/**
 * TinyMCE extension
 *
 * Parses wikicode to HTML and vice versa, enabling it to be edited by TinyMCE
 *
 * @author     Markus Glaser <glaser@hallowelt.com>
 * @author     Sebastian Ulbricht
 * @author     Duncan Crane <duncan.crane@aoxomoxoa.co.uk>
 * @copyright  Copyright (C) 2016 Hallo Welt! GmbH, All rights reserved.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU Public License v2 or later
 * @filesource
 */

(function (domGlobals) {
	"use strict";

	/**
	 *
	 * definition of variables used 
	 * globally in this plugin
	 * @type Array
	 */
		/**
		 * global variable that contains the editor instance
		 * @type TinyMCE
		 */
		var	editor = tinymce.activeEditor,

		/**
		 *
		 * Utility functions used in this plugin and others
		 * @type String
		 */
		utility = editor.getParam("wiki_utility"),

		/**
		 *
		 * Points to the mediawiki API for this wiki
		 * @type String
		 */
		_mwtWikiApi = editor.getParam("wiki_api_path"),

		/**
		 *
		 * Points to the title of the mediawiki page to be accessed by API
		 * @type String
		 */
		_mwtPageTitle = editor.getParam("wiki_page_mwtPageTitle"),

		/**
		 *
		 * allowable url protocols defined in wiki
		 * @type Array
		 */
		_mwtUrlProtocols = editor.getParam("wiki_url_protocols"),

		/**
		 *
		 * allowable namespace ID's, defined by wiki
		 * @type Array
		 */
		_mwtNamespaces = editor.getParam("wiki_namespaces"),

		/**
		 *
		 * local name of the 'file' namespace
		 * @type Array
		 */
		_mwtFileNamespace = editor.getParam("wiki_fileNamespace"),

		/**
		 *
		 * allowable extension tags, defined by wiki
		 * @type Array
		 */
		_mwtExtensionTagsList = editor.getParam("wiki_extension_tags_list"),

		/**
		 *
		 * allowable tags html tags, defined in MW_tinymce.js
		 * @type Array
		 */
		_mwtPreservedTagsList = editor.getParam("wiki_preserved_tags_list"),

		/**
		 *
		 * allowable tags that form html blocks, defined in MW_tinymce.js
		 * @type Array
		 */
		_mwtBlockTagsList = editor.getParam("wiki_block_tags"),

		/**
		 *
		 * allowable tags that are processed identically by mediawiki
		 * and html bowser, defined in MW_tinymce.js
		 * @type Array
		 */
		_mwtInvariantTagsList = editor.getParam("wiki_invariant_tags"),

		/**
		 *
		 * tags which have a wiki equivalent that we want to preserve in 
		 * the wiki text, defined in MW_tinymce.js
		 * @type Array
		 */
		_mwtPreservedHtmlTagsList = editor.getParam("wiki_preserved_html_tags"),

		/**
		 *
		 * Flag used for toggling visible placeholders on or off and
		 * variable containing initial class value for the placeholders
		 *
		 */
		_showPlaceholders = editor.getParam("showPlaceholders"),
		_placeholderClass = _showPlaceholders ? "mwt-showPlaceholder" : "mwt-hidePlaceholder",

		/**
		 *
		 * global used to store the form of pipe used in the original wikicode
		 * Set to '{{!}}' or '|' depending on whether the target text is in
		 * a template or not
		 * default '|'
		 * @type String
		 */
		_pipeText = ($(editor.targetElm).hasClass('mcePartOfTemplate')) ? '{{!}}' : '|',

		/**
		 *
		 * span for inserting a placeholder in editor text for 
		 * non-rendering new lines in the wiki code.  The character
		 * displayed is defined in MW_tinymce.css
		 * @type String
		 */
		_slb = 
			'<span class="mwt-nonEditable mwt-placeHolder mwt-singleLinebreak mwt-slb' 
			+ (editor.getParam("directionality")) + ' ' + _placeholderClass 
			+ '" title="'
			+ mw.msg('tinymce-wikicode-non-rendering-single-linebreak' )
			+ '" draggable="true" contenteditable="false">'// + ' '
			+ '</span>',

		/**
		 *
		 * span for inserting a placeholder in editor text for 
		 * switches in the wiki code.  The character
		 * displayed is defined in MW_tinymce.css 
		 * @type String
		 */
		_swt = 
			'<span class="mwt-nonEditable mwt-placeHolder mwt-switch '  + _placeholderClass
			+ '" draggable="true" contenteditable="false">' 
			+ '</span>',

		/**
		 *
		 * span for inserting a placeholder in editor text for 
		 * comments in the wiki code.  The character
		 * displayed is defined in MW_tinymce.css 
		 * @type String
		 */
		_cmt = 
			'<span class="mwt-nonEditable mwt-placeHolder mwt-comment '  + _placeholderClass
			+ '" draggable="true" contenteditable="false">' 
			+ '</span>',

		/**
		 *
		 * span for inserting a placeholder in editor text for 
		 * non-rendering mediawiki parser output in the wiki code.  
		 * The character displayed is defined in MW_tinymce.css 
		 * @type String
		 */
		_nrw = 
			'<span class="mwt-nonEditable mwt-placeHolder mwt-emptyOutput '  + _placeholderClass
			+ '" draggable="true" contenteditable="false">' 
			+ '</span>',

		/**
		 *
		 * span for inserting a placeholder in editor text for 
		 * non-breaking spaces.  
		 * The character displayed is defined in MW_tinymce.css 
		 * @type String
		 */
		_nbs = 
			'<span class="mwt-placeHolder  mwt-nonBreakingSpace '  + _placeholderClass
			+ '" draggable="true" contenteditable="false" title="&amp;nbsp;" >' 
			+ '</span>',

		/**
		 *
		 * span for inserting a placeholder in editor text for 
		 * '<'.  
		 * The character displayed is defined in MW_tinymce.css 
		 * @type String
		 */
		_lte = 
			'<span class="mwt-nonEditable mwt-wikiMagic mwt-placeholder mwt-htmlEntity"'
			+ ' data-mwt-wikitext="&amp;lt;"'
			+ ' draggable="true" contenteditable="false" title="&amp;lt;" >&lt;</span>',

		/**
		 *
		 * span for inserting a placeholder in editor text for 
		 * '>'.  
		 * The character displayed is defined in MW_tinymce.css 
		 * @type String
		 */
		_gte = 
			'<span class="mwt-nonEditable mwt-wikiMagic mwt-placeholder mwt-htmlEntity"'
			+ ' data-mwt-wikitext="&amp;gt;"'
			+ ' draggable="true" contenteditable="false" title="&amp;gt;" >&gt;</span>',

		/**
		 *
		 * array to store html snippets and placeholders for each.
		 * The paceholders are used during the conversion between
		 * html and wikicode and vice a versa to avoid converting
		 * code that has already been converted!
		 * @type Array
		 */
		_tags4Html = new Array(),
		/**
		 *
		 * array to store wikicode snippets and placeholders for each.
		 * The paceholders are used during the conversion between
		 * html and wikicode and vice a versa to avoid converting
		 * code that has already been converted!
		 * @type Array
		 */
		_tags4Wiki = new Array(),
		/**
		 *
		 * following use to hold the cursor position before and 
		 * after up or down arrow kepress
		 */
		_cursorOnDown,
		_cursorOnUp,
		_cursorOnDownIndex,
		_cursorOnUpIndex,
		_cursorOnDownPreviousNode,
		_cursorOnUpPreviousNode,
		_cursorOnDownNextNode,
		_cursorOnUpNextNode;

	/**
	 *
	 * set up utility functions used  
	 * in this plugin
	 * 
	 */

	var setContent = utility.setContent;

	var setSelection = utility.setSelection;

	var getContent = utility.getContent;

	var getSelection = utility.getSelection;

	var htmlEncode = utility.htmlEncode;

	var htmlDecode = utility.htmlDecode;

	var createUniqueNumber = utility.createUniqueNumber;

	var onDblClickLaunch = utility.onDblClickLaunch;

	var doUpload = utility.doUpload;

	var checkUploadDetail = utility.checkUploadDetail;

	var pluginManager = tinymce.util.Tools.resolve('tinymce.PluginManager');

	/**
	 * find the offset of the cursor within the displayed text
	 *
	 * @param {String} text
	 * @returns {String}
	 */
	function getCursorOffset() {
		var range,
			text,
			bm,
			index,
			currentNode,
			previousNode,
			nextNode,
			firstNode = false;

		currentNode = editor.selection.getNode()
		previousNode = currentNode.previousSibling;
		if ( !previousNode ) {
			previousNode = editor.dom.getParent( currentNode, function ( aParent) {
				return aParent.previousSiblineg
			});
		}
		nextNode = currentNode.nextSibling;
		if ( !nextNode ) {
			nextNode = editor.dom.getParent( currentNode, function ( aParent) {
				return aParent.nextSiblineg
			});
		}

		bm = tinymce.activeEditor.selection.getBookmark();
		range = editor.selection.getRng();
		range.setStart(editor.getBody().firstChild, 0);
		text = range.toString();
		tinymce.activeEditor.selection.moveToBookmark(bm);

		return {
			cursor: text.length, 
			text: text,
			index: index,
			previousNode: previousNode,
			nextNode: nextNode
		}
	} 

	/**
	 * replace any wiki placeholders in the text with their 
	 * original wiki text
	 *
	 * @param {String} text
	 * @returns {String}
	 */
	function _recoverPlaceholders2Wiki (tagWikiText) {
		// sometimes the parameters have been &xxx; encoded.  We want
		// to decode these where they are applied to placeholders so
		// the replacement of placeholders that follows will work
		tagWikiText = tagWikiText.replace(/(&lt;@@@)/gmi, '<@@@');
		tagWikiText = tagWikiText.replace(/(@@@&gt;)/gmi, '@@@>');

		// recover any placeholders embedded in tagWikiText
		// some may be embedded in others so repeat until all gone
		while (tagWikiText.match(/(\<@@@.*?:\d*@@@>)/gmi)) {
			tagWikiText = tagWikiText.replace(/(\<@@@.*?:\d*@@@>)/gmi, function(match, $1) {

				return _tags4Wiki[$1];
			});
		}
		return tagWikiText
	}

	/**
	 * replace any html placeholders in the text with their 
	 * original html text
	 *
	 * @param {String} text
	 * @returns {String}
	 */
	function _recoverPlaceholders2Html (tagHTML) {
		// sometimes the parameters have been &xxx; encoded.  We want
		// to decode these where they are applied to placeholders so
		// the replacement of placeholders that follows will work
		tagHTML = tagHTML.replace(/(&lt;@@@)/gmi, '<@@@');
		tagHTML = tagHTML.replace(/(@@@&gt;)/gmi, '@@@>');

		// recover any placeholders embedded in tagHTML
		// some may be embedded in others so repeat until all gone
		while (tagHTML.match(/(\<@@@.*?:\d*@@@>)/gmi)) {
			tagHTML = tagHTML.replace(/(\<@@@.*?:\d*@@@>)/gmi, function(match, $1) {
				// replace '&amp;amp;' with '&amp;' as we double escaped these when 
				// they were converted
				return _tags4Wiki[$1].replace(/&amp;amp;/gmi,'&amp;');
			});
		}
		return tagHTML
	}

	/**
	 * coverts wiki control codes (Tags, templates etc) to placeholders
	 * which are stored in the text being converted for recovery
	 * later.  Where the control code does not need to be parsed by the 
	 * wiki parser the dom element is created now, other wise it will be created later
	 * when all the control codes to be parsed are batched together for sending
	 * to the API
	 *
	 * @param {String} text
	 * @returns {String}
	 */
	function _getPlaceHolder4Html (tagWikiText, tagHTML, tagClass, protection) {
		var elementClass,
			displayTagWikiText = '',
			titleWikiText = '',
			tagOuterHTML = '',
			t,
			id,
			element;

		// recover any place holders already in the tagWikiText or
		// tagHTML to avoid them being embedded in the new place holder
		tagWikiText = _recoverPlaceholders2Wiki( tagWikiText );
		tagHTML = _recoverPlaceholders2Html( tagHTML );

		//  create id for new dom element, which wil also be the placeholder
		// temporarily inserted in the text to avoid conversion problems
		id = "<@@@" + tagClass.toUpperCase() + ":" + createUniqueNumber() + "@@@>";

		// encode the wiki text so it displays correctly
		displayTagWikiText = htmlEncode( tagWikiText.replace( /\n/gi, '<@@nl@@>' ) );

		// replace any tag new line placeholders from the title
		titleWikiText = tagWikiText.replace(/<@@[bht]nl@@>/gmi, "\n");

		// if tagWikiText doesn't need to be parsed create dom element now
		if ( tagHTML != 'toParse' && protection == 'nonEditable' ) {

			// make sure tagHTML is really HTML else will break when 
			// converting to DOM element.  If not wrap in <code> tags
			if ( !tagHTML.match(/^<.*>$/gmi) ) {
				tagHTML = '<code>' + tagHTML + '</code>';
			};

			// create DOM element from tagHTML
			element = $(tagHTML);							
			element.addClass("mwt-nonEditable mwt-wikiMagic mwt-placeholder mwt-" + tagClass);
			element.attr({
				'id': id,
				'title': titleWikiText ,
				'data-mwt-type': tagClass,
				'data-mwt-wikitext': displayTagWikiText,
				'draggable': "true",
				'contenteditable': "false"
			});

			tagOuterHTML = element.prop("outerHTML");

		} else {
			// the tagWikiText needs to be parsed so we 'batch' them for
			// to process later.  In this case tagHTML = 'toParse
			tagOuterHTML = tagHTML;		
		}

		// preserve the wiki text and html in arrays for later substitution
		// for the relevant placeholder
		_tags4Wiki[id] = tagWikiText;
		_tags4Html[id] = tagOuterHTML;

		return id;
	}

	/**
	 * creates a wiki link for an image and returns a place
	 * holder for the html text, which is substituted later
	 *
	 * @param {String} text
	 * @returns {String}
	 */
	function _getWikiImageLink(imageElm, imageLink) {
		var aLink,
			file,
			fileType,
			fileName,
			mimeType,
			extension,
			uploadDetails,
			uploadResult,
			ignoreWarnings = true,
			fileSummary = '',
			wikiImageObject = [],
			htmlImageObject = imageElm,
			attribute,
			attributes = imageElm.attributes,
			sourceURI = attributes['src'].value.split('#')[0].split('?')[0],
			protocol = sourceURI.split('/')[0].toLowerCase(),
			dstName = sourceURI.split('/').pop().split('#')[0].split('?')[0],
			wikiText,
			stylestring,
			properties,
			style,
			stylearray = {},
			property,
			value,
			imageCaption,
			size;

		//return a promise that resolves with a File instance
		function urltoFile(url, filename, mimeType){
			return (fetch(url)
/*					.then(function(res){return res.arrayBuffer();})
				.then(function(buf){return new File([buf], filename,{type:mimeType});})*/
				.await (function(res){return res.arrayBuffer();})
				.await (function(buf){return new File([buf], filename,{type:mimeType});})
			);
		}

		// return a file from the datat image
		function dataURLtoFile(dataurl, filename) {
			var arr = dataurl.split(','),
			mime = arr[0].match(/:(.*?);/)[1],
			bstr = atob(arr[1]), 
			n = bstr.length, 
			u8arr = new Uint8Array(n);


			while(n--){
				u8arr[n] = bstr.charCodeAt(n);
			}
				return new File([u8arr], filename, {type:mime});
		}

		// determine if this is a local image or external
		if ((protocol == 'https:') || (protocol == 'http:')) {
			fileType = 'URL';
			uploadDetails = doUpload(fileType, sourceURI, dstName, fileSummary, ignoreWarnings);
			uploadResult = checkUploadDetail( editor, uploadDetails, ignoreWarnings, dstName);
		} else if (protocol == 'data:image') {
			fileType = 'File';
			mimeType = attributes[ 'src' ].value.split( ':' )[1].split( ';' )[0];
			extension = mimeType.split( '/' )[1];
			fileName = 'img' + createUniqueNumber() + '.' + extension;
			dstName = fileName;
			file = dataURLtoFile( attributes['src'].value, fileName )
			uploadDetails = doUpload( fileType, file, file.name, fileSummary, ignoreWarnings );
			uploadResult = checkUploadDetail( editor, uploadDetails, ignoreWarnings, file.name );
/*				urltoFile( attributes['src'].value, dstName, mimeType )
			.then ( function ( file ) {
				uploadDetails = doUpload( fileType, file, file.name, fileSummary, ignoreWarnings );
				uploadResult = checkUploadDetail( uploadDetails, ignoreWarnings, file.name );
			});*/
/*			} else if (protocol.split(':')[0].toLowerCase() == 'blob') {
//				var reader = new FileReader;
//reader.onload = function(e) {
// browser completed reading file - display it
//	alert(e.target.result);
//};
//				file = urltoFile( sourceURI );
			fileType = 'File';
			mimeType = 'image/jpeg';
			extension = 'jpg';
			fileName = 'img' + createUniqueNumber() + '.' + extension;
			dstName = fileName;
			file = urltoFile( sourceURI, fileName, mimeType )
			uploadDetails = doUpload( fileType, file, file.name, fileSummary, ignoreWarnings );
			uploadResult = checkUploadDetail( uploadDetails, ignoreWarnings, file.name );*/

/*  let file = input.files[0];

let reader = new FileReader();

reader.readAsText(file);*/

		} else {
			// the image is base64 data so create a link as a placeholder with details
			fileType = 'File';
			dstName = 'data_image';
		}
		// upload the image (or use existing image on wiki if already uploaded
		// checking the response and process any errors or warning appropriately
		// build the wiki code for the image link
		for (var j = 0; j < attributes.length; j++) {
			attribute = attributes[j].name;
			if ( !( attribute == 'width' || !attribute == 'height' )) {
				wikiImageObject[attribute] = attributes[j].value;
			}
		}
		// check if wikiImageObject.style is set
		// and then process the style attributes
		if (wikiImageObject.style) {
			stylestring = wikiImageObject.style;
			stylestring = stylestring.replace(/\s/g, "");
			properties = stylestring.split(';');
			stylearray = {};
			properties.forEach(function(property) {
				var option = property.split(':');
				stylearray[option[0]] = option [1];
			});
			stylestring = JSON.stringify(stylearray);
			style = JSON.parse(stylestring);
			if (style['display'] === 'block' &&
				style['margin-left'] === 'auto' &&
				style['margin-right'] === 'auto') {
				wikiImageObject.align = 'center';
			}
			if (style['width']) {
				var stylewidth = style['width'].replace('px', '');
				if ( stylewidth !== "0" ) {
					wikiImageObject.sizewidth = stylewidth ;
				}
			}
			if (style['height']) {
				var styleheight = style['height'].replace('px', '');
				if ( styleheight !== "0" ) {
					wikiImageObject.sizeheight = styleheight ;
				}
			}
			if (style['float']) {
				if (style['float'] === 'left') {
					wikiImageObject.left = true;
					wikiImageObject.align = 'left';
				} else if (style['float'] === 'right') {
					wikiImageObject.right = true;
					wikiImageObject.align = 'right';
				}
			}
			if (style['vertical-align']) {
				wikiImageObject.verticalalign = style['vertical-align'];
			}
		}
		// now process the image class if it has wiki formats
		if (wikiImageObject.class) {
			if (wikiImageObject.class.indexOf("thumbborder") >= 0) {
				wikiImageObject.border = "true";
			}
			if (wikiImageObject.class.indexOf("thumbimage") >= 0) {
				wikiImageObject.frame = "true";
			}
			if (wikiImageObject.class.indexOf("thumbthumb") >= 0) {
				wikiImageObject.thumb = "true";
			}
		}
		// now process the image size, width, caption and link if any set
		if (htmlImageObject['width']
			&& htmlImageObject['width'] !== wikiImageObject.sizewidth) {
			wikiImageObject.sizewidth = htmlImageObject['width'];
		}
		if (htmlImageObject['height']
			&& htmlImageObject['height'] !== wikiImageObject.sizeheight) {
			wikiImageObject.sizeheight = htmlImageObject['height'];
		}
		if (htmlImageObject['caption']) {
			wikiImageObject.caption = htmlImageObject['caption'];
		}
		if (htmlImageObject['link']) {
			wikiImageObject.caption = htmlImageObject['link'];
		}

		// Build wikitext
		wikiText = [];
		wikiText.push(wikiImageObject.imagename);

		// process attributes of image
		for (property in wikiImageObject) {
			if ($.inArray(property, ['imagename', 'thumbsize']) !== -1) {
				continue; //Filter non-wiki data
			}
			if ($.inArray(property, ['left', 'right', 'center', 'nolink']) !== -1) {
				continue; //Not used stuff
			}
			value = wikiImageObject[property];
			//"link" may be intentionally empty. Therefore we have to
			//check it _before_ "value is empty?"
			if ( property === 'link' ) {
				//If the 'nolink' flag is set, we need to discard a
				//maybe set value of 'link'
				if( wikiImageObject.nolink === 'true' ) {
					wikiText.push( property + '=' );
					continue;
				}
				if ( value === 'false' || value === false ) {
					continue;
				}
				wikiText.push( property + '=' + value );
				continue;
			}
			if ( !value ) continue;
			if (property === 'sizewidth' ) {
				size = '';
				if (wikiImageObject.sizewidth && wikiImageObject.sizewidth !== "false") {
					size = wikiImageObject.sizewidth;
				}
				if (wikiImageObject.sizeheight && wikiImageObject.sizeheight !== "false") {
					size += 'x' + wikiImageObject.sizeheight;
				}
				if (size.length == 0 || size == "auto") continue;
				size += 'px';
				wikiText.push(size);
				continue;
			}
			if (property == 'alt') {
				wikiText.push(property + '=' + value);
				continue;
			}
			if ( property == 'align' ) {
				wikiText.push(value);
				continue;
			}
			if ( property == 'verticalalign' ) {
				wikiText.push(value);
				continue;
			}
			if ( property == 'title' ) {
				imageCaption = value;
				continue;
			}
			if ( property == 'caption' ) {
				imageCaption = value;
				continue;
			}
			if ( property == 'thumb' && value === "true" ) {
				wikiText.push( 'thumb' );
				continue;
			}
			if ( property == 'frame' && value === "true") {
				wikiText.push( 'frame' );
				continue;
			}
			if ( property == 'border' && value === "true" ) {
				wikiText.push( 'border' );
				continue;
			}
			if ( property == 'src' && !imageLink ) {
				imageLink = value;
				continue;
			}
		}

		// make sure image caption comes in the end
		if ( imageCaption ) {
			wikiText.push( imageCaption );
		}
		if (imageLink) {
			dstName = dstName + "|link=" + imageLink;
			aLink = '[[' + _mwtFileNamespace + ':' + dstName + wikiText.join('|') + ']]';
		} else {
			aLink = '[[' + _mwtFileNamespace + ':' + dstName + wikiText.join('|') + ']]';
		}

		return aLink;
	};

	/**
	 * parses wiki code before calling function for
	 * creating the DOM element and storing this
	 * and and original wikicode for later recovery
	 *
	 * @param {String} wikiCode
	 * @returns {String}
	 */
	function _parseWiki4Html (wikiCode) {
		var parserResult = [],
			tagWikiText = '',
			tagInnerHTML = '';

		/**
		 * get parsed html from the wiki text provided.  Returns the
		 * parsed html, original wikitext and a success/fail indicator
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function getParsedHtmlFromWiki(wikiText) {
			var data = {
					'action': 'parse',
					'title': _mwtPageTitle,
					'text': wikiText,
					'prop': 'text|wikitext',
					'disablelimitreport': '',
					'disableeditsection': '',
					'disabletoc': '',
					'wrapoutputclass': '',
					'format': 'json',},
				parserResult = [];
			$.ajax({
				type: 'POST',
				dataType: "json",
				url: _mwtWikiApi,
				data: data,
				async: false,
				success: function(data) {
					var parsedHtml = data.parse.text["*"],
						parsedWikiText = data.parse.wikitext["*"];

					// replace encoded & characters
					parsedHtml = parsedHtml.replace(/\&amp\;/gmi,'&');

					// remove leading and trailing <div class="mw-parser-output"> in parsed html
					parsedHtml = parsedHtml.replace(/^<div class="mw-parser-output">([^]*)<\/div>$/gmi, '$1');

					// remove <p> tags in parsed html
					parsedHtml = parsedHtml.replace(/<\/?p(>|\s[^>]*>)/gmi, '');

					// remove leading and trailing spaces
					parsedHtml = $.trim(parsedHtml);

					// set up array of returned values
					parserResult['parsedWikiText'] = parsedWikiText;
					parserResult['parsedHtml'] = parsedHtml;		
					parserResult['result'] = 'success';		
				},
				error:function(xhr,status, error){
					parserResult['parsedWikiText'] = '';
					parserResult['parsedHtml'] = '';		
					parserResult['result'] = 'fail';		
					parserResult['error'] = error;		
				}
			});

			return parserResult;
		}

		// it could be that the wikicode already contains placeholders
		// for example for templates.  We need to convert these back before sending
		// to the wiki parser.  
		wikiCode = _recoverPlaceholders2Wiki( wikiCode );

		// then get the parsed wiki code from the wiki parser
		parserResult = getParsedHtmlFromWiki(wikiCode);

		// check result
		if ( parserResult.result == 'fail' ) {
			message = mw.msg("tinymce-wikicode-alert-mw-parser-fail", wikiCode);								
			alert( message );
			parserResult.parsedHtml = wikiCode;
		}

		return parserResult;
	}

	/**
	 * Convert wiki links to html and preserves them for recovery later.
	 *
	 * @param {String} text
	 * @returns {String}
	 */
	function _preserveLinks4Html(text) {
		var links, 
			targetParts, 
			linkType, 
			squareBraceDepth = 0,
			linkDepth = 0,
			linkStart = 0,
			tempLink = '',
			linkPlaceholder,
			regex,
			matcher,
			pos = 0,
			urlProtocolMatch = "/^" + _mwtUrlProtocols + "/i";


		// save some effort if there are no links
		if ( !text.match(/\[/) ) return text;

		urlProtocolMatch = urlProtocolMatch.replace(/\|/g,"|^");

		// now walk through the text processing all the
		// links storing external links and internal links
		// in arrays to process later
		for (pos = 0; pos < text.length; pos++) {
			if (text[pos] === '[') {
				squareBraceDepth++;
				linkStart = pos;

				// check to see if an internal link eg starts with [[
				// and process as intrnal link if it is
				if (pos < text.length) {
					if (text.charAt(pos + 1) === '[') {
						pos = pos + 2;
						squareBraceDepth++;
						for (pos = pos; pos < text.length; pos++) {
							if (text[pos] === '[') {
								squareBraceDepth++;
							} else if (text[pos] === ']') {
								if (squareBraceDepth == 2) {

									// checking for closure of internal link eg ]]
									// if not then don't decrement depth counter
									// otherwise won't be able to match closure
									if ((pos < text.length) && (text.charAt(pos + 1) === ']')) {
										pos = pos +1;
										squareBraceDepth = 0;

										// make a temporary copy of the link 
										tempLink = text.substring(linkStart,pos + 1);

										//set the type of the link
										linkType = 'internallink';

										// check to see if the link is to a media file (namespace is 6)
										// if it is change the link type to image
										targetParts = tempLink.substr(2,tempLink.length).split(":");
										if (targetParts.length > 1) {
											if (_mwtNamespaces[targetParts[0].toLowerCase()] === 6) {
												linkType = 'image';
											}
										} else {
											// make sure we include any text immediately following 
											// the link to ensure we obey 'linktrail' rules
											// Check there is more text after the pos by the way
											while (pos < text.length) {
												if (text.charAt(pos + 1).match(/\w/)) {
													pos = pos +1;
												} else {
													break;
												}
											}

											// make a temporary copy of the link 
											tempLink = text.substring(linkStart,pos + 1);
										}
										linkPlaceholder = _getPlaceHolder4Html(tempLink, 'toParse', linkType, 'nonEditable');

										// replace the link with the placeholder
										regex = tempLink.replace(/[^A-Za-z0-9_]/g, '\\$&');
										matcher = new RegExp(regex, '');
										text = text.replace(matcher, linkPlaceholder);

										// reset the text.length and
										// set the pos to the end of the placeholder
//										text.length = text.length;
										pos = linkStart + linkPlaceholder.length - 1;
										tempLink = '';
										break;
									}
								} else {
									squareBraceDepth--;
								}	
							}
						}
					} else {
						// else process external link as only single '['
						pos = pos + 1;
						linkType = 'externallink';
						for (pos = pos; pos < text.length; pos++) {
							if (text[pos] === '[') {
								squareBraceDepth++;
							} else if (text[pos] === ']') {
								if (squareBraceDepth == 1) {
									// checking for closure of external link eg ']'
									pos ++;
									squareBraceDepth = 0;
									tempLink = text.substring(linkStart,pos)

									// if this is a valid url and doesn't start witha space
									// then process as an external link, else ignore
									// but look for links within these braces
									if (tempLink.substr(1,tempLink.length - 2).match(urlProtocolMatch)
										|| tempLink.substr(1,2) === "//" ) {
									
										linkPlaceholder = _getPlaceHolder4Html(tempLink, 'toParse', linkType, 'nonEditable');
										regex = tempLink.replace(/[^A-Za-z0-9_]/g, '\\$&');
										matcher = new RegExp(regex, '');
										text = text.replace(matcher, linkPlaceholder);
	
										// reset the textlength and
										// set the pos to the end of the placeholder
										pos = linkStart + linkPlaceholder.length - 1;
									} else {
										// add two to link start as double square braces 
										// will have been processed already as an 
										// internal link. Then continue searching
										pos = linkStart;// + 1;
//										squareBraceDepth--;
									}
									tempLink = '';
									break;
								} else {
									squareBraceDepth--;
								}	
							}
						}					
					}
				}
			}
		}
		return text;
	}

	/**
	 *
	 * recover html tag text from placeholdes
	 * @param {String} text
	 * @returns {String}
	 */
	function _recoverTags2html(text) {
		var regex,
			tagLabel,
			parserText,
			parserTable = [],
			parserTags = [],
			parserTag,
			elementTitle,
			count = 0,
			regex,
			matcher,
			blockMatcher;

		// replace non rendering new line placeholder with html equivalent
		text = text.replace(/<@@slb@@>/gmi, _slb);

		// the block matcher is used in a loop to determine whether to wrap the returned 
		// html in div or span tags, we define it here so it only has to be defined once
		regex = "<(" + _mwtBlockTagsList + ")";
		blockMatcher = new RegExp(regex, 'i');

		// we use the parser table to collect all the wikicode to be parsed into a single
		// document to avoid multiple calls to the api parser so speed things up
		// there are two passes one to collect the parser text and the next to insert it
		if (_tags4Html) {
			text = text.replace(/\<@@@.*?:\d*@@@>/gmi, function(match) {
				// if the placeholder is in the array replace it otherwise
				// return the placeholder escaped
				if ((_tags4Html[match] == 'toParse') && (_tags4Wiki[match])) {
					parserTable.push(_tags4Wiki[match]);
					parserTags.push(match);
					return match
				} else if (_tags4Html[match]) {
					return _tags4Html[match];
				} else {
					return match.replace(/^</, '&lt;');						
				}
			});

			// if there is anything to be parsed then join the table the table entries
			// and send it to be parsed, then split out the parsed code and replace it 
			// within the text
			if (parserTable.length > 0) {
				// we need to wrap the seperator {@@@@} with two '\n's because
				// of the way pre and pseudo pre tags are handled in the wiki parser
				parserText = _parseWiki4Html (parserTable.join("\n{@@@@}\n"));

				// sometimes the parser wraps the {@@@@) placeholder in <p> tags!
				parserText.parsedHtml = parserText.parsedHtml.replace(/<p>\n{@@@@}\n<\/p>/gmi, "\n{@@@@}\n");

				// sometimes the parser return null entries which will be misinterpreted !
				parserText.parsedHtml = parserText.parsedHtml.replace(/\n{@@@@}\n{@@@@}\n/gmi, function (match) {

					return "\n{@@@@}\n \n{@@@@}\n"
				});

				// now split the parsed html corresponding to the placeholders
				// and replace within the text
				parserTable = parserText.parsedHtml.split("\n{@@@@}\n");
				for ( count = 0; count < parserTags.length; count++) {
					parserTag = parserTags[count];
					regex = parserTag;
					matcher = new RegExp(regex, 'gmi');
					text = text.replace(matcher, function(tag) {
						var tagClass = tag.replace(/<@@@(.*):\d+?@@@>/gm, '$1').toLowerCase(),
							wikiText,
							html,
							element,
							regex,
							matcher;

						html = parserTable[count];
						elementTitle = _tags4Wiki[tag];

						if ( html != undefined ) {
							if ( html.match(blockMatcher) ) {
								// if parser result contains a block tag. wrap in a <div>
								// and add a new line to the wiki text
								if (html.match(/<img/gmi)) {
									// images should are given a placeholder for the editor window
									// as the actual code may appear elsewhere in the text to where
									// the image is displayed
									html = '<div>' + html + '</div>' ;									
								} else {
									html = '<div>' + html + '</div>';
									_tags4Wiki[tag] = '<@@bnl@@>' + _tags4Wiki[tag] + '<@@bnl@@>';
								}
							} else {
								// otherwise wrap in a <span>
								html = '<span>' + html + '</span>';
							}
						} else {
							html = _nrw;					
						}

						// now build the html equivalent from each parsed wikicode fragment
						element = $(html);							
						if (tagClass == 'image' ) {
							element.addClass("mwt-nonEditableImage mwt-wikiMagic mwt-placeHolder mwt-" + tagClass + " " + _placeholderClass);
						} else {
							element.addClass("mwt-nonEditable mwt-wikiMagic mwt-" + tagClass);
						}
						element.attr({
							'title': elementTitle,
							'id': tag,
							'data-mwt-type': tagClass,
							'data-mwt-wikitext': htmlEncode( elementTitle.replace( /\n/gi, '<@@nl@@>' ) ), 
							'draggable': "true",
							'contenteditable': "false"
						});

						// preserve the html for later recovery
						_tags4Html[tag] = element.prop("outerHTML");
						return element.prop("outerHTML");
					});
				}
			}
		}
		return text;
	}

	/**
	 * Processes wiki text into html.
	 *
	 * @param {String} text
	 * @returns {String}
	 */
	function _convertWiki2Html(text) {
		var textObject,
			ltePlaceholder = _getPlaceHolder4Html('<', _lte, 'lte', 'nonEditable'),
			gtePlaceholder = _getPlaceHolder4Html('>', _gte, 'gte', 'nonEditable');

		/**
		 * Converts wiki tags to html and preserves them for recovery later.
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function preserveWikiTags4Html(text) {
			var regex, 
				matcher,
				preservedTags = _mwtPreservedTagsList.split('|');

			// find and process all the switch tags in the wiki code
			// may contain wikitext so process first to avoid processing tags within tags
			regex = "__(.*?)__";
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match) {

				return _getPlaceHolder4Html(match, _swt, 'switch', 'nonEditable');
			});

			// find and process all the comment tags in the wiki code
			// may contain wikitext so process first to avoid processing tags within tags
			regex = "<!--([\\S\\s]+?)-->";
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match) {

				return _getPlaceHolder4Html(match, _cmt, 'comment', 'nonEditable');
			});

			// nowiki tags can be used to escape html so process
			// these before processing other tags

			// case <<nowiki />atag ...>
			regex = '<<nowiki\\s*?\\/?>([\\S\\s]*?>)';
			matcher = new RegExp(regex, 'gm');
			text = text.replace(matcher, function(match,$1) {
				//$1 = the text in the escaped tag
				var html;

				html = '<span class="mwt-nonEditable mwt-wikiMagic">&lt;' + $1 + '</span>';
				return _getPlaceHolder4Html(match, html, 'nowikiesc', 'nonEditable');
			});

			// case <atag ...<nowiki />> ... </atag>
			regex = '<(\\w*)[\\S\\s]*?<nowiki\\s*?\\/>>[\\S\\s]*?<\\/\\1>';
			matcher = new RegExp(regex, 'gm');
			text = text.replace(matcher, function(match) {

				return _getPlaceHolder4Html(match, 'toParse', 'nowikiesc', 'nonEditable')
			});

			// find and process all the <nowiki /> tags in the wiki code
			regex = '<nowiki\\s*?\\/>';
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match) {

				return _getPlaceHolder4Html(match, '', 'nowikiesc', 'nonEditable')
			});

			// preserve characters encoded in &xxx; format by placing them in spans 
			// with class of mwt_htmlEntity.  These are typically used 
			// to stop the wiki parser interpretting characters as formatting
			regex = '&([^\\s;]+);';
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match, $1) {
				//$1 = the encoded character
				var html;

				match = htmlEncode(match);
				if ( $1  == 'nbsp' ) {
					// process non-breaking spaces 
					html = _nbs;
					return _getPlaceHolder4Html(match, html, 'htmlEntity', 'editable')
				} else {
					// double encode &amp; otherwise will display incorrectly if recoverred
					html = '<span class="mwt-nonEditable mwt-wikiMagic ">&' + $1 + ';</span>';
					return _getPlaceHolder4Html(match, html, 'htmlEntity', 'nonEditable')
				}
			});

			// find and process all the pre and nowiki tags in the wiki code as wiki markup is ignored
			regex = '(<(nowiki|pre)[\\S\\s]*?>)([\\S\\s]*?)(<\\/\\2>)';
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match, $1, $2, $3, $4) {
				// $1 = the opening tag 
				// $2 = the tag name
				// $3 = the content of the tag pair
				// $4 = the closing tag
				var html;

				// make sure any html embedded gets renderred correctly by encoding '<'s
				// but leave placeholders as these will be recovered
				return _getPlaceHolder4Html(match, 'toParse', $2, 'nonEditable');
			});

			// find and process all the <source> and <code> tags in the wiki code. 
			// These need to be parsed by the wikiparser. We do these here
			// because <source> is a singleton html5 tag that does something 
			// different and <code> may be used to escape other characters.
			// Hopefully <source> and <code> tags aren't nestable
			regex = '<(source|code)[\\S\\s]*?>[\\S\\s]*?<\\/\\1>';
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match, $1) {
				// $1 = the tag name

				return _getPlaceHolder4Html(match, 'toParse', $1, 'nonEditable');
			});

			// treat any extension tag pairs in the wikicode 
			// The list of extension tag codes is define in MW_tinymce.js in the extension root
			regex = '<(' + _mwtExtensionTagsList + ')(\\s.*?>|>)([\\S\\s]*?)<\\/\\1>';
			matcher = new RegExp(regex, 'gmi');

			text = text.replace(matcher, function(match, $1, $2, $3) {
				// $1 = the tag name
				// $2 = attributes of the tag
				// $3 = the content of the tag pair
				
				// special proceessing if this is a reference using cite extension
				if ( $1 == 'ref' ) {
					var parserResult,
						refHtml,
						refText,
						refNote = '';
	
					refHtml = _convertWiki2Html( $.trim( $3 ) );
					refText = editor.dom.createFragment( refHtml ).textContent
		
					if ( refText == '' ) {
						match = '<ref>Empty reference</ref>';
						refHtml = refText = 'Empty reference'
					}
					
					refHtml = 
					  '<span class="mwt-editable mwt-placeHolder mwt-reference '  + _placeholderClass
					  + '" draggable="true" contenteditable="true">' 
					  + refHtml
					  + '</span>';
					  
					parserResult = _parseWiki4Html(match);

					refNote = $.trim(parserResult.parsedHtml);
					refNote = refNote.substr(0, refNote.search('<\/sup>') + 6);		
					refNote = refNote.replace(/^<sup /, '<sup title="' + refText + '" contenteditable="false"');
					refNote = refNote.replace(/>&#91;\d*&#93;</, '>&#91;&#8225;&#93;<');

					return _getPlaceHolder4Html(parserResult.parsedWikiText, refNote + refHtml, $1, 'editable')	
				}else {
					return _getPlaceHolder4Html(match, 'toParse', $1, 'nonEditable');
				}
			});

			// then treat extension tag singletons
			regex = '<(' + _mwtExtensionTagsList + ')(\\s.*?\\/?>|\\/?>)';
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match, $1) {
				// $1 = the tag name

				return _getPlaceHolder4Html(match, 'toParse', $1, 'nonEditable');
			});

			// treat any tags in the wikicode that aren't allowed html or 
			// extension tags as if they are code enclosed in <code> tags.
			// Give them a class type of 'unknown' so we can strip out the code tags when
			// converting back to wiki code.  Escape any html included so it displays properly.
			// The list of preserved codes is define in MW_tinymce.js in the extension root

			// first unrecognised tag pairs
//2208		regex = '<(?!' + _mwtPreservedTagsList + '|@@@|\\/)(.*?)(>([\\S\\s]*?)<\\/\\1>)';
//			regex = '<((\\w+)((\\s+\\w+(\\s*=\\s*(?:".*?"|' +"'" + ".*?'|[\\^'" + '"' + '>\\s]+))?)+\\s*|\\s*)\/?)>';
//			regex = '<((\\w+)((\\s+\\w+(\\s*=\\s*(?:".*?"|' +"'" + ".*?'|[\\^'" + '"' + '>\\s]+))?)+\\s*|\\s*))>([\\S\\s]*?)<\\/\\2>';
			regex = '<((\\w+?)((\\s+?\\w+?(\\W*?=\\s*?(?:".*?"|' + "'" + ".*?'|[\\^'" + '"' + '>\\s]+?))?)+?\\s*?|\\W*?))>([\\S\\s]*?)<\\/\\2>';
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match, $1, $2, $3, $4, $5, $6, $7) {
				// $1 = content of the opening tag
				// $2 = opening tag name
				// $6 = content enclosed by the tags
				var html;
				
				if (preservedTags.indexOf( $2 ) > -1) {
					// if valid wiki or html tag then ignore
					return match;
				} else {
					// replace angle brackets with html equivalents
					return ltePlaceholder + $1 + gtePlaceholder + $6 + ltePlaceholder + '/' + $2 + gtePlaceholder;
				}
			});

			// then treat unrecognised tag singletons
//2108			regex = '<((?!' + _mwtPreservedTagsList + '|@@@|\\/).*?\\/?)>';
//			regex = '<((\\w+)((\\s+\\w+(\\s*=\\s*(?:".*?"|' +"'" + ".*?'|[\\^'" + '"' + '>\\s]+))?)+\\s*|\\s*)\/?)>';
//			regex = '<(\/?(\\w+?)((\\s+?\\w+?(\\s*?=\\s*?(?:".*?"|' + "'" + ".*?'|[\\^'" + '"' + '>\\s]+?))?)+?\\s*?|\\W*?\\w*?)\/?)>';
//			regex = '<(\/?(\\w+?)(\\s+?\\w+?(\\s*?=\\s*?(?:".*?"|' + "'" + ".*?'|[\\^'" + '"' + '>\\s]+?))?)+?\\s*?|\\W*?\\w*?\/?)>';
			regex = '<(\\/?(\\w+)[^>\\w]?[^>]*?)>';
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match, $1, $2, $3, $4, $5, $6) {
				// $1 = tag name
				var html;

				if (preservedTags.indexOf( $2 ) > -1) {
					// if valid wiki or html tag then ignore
					return match;
				} else {
					return ltePlaceholder + $1 + gtePlaceholder;
				}
			});

			// treat <ins> here as they may break the batch mediawiki parsing
			// done for other tags. Hopefully they aren't nestable!
			regex = '<(ins)[\\S\\s]*?>[\\S\\s]*?<\\/\\1>';
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match, $1, offset) {
				// $1 = the tag
				var parserResult;

				parserResult = _parseWiki4Html(match);
				// remove the extraneous new line if inserted at end!
				return _getPlaceHolder4Html(parserResult.parsedWikiText, $.trim(parserResult.parsedHtml), $1, 'nonEditable')
			});

			// then treat special case of </> 
			regex = '<\\/>';
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match) {
				var html;

				html = '<code class="mwt-nonEditable mwt-wikiMagic">' + match.replace(/\</gmi, '&lt;') + '</code>';
				return _getPlaceHolder4Html(match, html, 'unknown', 'nonEditable');
			});

			text = text.replace(/(^|\n{1,2})((----+)([ ]*)(.*)(\n{1,2}))/gi, function(match, $1, $2, $3, $4, $5, $6, offset, string) {
				// $1 = start of text or new line that preceeds the '-----'
				// $2 = the match minus everything before the dashes
				// $3 = the dashes in the original wikicode, must be four or more
				// $4 = any spaces that follow the dashes on the same line
				// $5 = any text following the spaces on the same line
				// $6 = any new lines following the text on the same line

				// Because of a quirk with mediawiki, a horizontal rule can be followed by spaces and text
				// The text is displayed on a new line. This text is rendered as part of the hr block so we 
				// place it in a <div> block
				var preNewLines = '',
					postNewLines = '',
					placeHolder,
					wikiText = '<@@bnl@@>' + $3 + $4 + '<@@bnl@@>', 
					html = '<hr class="mw-hr" data-mwt-wikitext="' + encodeURI(wikiText) + '">';

				// we need to keep put the '\n's in here in case a table or other block
				// starts on the next line.  If there are 2 then one is non-rendering
				// and we use a placehoder so it is revealed in the editor window
				if ($6.length == 1) {
					postNewLines = '\n';
				} else if ($6.length == 2) {
					postNewLines = '<@@slb@@>\n';
				}

				// we also need to process the case where there is text on
				// the same line as the '-'s
				if ($5) {
					placeHolder = _getPlaceHolder4Html($2, 'toParse', 'hr', 'nonEditable');
				} else {
					placeHolder = _getPlaceHolder4Html(wikiText, html, 'hr', 'nonEditable');
				}
				return $1 + placeHolder + postNewLines;
			});

			return text;
		}

		/**
		 * Convert html tags embedded in the wiki code which shouldn't
		 * be converted back to wiki code on saving and preserve them for recovery later.
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function preserveNonWikiTags4Html(text) {
			var $dom,
				regex, 
				matcher,
				extensionTags,
				preservedTags,
				invariantTags;

			/**
			 * Convert child elements which shouldn't be converted back to 
			 * wiki code on saving and preserve them for recovery later.
			 * BEWARE recursive function
			 *
			 * @param {element} dom element
			 * @returns {} dom is update by function
			 */
			function convertChildren( element, level ) {
				//be aware this function is recursive

				// if the tag is an html tag then we don't need to parse
				// it with the mediawiki parser but we do want to preserve it
				// so it doesn't get converted to wiki markup when being saved
				// but remains as html in the wiki code 
				var elm,
					elmTagName,
					html,
					innerHTML,
					outerHTML;

				element.children().each( function() {
					if ($(this).children()) convertChildren( $(this), level + 1 );

					elm = $(this);
					elmTagName = elm.prop("tagName").toLowerCase();
					innerHTML = elm.prop("innerHTML");
					outerHTML = elm.prop("outerHTML");

					// If this Tag is allowed by mediawiki but has no wiki markup
					// equivalent then it doesn't need to be protected in the TinyMCE
					// editor.  Everything else need to be preserved
					if ((extensionTags.indexOf(elmTagName) > -1) || 
						(preservedTags.indexOf(elmTagName) > -1)) {
						// process other tags that are allowed by mediawiki
						elm.addClass( "mwt-preserveHtml" );
						if (elm.attr( "title")) {
							elm.attr( "title", function (i, title) {
								title = _recoverPlaceholders2Wiki( title );
								return title;
							});
						}
						
						if ((elmTagName != 'table')
							&& (elmTagName != 'tbody')
							&& (elmTagName != 'tr')) {
							// conserve any new lines in the inner html
							// except in table tags that don't contain data!
							
							innerHTML = innerHTML.replace(/\n/gmi,'<@@vnl@@>');
							elm.prop( "innerHTML", innerHTML );
						}

					} else {
						// this tag is unrecognised as an html or a mediawiki tag
						// so we wrap it in <code> tags.  All these should have be caught 
						// before now so this is just a failsafe.

						elm.replaceWith( outerHTML );
					}

					return;
				} );
			}

			// turn the regex list of tags into an arryay
			extensionTags = _mwtExtensionTagsList.split('|');
			preservedTags = _mwtPreservedTagsList.split('|');
			invariantTags = _mwtInvariantTagsList.split('|');
			
			// convert the text in the editor to a DOM in order
			// to process the remaining html tags		
			$dom = $( "<tinywrapper>" + text + "</tinywrapper>" );
			text = $dom.html();

			// process each element in the dom recursively
			// be aware this next function is recursive
			convertChildren($dom, 0 );

			// convert DOM back to html text and decode html entities
			text = htmlDecode ( $dom.html() );

			// find and process pseudo <pre> tags where wikicode lines starts with spaces.  If
			// several consecutive lines start with a space they are treated as a single <pre> block.
			// If the space is followed by any tag or | then ignore
			regex = '(^|\\n)( +[^\\s][^]+?)(?=(\\n\\S|\\n\\s*\\n|\\n\\s*$|$))';
			matcher = new RegExp(regex, 'gi');
			text = text.replace(matcher, function(match, $1, $2, $3, offset, string) {
				// $1 = the new lines preceding the text in pseudo <pre>s
				// $2 = lines starting with spaces to be placed in the pseudo <pre>s
				// $3 = the line following the text in pseudo <pre>s

				// spaces before the opening '{|' of a table aren't treated as a pseodo pre
				if ( $2.match( /^\s*\{\|/ ) ) {
					return match;
				} else {
					// first we need to decode the contents of preserved html tags
					$2 = $2.replace(/\n/gmi,'<@@vnl@@>');
					$2 = _convertHtml2Wiki( $2 );
					$2 = $2.replace(/<@@vnl@@>/gmi, '\n');

					return $1 + _getPlaceHolder4Html($2, 'toParse', 'ppre', 'nonEditable');

				}
			});

			text = text.replace(/<@@vnl@@>/gmi, '\n')

			// now we want to conserve, as much as we can, any formatting of retained html tags
			// in the wiki text.  This is typcally used to make the wiki text more readable
			var regex = "^(\\||\\:|\\;|#|\\*)?(\\s*)(<" 
					+ _mwtPreservedTagsList.split('|').join('[^>]*?>|<')
					+ _mwtInvariantTagsList.split('|').join('[^>]*?>|<')
					+ "[^>]*?>)(.*)$",
				matcher = new RegExp(regex, 'i'),
				regex1 = "(\\s*)(<" 
					+ _mwtPreservedTagsList.split('|').join('[^>]*?>|<')
					+ _mwtInvariantTagsList.split('|').join('[^>]*?>|<')
					+ "[^>]*?>])",
				matcher1 = new RegExp(regex1, 'gmi');

			// step through text a line at a time looking for lines 
			// that contain html tags
			var lines = text.split(/\n/);

			for (var i = 0; i < lines.length; i++) {
				var line = lines[i];

				line = line.replace(matcher, function (match, $1, $2, $3, $4) {
					// $1 = new line start table cell or list delimeter
					// $2 = spaces before embedded html tag
					// $3 = first embeddedhtml tag
					// $4 = the rest of the line
					var spaces = $2,
						firstTag = $3;

					/// add new line and spaces data to first tag
					if (!$1) {
						$1 ='';
						firstTag = firstTag.replace(/(^<[^>]*?)>/i, '$1 data-mwt-sameLine="false" data-mwt-spaces="' + spaces + '">');
					} else {
						firstTag = firstTag.replace(/(^<[^>]*?)>/i, '$1 data-mwt-sameLine="true" data-mwt-spaces="' + spaces + '">');
					}

					// now process any remaining embedded html tags in the line
					$4 = $4.replace( matcher1, function (match, $1, $2){
						// $1 = spaces before tag
						// $2 = the block tag
						var moreSpaces = $1,
							anotherTag = $2;

						anotherTag = anotherTag.replace(/(^<[^>]*?)>/i, '$1 data-mwt-sameLine="true" data-mwt-spaces="' + moreSpaces + '">');
						return anotherTag;
					});

					return $1 + firstTag + $4;
				});

				lines[ i ] = line;
			}
			text = lines.join( '\n' );

			return text;
		}

		/**
		 * Converts wiki templates to html and preserves them for recovery later.
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function preserveTemplates4Html(text) {
			var 
				regex, 
				matcher, 
				pos,
				templateStart = 0, 
				curlyBraceDepth = 0, 
				templateDepth = 0,
				tempTemplate = '', 
				placeHolder,
				parserResult,
				checkedBraces = new Array();

			// save some effort if there are no templates
			if ( !text.match(/\{\{/) ) return text;

			// step through text a character at a time looking for templates
			for (pos = 0; pos < text.length; pos++) {
				if (text[pos] === '{') {
					curlyBraceDepth++;
					if (text.charAt(pos + 1) === '{') {
						if (templateDepth == 0) {
							templateStart = pos;
						}
						curlyBraceDepth++;
						templateDepth++;
						pos++
					}
				}
				if (text[pos] === '}') {
					if (curlyBraceDepth > 0 ) curlyBraceDepth--;
					if ((text.charAt(pos + 1) === '}') && (templateDepth > 0 )) {
						curlyBraceDepth--;
						templateDepth--;
						pos++
						if (templateDepth === 0) {
							tempTemplate = text.substring(templateStart,pos + 1);
							if (tempTemplate !== '' ) {
								placeHolder = _getPlaceHolder4Html(tempTemplate, 'toParse', 'template', 'nonEditable');
								if (placeHolder) {
									// replace each occurences of the
									// template call multiple replacement breaks
									// things later on 
									regex = tempTemplate.replace(/[^A-Za-z0-9_]/g, '\\$&');
									matcher = new RegExp(regex, '');
									text = text.replace(matcher, placeHolder);

									// reset the pointer to end of replaced text
									pos = templateStart + placeHolder.length - 1;
								}
								tempTemplate = '';
							}
							templateStart = 0;
							curlyBraceDepth = 0;
						}
					}
				}
			}
			return text;
		}

		/**
		 * Preserves single line breaks as placeholder in html code
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function singleLinebreaks2html(text) {	
			var processFlag,
				postText,
				regex,
				matcher,
				regex2,
				matcher2,
				startTagsList,
				blockTagList,
				preservedTagList;

			// A single new line is not renderred as such by mediawiki unless 
			// it is preceded or followed by certain types of line. We need 
			// to pass text several times to be sure we got them all

			// a single new line followed by any line starting with an 
			// element in postText, possibly preceded by spaces, 
			// is rendered as a new line.  Basically this is any htmltag including
			// any already substitued with a place holder or wiki markup for headers,
			// tables and lists
			preservedTagList = _mwtPreservedTagsList + '|' + _mwtInvariantTagsList;
			startTagsList = _mwtBlockTagsList.split("|").join(":|<@@@");
			postText = "\\s*(\\n|\\||!|\\{\\||#|\\*|;|=|:|<@@@" 
				+ startTagsList 
				+ ":|\\s*$)"
				+ "|<\\/?" 
				+ _mwtBlockTagsList.split('|').join('[\\s>]|<\\/?') 
				+ preservedTagList.split('|').join('[\\s>]|<\\/?')
				+ "[\\s>]" 
				+ "(\\|\\}\\s*$|=\\s*$|<\\/span>\\s*$|^\\s*(#|\\*|:|;|\\|\\||\\|-|\\|\\}))";

			// remove any exceptions from the list of tags that are ignored
			postText = postText.replace(/:\|<@@@pre:/gmi, ""); // <pre> tags
			postText = postText.replace(/:\|<@@@h[1-6]/gmi, ""); // <h[n]> tags

			// cater for blank lines at start of text before blocks
			regex = '([^\\n]+)(\\n)(?!(' + postText + '))';
			matcher = new RegExp(regex, 'gi');

			// also set up the matcher for the inner match statement to avoid having to redefine it
			// every time the out matcher matches!
			blockTagList = _mwtBlockTagsList.split("|").join(":\\d*@@@>|<@@@");
			regex2 = "(\\|\\}\\s*$|=\\s*$|<@@@" 
				+ blockTagList + ":\\d*@@@>" 
				+ "|<\\/?" 
				+ _mwtBlockTagsList.split('|').join('[\\s>]|<\\/?') 
				+ preservedTagList.split('|').join('[\\s>]|<\\/?')
				+ "[\\s>]" 
				+ "|^\\s*(#|\\*|:|;|\\|\\||\\|-|\\|\\}))";

			// remove any exceptions from the list of tags that are ignored
			regex2 = regex2.replace(/\|<\\\/\?span\[\\s>\]/gmi, ""); // <span> tags

			matcher2 = new RegExp(regex2, 'i');

			// special case if page starts with a single new line
			text = text.replace(/^\n([^\n*#{]+)/, '<@@slb@@>$1');

			// now process all single new lines
			do {
				processFlag = false;
				text = text.replace(matcher, function(match, $1, $2, $3, offset, string) {
					// $1 = the text preceding single new line
					// $2 = the single new line itself
					// $3 = any non-excluded text following the single new line 

					// if the line preceding the single new line doesn't end with any of the
					// folowing characters in a line or start with others then render as a new line
					if ($1.match(matcher2)){
						// ignore if the first line following starts with a block tag
						return match;
					} else {
						// insert placeholder for single new line if placeholder is defined
						processFlag = true;
						if (_slb) {
							return $1 + '<@@slb@@>';
						} else {
							return $1 + ' ';
						}
					}
				});
			} while (processFlag);

			return text;
		}

		/**
		 * Converts MW styles to HTML
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function styles2html(text) {
			// bold and italics
			// the ^' fixes a problem with combined bold and italic markup
			text = text.replace(/'''([^'\n][^\n]*?)'''([^']?)/gmi, '<strong>$1</strong>$2');
			text = text.replace(/''([^'\n][^\n]*?)''([^']?)/gmi, '<em>$1</em>$2');

			// div styles
			text = text.replace(/<div style='text-align:left'>(.*?)<\/div>/gmi, "<div align='left'>$1</div>");
			text = text.replace(/<div style='text-align:right'>(.*?)<\/div>/gmi, "<div align='right'>$1</div>");
			text = text.replace(/<div style='text-align:center'>(.*?)<\/div>/gmi, "<div align='center'>$1</div>");
			text = text.replace(/<div style='text-align:justify'>(.*?)<\/div>/gmi, "<div align='justify'>$1</div>");
			return text;
		}

		/**
		 * Processes wiki headings into html.
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function headings2html(text) {	
			// One regexp to rule them all, one regexp to find them,
			// one regexp to bring them all and in html bind them!!!
			text = text.replace(/(^|\n)(={1,6})(\s*)(\S.*?)(\s*)\2([^\n]*)(\n+|$)/img, 
				function(match, $1, $2, $3, $4, $5, $6, $7) {
				// $1 = the new line before the heading, if any 
				// $2 = the level of the heading
				// $3 = spaces before the content of the heading
				// $4 = the content of the heading
				// $5 = spaces after the content of the heading
				// $6 = text following heading on same line
				// $7 = new lines following the heading
				// $8 = offset
				// $9 = original text
				var heading;

				// if there is text after the heading on the same line then 
				// treat as if not a heading
				if( $6.match(/\S/)) return match;

				// if no new lines before, make '' rather than undefined
				if( typeof $1 == 'undefined' ) {
					$1 = '';
				}

				// build the html for the heading
				heading = $1 + "<h" + $2.length + 
					" class='mwt-heading'" +
					" data-mwt-headingSpacesBefore='" + $3 + "'" +
					" data-mwt-headingSpacesAfter='" + $5 + "'" +
					" data-mwt-headingNewLines=" + $7.length + 
					" >" + $4 + "</h" + $2.length + ">" ;

				return heading + "\n";
			});
			return text;
		}

		/**
		 * Convert MW tables to HTML
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function tables2html(text, embedded) {
			var lines, 
				line,
				lastLine, 
				innerLines, 
				innerTable,
				tableAttr, 
				closeLine, 
				attr, 
				endTd,
				tdText, 
				tdAttr, 
				curLine,
				cells,
				cellStart, 
				wikiPipe,
				cellInLine,
				cellEmptyLineFirst,
				parts,
				curLine,
				cont, 
				tempcont,
				emptyLine,
				blockTagList,
				indented = false,
				inTable = false,
				inTr = false,
				inTd = false,
				inTh = false,
				start = 0,
				nestLevel = 0,
				regex,
				blockMatcher;

			/**
			 * Normalizes some MW table syntax shorthand to HTML attributes
			 *
			 * @param {String} attr
			 * @param {String} elm
			 * @returns {String}
			 */
			function tablesAttrCleanUp2html(attr, elm) {
				var regex,
					matcher;

				switch (elm) {
					case 'table':
						attr = attr.replace(/al="*?(.*)"*?/g, "align=\"$1\"");
						attr = attr.replace(/bc="*?(.*)"*?/g, "background-color=\"$1\"");
						attr = attr.replace(/va="*?(.*)"*?/g, "valign=\"$1\"");
						// get rid of spurious '|' delimiters
						attr = attr.replace(/\s\|\s/g, " ");
						break;
					case 'row':
						attr = attr.replace(/al="*?(.*)"*?/g, "align=\"$1\"");
						attr = attr.replace(/bc="*?(.*)"*?/g, "background-color=\"$1\"");
						attr = attr.replace(/va="*?(.*)"*?/g, "valign=\"$1\"");
						break;
					case 'cell':
						attr = attr.replace(/al="*?(.*)"*?/g, "align=\"$1\"");
						attr = attr.replace(/bc="*?(.*)"*?/g, "background-color=\"$1\"");
						attr = attr.replace(/cs="*?(.*)"*?/g, "colspan=\"$1\"");
						attr = attr.replace(/rs="*?(.*)"*?/g, "rowspan=\"$1\"");
						attr = attr.replace(/va="*?(.*)"*?/g, "valign=\"$1\"");
						attr = attr.replace(/wd="*?(.*)"*?/g, "width=\"$1\"");
						break;
				}

				// case where attr contains html like tags
				// stash these in html data attribute
				// otherwise they break the display
				regex = '<(\\S*?)(.*?)(>([\\S\\s]*?)<\\/\\1>)';
				matcher = new RegExp(regex, 'gmi');
				attr = attr.replace(matcher, function(match, $1) {
					var html;

					html = "data-mwt-" + $1 + "='" + match.replace(/\</gmi, '&lt;').replace(/\>/gmi, '&gt;') + "'";
					return html;
				});

				// save any placeholders in the data attributes too
				regex = '<@@@.*?:\\d*?@@@>';
				matcher = new RegExp(regex, 'gmi');
				attr = attr.replace(matcher, function(match, $1) {
					var html;

					html = "data-mwt-attr='" + _recoverPlaceholders2Wiki(match).replace(/\</gmi, '&amp;lt;').replace(/\>/gmi, '&amp;gt;') + "'";
					return html;
				});

				// special case where attribute is an empty placeholder
				attr = attr.replace(/^\s{0,2}(\s*)$/,"data-mwt-attr='$1'");
				return ' ' + attr;
			}

			// save effort if no tables in text, note table open can be preceded by a ':'
			if (!text.match(/(^|\n)\:?\s*\{\|/,'gm')) return text;

			// make a regular expresion matcher to see if a line contains a block element
			// this is used later when walking through the editor content line by line
			blockTagList = _mwtBlockTagsList.split("|").join(":\\d*@@@>|<@@@");
			regex = '^\\s*(<@@@' + blockTagList + ':\\d*@@@>' +
				 '|<' + _mwtBlockTagsList.split("|").join("[\\s>]|<") +
				 '|<\\/' + _mwtBlockTagsList.split("|").join(">|<\\/") +
				 '|<br[^>]*>|<@@slb@@>)' ;
			blockMatcher = new RegExp(regex, 'i');

			// if embedded is true it means we are processing a nested table recursively 
			if (typeof embedded == 'undefined') {
				embedded = false;
			}

			// replace multiple new lines after table start with single new line
			// and a data attribute to store the number of new lines for recovery later
			text = text.replace(/(\{\|[^\n]*?)(\n+)/gmi, function(match, $1, $2) {
				// $1 = the first line of the table defintion 
				// $2 = the empty new lines immediately following the table definition
				var tableStart;

				// build the first line of the table with placeholders for the additional lines
				if ($2) {
					tableStart = " data-mwt-tableStartNewLines=" + $2.length;
				}
				tableStart = $1 + tableStart + "\n";

				return tableStart;
			});

			// pre-process the end of the table 
			text = text.replace(/\n\|\}([ ]*)(.*)(?=\n)/gmi, function(match, $1, $2, offset, string) {
				// $1 = spaces after table close
				// $2 = text after table close

				if ($2) {
					// if there is text on the same line as the table end
					// then process this so it can be retrieved when converting back
					return '\n\|\}<span class="mwt-closeTable" mwt-spaces="' + $1 + '">' + $2 + '</span><br class="mwt-emptyline"/>';
				} else {
					return match;
				}
			});

			// step through text a line at a time looking for lines 
			// that that belong to tables
			lines = text.split(/\n/);
			for (var i = 0; i < lines.length; i++) {
				line = lines[i].match(/^\:?\s*\{\|(.*)/gi);
				lastLine = (i == lines.length - 1);

				// process non empty lines 
				if (line && line !== '') {
					// process nested table.  Extract nested table, then
					// send it back for wiki code to html conversion, beware: recursive
					if (inTable) {
						innerLines = '';
						nestLevel = 0;
						for (; i < lines.length; i++) {
							if (lines[i].match(/^\{\|(.*)/gi)) {
								nestLevel++;
								innerLines = innerLines + lines[i] + '\n';
								lines.splice(i, 1);
								i--;
							} else if (lines[i].match(/^\|\}/gi)) {
								if (nestLevel > 1) {
									innerLines = innerLines + lines[i] + '\n';
									lines.splice(i, 1);
									i--;
									nestLevel--;
								} else {
									innerLines = innerLines + lines[i];
									lines.splice(i, 1);
									i--;
									break;
								}
							} else {
								innerLines = innerLines + lines[i] + '\n';
								lines.splice(i, 1);
								i--;
							}
						}
						i++;
						embedded = true;
						innerTable = tables2html(innerLines, embedded);
						lines.splice(i, 0, innerTable);
						embedded = false;
						continue;
					}

					// take care, table start can be preceded by a ':' to force an indent
					lines[i] = line[0].replace(/^(\:?)\s*\{\|(.*)/, function(match, $1, $2) {
						// $1 = ':' if this table is in a definition (indented)
						// $2 = table attributes if any
						var attr,
							tableTag;

						// add in definition item coding if preceded by ':'
						// and remove any templates in attributes as these will mess it up
						if ($2) {
							attr = tablesAttrCleanUp2html($2, 'table');
							tableTag = "<table" + attr + ">";
						} else {
							tableTag = "<table>";
						}
						if ($1) {
							indented = true;
							return '<dl><dd class="mwt-list" data-mwt-sameLine="false">' + tableTag;
						} else {
							return tableTag;
						}
					});
					start = i;
					inTable = true;
				} else if (line = lines[i].match(/^\|\}/gi)) {
					// processing end of table
					closeLine = '';
					if (inTd) {
						closeLine = "</td>";
					}
					if (inTh) {
						closeLine = "</th>";
					}
					if (inTr) {
						closeLine += "</tr>";
					}
					if (indented) {
						lines[i] = closeLine + "</table></dd></dl>" + lines[i].substr(2, lines[i].length);
					} else {
						lines[i] = closeLine + "</table>" + lines[i].substr(2, lines[i].length);		
					}
					indented = inTr = inTd = inTh = inTable = false;

					// join together all the table lines into a single html line and then replace 
					// the tables lines with this html line
					start = 0;
				} else if ((i === (start + 1)) && (line = lines[i].match(/^\|\+(.*)/gi))) {
					// process caption
					parts = line[0].substr(2).split('|');
					if (parts.length > 1) {
						lines[i] = "<caption" + parts[0] + ">" + parts[1] + "</caption>";
					} else {
						lines[i] = "<caption>" + line[0].substr(2) + "</caption>";
					}
				} else if (line = lines[i].match(/^\|\-(.*)/gi)) {
					// process rows
					endTd = '';

					// process attribues for row
					attr = tablesAttrCleanUp2html(line[0].substr(2, line[0].length), 'row');
					if (inTd) {
						endTd = "</td>";
						inTd = inTh = false;
					}
					if (inTh) {
						endTd = "</th>";
						inTh = inTd = false;
					}
					if (inTr) {
						lines[i] = endTd + "</tr><tr" + attr + ">";
					} else {
						lines[i] = endTd + "<tr" + attr + ">";
						inTr = true;
					}
				} else if ( ( line = lines[i].match(/^\|(.*)/gi) ) && inTable) {
					// process cells
					cellStart = 1 ;
					curLine = '';

					// check to see if cell row starts with '|' or '||' and remeber
					if (line[0].substr(1,1) == '|') cellStart = 2 ;

					// split the cell row inot individual cells if there are any
					cells = line[0].substr(cellStart, line[0].length).split("||");

					// process the individual cells in the row
					for (var k = 0; k < cells.length; k++) {
						tdText = '';
						tdAttr = '';

						// remove an initial '|' if there is one 
						if (k > 0 && (cells[k].indexOf("|") === 0)) {
							cells[k] = cells[k].substr(1, cells[k].length);
						}

						// process the cell's attributes if any
						cont = cells[k].split("|");
						if (cont.length > 1) {
							// a pipe  within the cell content means it has attributes
							tempcont = new Array();
							for (var j = 1; j < cont.length; j++) {
								tempcont[j - 1] = cont[j];
							}
							tdText = tempcont.join("|");
							tdAttr = tablesAttrCleanUp2html(cont[0], 'cell');
						} else {
							tdText = cont[0];
						}

						//remember if the first line of the cell is empty
						if (tdText.match (/^\s*$/)) {
							cellEmptyLineFirst = 'true';
						} else {
							cellEmptyLineFirst = 'false';
						}

						if (!inTr) {
							inTr = true;
							curLine = "<tr class='mwt-silentTr' >" + curLine;
						}

						if (cellStart == 1)	{
							wikiPipe = '|' ;
						} else {
							wikiPipe = '||'	;					
						}

						if (cellStart > 0) {
							cellInLine = 'false' ;
						} else {
							cellInLine = 'true' ;
						}

						if (inTd) {
							curLine += "</td>";
						} else if ( inTh ) {
							curLine += "</th>";
							inTh = false;
							inTd = true;
						} else {
							inTd = true;
						}
						curLine += "<td" + tdAttr + " data-mwt-cellInline='" + cellInLine + "' data-mwt-cellEmptyLineFirst='" + cellEmptyLineFirst + "' data-mwt-wikiPipe='" + wikiPipe + "' >" + tdText;
						cellStart = -1;
						cellInLine = false;
						cellEmptyLineFirst = false;
						wikiPipe = '';						
					}
					lines[i] = curLine;
				} else if ( ( line = lines[i].match(/^\!(.*)/gi) ) && inTable) {
					// process headings, being sure to cater for when headings are on the 
					// same or separate lines
					cellStart = 1 ;
					curLine = '';

					// make note if header starts with one or two '||'s 
					if (line[0].substr(1,1) == '|') cellStart = 2 ;

					// split the line into one or more header cells
					cells = line[0].substr(cellStart, line[0].length).split("!!");

					// process each of the header cells found
					for (var k = 0; k < cells.length; k++) {
						tdText = '';
						tdAttr = '';

						if (k > 0 && (cells[k].indexOf("|") === 0)) {
							cells[k] = cells[k].substr(1, cells[k].length);
						}

						cont = cells[k].split("|");
						if (cont.length > 1) {
							// a pipe  within the cell content means it has attributes
							tempcont = new Array();
							for (var j = 1; j < cont.length; j++) {
								tempcont[j - 1] = cont[j];
							}
							tdText = tempcont.join("|");
							tdAttr = tablesAttrCleanUp2html(cont[0], 'cell');
						} else {
							tdText = cont[0];
						}

						// in mediwiki the row code can be infered so we note
						// that so we can rebuild the wiki code corrrectly later
						if (!inTr) {
							inTr = true;
							curLine = "<tr class='mwt-silentTr' >" + curLine;
						}

						// we use wikiPipe to record whether the cell started with 
						// a single or double character code
						if (cellStart == 1)	{
							wikiPipe = '!' ;
						} else {
							wikiPipe = '!!'	;					
						}

						// we use cellInLine to record if the headers are on the
						// same or different lines
						if (cellStart > 0) {
							cellInLine = 'false' ;
						} else {
							cellInLine = 'true' ;
						}

						// close off any open headers or cells before adding the
						// new header html
						if (inTh) {
							curLine += "</th>";
						} else if (inTd) {
							curLine += "</td>";
							inTd = false;
							inTh = true;
						} else {
							inTh = true;
						}

						// finally build the html for the header
						curLine += "<th" + tdAttr + " data-mwt-cellInline='" + 
							cellInLine + "' data-mwt-wikiPipe='" + 
							wikiPipe + "' >" + tdText;
						cellStart = -1;
					}

					// replace the original wiki code with the new html
					lines[i] = curLine;
				} else {
					// process line in cell without table markup
					if (inTd) {
						//process empty lines at start and end of cells
						if (emptyLine = lines[i].match(/^(\s|&nbsp;)*$/)) { 
							// if this is first line in cell
							if ( lines[i-1].match( /<td[^>]*>(\s|&nbsp;)*$/) ) {
								// if first line of data in a table cell
								if (lines[i+1].match(/^(\s|&nbsp;)*$/)) {
									lines[i] = lines[i] + '<@@slb@@>';
								} else {
									lines[i] = lines[i] + '<br class="mwt-emptylineFirst"/>';
								}
							}
						} else {
							// process non empty first line of data
							if ( lines[i-1].match( /<td[^>]*>/) ) {
								// and line doesn't start with a block tag
								if ( !lines[i].match(blockMatcher) ) {
									// and if not a single line
									// then add an empty line after
									lines[i-1] = lines[i-1] + '<br class="mwt-emptyline"/>';
								}
							}
						}
					}
				}
			}
			text = lines.join("\n");
			return text;
		}

		/**
		 * Converts MW lists and empty lines to HTML
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function listsAndEmptyLines2html(text) {
			var lines = [],
				lastList = '',
				line = '',
				inParagraph = false,
				inBlock = false,
				matchStartTags = false,
				matchEndTags = false,
				emptyLine = false,
				lastLine = false,
				startTags = 0,
				endTags = 0,
				blockLineCount = 0,
				blockTagList,
				regex,
				matcher;

			/**
			 * Converts MW list markers to HTML list open tags
			 *
			 * @param {String} lastList
			 * @param {String} cur
			 * @returns {String}
			 */
			function openList2html( lastList, cur, spaces ) {
				var listTags = '';

				// firstly build list tag for the the overlap with last list if needed
				if (lastList !=  cur.slice( 0, lastList.length )) {
					listTags = continueList2html(  lastList, cur.slice( 0, lastList.length ), spaces );
				}

				for (var k = lastList.length; k < cur.length; k++) {
					switch (cur.charAt(k)) {
						case '*' :
							listTags = listTags + '<ul><li class="mwt-list" data-mwt-sameLine="false" data-mwt-spaces="' + spaces + '">';
							break;
						case '#' :
							listTags = listTags + '<ol><li class="mwt-list" data-mwt-sameLine="false" data-mwt-spaces="' + spaces + '">';
							break;
						case ';' :
							listTags = listTags + '<dl><dt class="mwt-list" data-mwt-sameLine="false" data-mwt-spaces="' + spaces + '">';
							break;
						case ':' :
							listTags = listTags + '<dl><dd class="mwt-list" data-mwt-sameLine="false" data-mwt-spaces="' + spaces + '">';
							break;
					}
				}
				return listTags;
			}

			/**
			 * Converts MW list markers to HTML list end tags
			 *
			 * @param {String} lastList
			 * @param {String} cur
			 * @returns {String}
			 */
			function closeList2html(lastList, cur) {
				var listTags = '';
				for (var k = lastList.length; k > cur.length; k--) {
					switch (lastList.charAt(k - 1)) {
						case '*' :
							listTags = listTags + '</li></ul>';
							break;
						case '#' :
							listTags = listTags + '</li></ol>';
							break;
						case ';' :
							listTags = listTags + '</dt></dl>';
							break;
						case ':' :
							listTags = listTags + '</dd></dl>';
							break;
					}
				}
				return listTags;
			}

			/**
			 * Converts MW list markers to HTML list item tags
			 *
			 * @param {String} lastList
			 * @param {String} cur
			 * @returns {String}
			 */
			function continueList2html(lastList, curList, spaces) {
				var listTags = '',
					lastTag = lastList.charAt(lastList.length - 1),
					curTag = curList.charAt(curList.length - 1),
					k;

				if (lastList === curList) {
					// this is a straighjtforward continuation of the previous list
					switch (lastTag) {
						case '*' :
						case '#' :
							listTags = '</li><li class="mwt-list" data-mwt-sameLine="false" data-mwt-spaces="' + spaces + '">';
							break;
						case ';' :
							listTags = listTags + '</dt><dt class="mwt-list" data-mwt-sameLine="false" data-mwt-spaces="' + spaces + '">';
							break;
						case ':' :
							listTags = '</dd><dd class="mwt-list" data-mwt-sameLine="false" data-mwt-spaces="' + spaces + '">';
							break;
					}
				} else {
					// the current list code differs from the previous one
					// so we need to work through the list code a character at a time
					// until they are the same
					k = lastList.length
					while (lastList.substring(0,k) != curList.substring(0,k)) {
						lastTag = lastList.charAt(k - 1)
						curTag = curList.charAt(k - 1)
						switch (lastTag) {
							case '*' :
								listTags = listTags + '</li></ul>';
								break;
							case '#' :
								listTags = listTags + '</li></ol>';
								break;
							case ';' :
								// if definition item
								if (curTag == ':') {
									listTags = listTags + '</dt>';
								} else {
									listTags = listTags + '</dt></dl>';
								}
								break;
							case ':' :
								if (curTag == ';') {
									listTags = listTags + '</dd>';
								} else {
									listTags = listTags + '</dd></dl>';
								}
								break;
						}
						k--;
					}
					do {
						// now add back the new list codes
						curTag = curList.charAt(k)
						switch (curTag) {
							case '*' :
								listTags = listTags + '<ul><li class="mwt-list" data-mwt-sameLine="false" data-mwt-spaces="' + spaces + '">';
								break;
							case '#' :
								listTags = listTags + '<ol><li class="mwt-list" data-mwt-sameLine="false" data-mwt-spaces="' + spaces + '">';
								break;
							case ';' :
								if ( lastTag == ':' ) {
									listTags = listTags + '<dt class="mwt-list" data-mwt-sameLine="false" data-mwt-spaces="' + spaces + '">';
								} else {
									listTags = listTags + '<dl><dt class="mwt-list" data-mwt-sameLine="false" data-mwt-spaces="' + spaces + '">';
								}
								break;
							case ':' :
								if ( lastTag == ';' ) {
									listTags = listTags + '<dd class="mwt-list" data-mwt-sameLine="false" data-mwt-spaces="' + spaces + '">';
								} else if (( lastTag == '*' ) || ( lastTag == '#' ) || ( lastTag == ':' )) {
									// close the previous lists and start a new definition list
									if (!lastList) {
										// on the same line
										listTags = listTags + '<dl><dd class="mwt-list" data-mwt-sameLine="true" data-mwt-spaces="' + spaces + '">';
									} else {
										// on a different line
										listTags = listTags + '<dl><dd class="mwt-list" data-mwt-sameLine="false" data-mwt-spaces="' + spaces + '">';
									}
								}
								break;
						}
						lastTag = curTag;
						k++;
					} while (k < curList.length); 
				}
				return listTags;
			}

			// make a regular expresion matcher to see if a line ends wtth a block element
			// this is used when walking through the editor content line by line.  We add
			// back PRE because it isn't in the block tag list as mediawiki treats them 
			// differently to how browsers do!
			blockTagList = _mwtBlockTagsList.split("|").join(":\\d*@@@>|<@@@") 
				+ ':\\d*@@@>|<@@@pre:\\d*@@@>'
				+ ':\\d*@@@>|<@@@ppre:\\d*@@@>';
			regex = '(<@@@' + blockTagList 
					+ '|<' 
					+ _mwtBlockTagsList.split("|").join("[^>]*>|<") 
					+ '|<\\/' + _mwtBlockTagsList.split("|").join(">|<\\/") 
					+ '|<br[^>]*>|<@@slb@@>)$' ;
			matcher = new RegExp(regex, 'i');

			//Walk through text line by line
			lines = text.split("\n");
			for (var i = 0; i < lines.length; i++) {
				// Prevent REDIRECT from being rendered as list.
				// Var line is only set if it is part of a wiki list
				line = lines[i].match(/^(\*|#(?!REDIRECT)|:|;)+/);
				lastLine = (i == lines.length - 1);
				//Process lines
				if (line && line !== '') { 
					// Process lines that are members of wiki lists,
					// reset the empty line count to zero as this line isn't empty
					// strip out the wiki code for the list element to leave just the text content

					lines[i] = lines[i].replace(/^(\*|#|:|;)*(\s*?)(\S.*?)$/gmi, function( match, $1, $2, $3) {//"$2");
						// $1 = wiki list coding
						// $2 = leading spaces
						// $3 = list content

//					spaces = lines[i].replace(/^(\s*?)\S.*$/gmi, "$1");
						if (line[0].match(/^(\*|#)+:$/) ) {
							// If the line starts with something like '*:' or '#:'
							// then its probably a definition description within a list.
							return continueList2html(lastList, line[0], $2 ) + $3;
						} else if (line[0].indexOf(':') === 0) {
							// If the line belongs to a definition list starting with a ':' and
							// follows the last line of a sub, omit <li> at start of line.
							if (line[0].length > lastList.length) {
								return openList2html(lastList, line[0], $2 ) + $3;
							} else if (line[0].length === lastList.length) {
								return continueList2html(lastList, line[0], $2 ) + $3;
							} else if (line[0].length < lastList.length) {//close list
								return closeList2html(lastList, line[0], $2 ) + $3;
							}
						} else {
							//else if the line doesn't belong to a definition list starting with a ':' and follows
							//the last line of a sub list, include <li> at start of line
							if (line[0].length === lastList.length) {
								return continueList2html(lastList, line[0], $2 ) + $3;
							} else if (line[0].length > lastList.length) {
								return openList2html(lastList, line[0], $2 ) + $3;
							} else if (line[0].length < lastList.length) {
								// if moving back to higher level list from a sub list then 
								// precede line with a <li> or <dl> tag depending on the type of list
								if (line[0].charAt(line[0].length - 1) === ';') {
									return closeList2html(lastList, line[0], $2 ) + '<dt class="mwt-list" data-mwt-sameLine="false" data-mwt-spaces="' + $2 + '">' + $3;
								} else {
									return closeList2html(lastList, line[0], $2 ) + '<li class="mwt-list" data-mwt-sameLine="false" data-mwt-spaces="' + $2 + '">' + $3;
								}
							}
						}
					});
					if (line[0].charAt(line[0].length - 1) === ';') {
						// if it is a definition term, check to see if line
						// contains definition and process accordingly
						lines[i] = lines[i].replace(/:(\s*)/,function(match, $1){
							line[0] = line[0].substring(0,line[0].length - 1) + ':';
							return '</dt><dd class="mwt-list" data-mwt-sameLine="true" data-mwt-spaces="' + $1 + '">';
						});
					}
					inParagraph = true;
					// set lastlist as this will be used if the next line
					// is a list line to determine if it is a sublist or not
					lastList = line[0];
				} else {
					//else process lines that are not wiki list items
					//set emptyLine if line is empty
					emptyLine = lines[i].match(/^(\s|&nbsp;)*$/);
					if (emptyLine) {
						// process empty lines
						// If not already in a paragraph (block of blank lines)
						// process first empty line differently
						if (i == 0) {
							lines[i] = lines[i] + '<br class="mwt-emptyline"/>';
						} else if (!inParagraph) {
							// if previous line was first empty line then ignore this one
							lines[i] = lines[i] + '<br class="mwt-emptyline"/>';
						} else {
							// this is already in a paragraph
							// use a dummy br as a placeholder if the previous line
							// contained an html block otherwise empty line first
							// uses matcher created outside of this loop!
							if ( lines[i-1].search(matcher) > -1 ) {
								// there is a special case where the previous line had
								// a table close with text on the same line which is
								// already closed with an empty line
								if ( lines[i-1].search(/<br class="mwt-emptyline" \/>$/) > -1 ) {
									lines[i] = lines[i] + '<@@slb@@>';
								} else {
									if ( !lastLine) { 
										lines[i] = lines[i] + '<@@slb@@><@@slb@@>';
									}
								}
							} else if (lastList.length > 0) {
								// empty line following a list
								lines[i] = lines[i] + '<@@slb@@><@@slb@@>';
							} else {
								lines[i] = lines[i] + '<br class="mwt-emptylineFirst"/>';
							}
							inParagraph = false;
						}
					} else {
						// not an empty line
						inParagraph = true;
					}
					//Test if the previous line was in a list if so close that list
					if (lastList.length > 0) {
						lines[i - 1] = lines[i - 1] + closeList2html(lastList, '');
						lastList = '';
					}
				}
			}
			//Test if the previous line was in a list then
			//we will need to close the list
			if (lastList.length > 0) {
				lines[i - 1] = lines[i - 1] + closeList2html(lastList, '');
				lastList = '';
			}
			text = lines.join('');
			return text;
		}
		// start of function to convert wiki code to html
		// save some work, if the text is empty
		if (text === '') {
			return text;
		}
		
		// wrap the text in an object and send it to event listeners
		textObject = {text: text};
		$(document).trigger('TinyMCEBeforeWikiToHtml', [textObject]);
		text = textObject.text;

		// substitute {{!}} with | if text is part of template
		if ( _pipeText == '{{!}}' ) {
			text = text.replace(/{{!}}/gmi, "|");
		}
		// normalize line endings to \n
		text = text.replace(/\r\n/gmi, "\n");
		// cleanup linebreaks in tags except comments
		text = text.replace(/(<[^!][^>]+?)(\n)([^<]+?>)/gi, "$1$3");
		//
		// The next four conversions insert html into the text which
		// may becomne corrupted by later conversions so to be safe we
		// use placeholders which gets converted back to the html at
		// the end of the conversion process
		// convert and preserve wiki switches for recovery later
		text = preserveWikiTags4Html(text);
		// convert and preserve templates for recovery later
		text = preserveTemplates4Html(text);
		// convert and preserve links and images
		text = _preserveLinks4Html(text);
		// convert and preserve invariant html tags for recovery later
		text = preserveNonWikiTags4Html(text);
		// convert single line breaks
		text = singleLinebreaks2html(text);
		// convert styles
		text = styles2html(text);
		// convert headings
		text = headings2html(text);
		// convert tables
		text = tables2html(text);
		// convert lists and empty lines
		text = listsAndEmptyLines2html(text);
		//Write back content of preserved code to placeholders.
		text = _recoverTags2html(text);
		// wrap the text in an object to send it to event listeners
		textObject = {text: text};
		$(document).trigger('TinyMCEAfterWikiToHtml', [textObject]);
		text = textObject.text;
		return text;
	}

	/*
	 * Inserts content of the clipboard when it is copied from within
	 * the TinyMCE editor.
	 *
	 * @param {dom} dom
	 * @returns {dom}
	 */
	function _internalPaste( $dom ) {
		// if pasting a copy from the TinyMCE mediwaiki editor
		// walk through the dom element by element converting the
		// html to wiki text from the leaves up to the root

		// process blocks containing parsed wiki text
		$dom.find(".mwt-wikiMagic").each( function ( a ) {
			var elm = this;
									
			if (_tags4Wiki[elm.id] == undefined ) {
				_tags4Wiki[elm.id] = htmlDecode( elm.attributes[ "data-mwt-wikitext" ].value );
			}
		});

		return $dom;
	}

	/*
	 * Inserts content of the clipboard when it is copied from outside
	 * the TinyMCE editor.
	 *
	 * @param {dom} dom
	 * @returns {dom}
	 */
	function _externalPaste( $dom ) {
		// if pasting a copy from the TinyMCE mediwaiki editor
		// walk through the dom element by element converting the
		// html to wiki text from the leaves up to the root

		$dom.find( "meta" ).replaceWith( function() {
			return '';
		});

/*		// remove styles from css style sheets injected
		// by browser when copying from rendered html
		if (( elm.attr('style') != undefined)
			&& (!_internal)) {
			
			elm.removeAttr('style');
		}*/

		$dom.find( "img" ).replaceWith( function() {
			var elm = $( this ),
				outerHtml = elm[0].innerHTML;
				
			if (elm[0].parentNode.tagName != "A") {
				outerHtml = _getWikiImageLink( elm[0] );
					elm.replaceWith( function(a) {
					return _convertWiki2Html( _getWikiImageLink( elm[0] ));
				});
			} else {
				return outerHtml;
			}
		});

		$dom.find( "a" ).replaceWith( function() {
			var elm = $( this ),
				protocol = elm[0].protocol,
				dstName = elm[0].href,
				title = elm[0].text,
				aLink;

			if (elm[0].firstElementChild && elm[0].firstElementChild.tagName == "IMG") {
				// process links to images
				aLink = _getWikiImageLink(elm[0].firstElementChild, dstName);
			} else if (protocol) {
				// process external links
				if (title) {
					dstName = dstName + ' ' + title;
				}
				aLink = '[' + dstName + ']'
			} else {
				// process internal links
				if (title) {
					dstName = dstName + '|' + title;
				}
				aLink = '[[' + dstName + ']]'
			}
			elm.replaceWith( function(a) {
				return _convertWiki2Html( aLink );
			});
		});
		
		$dom.not( "img", "a" ).addClass( "mwt-preserveHtml" );

		// convert DOM back to html text
		return $dom;
	}

	/*
	 * Converts html content of the editor window to wiki code.
	 *
	 * @param {String} text
	 * @returns {String}
	 */
	function _convertHtml2Wiki( text ) {
		var textObject;
		/*
		 * Process HTML in DOM form converting tags to placeholders for
		 * wiki text equivalents
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function processHtml2Wiki( text ) {
			var $dom;

			// preprocess text before dom walkthrough
			// the tables plugin uses thead tags to identify headers whereas
			// mediawiki uses th tags in the body of the table.  This converts between the two

			function processAttributes2Html( text ) {
				// replace any data-mwt-attr attributes with their values
				text = text.replace(/data-mwt-attr=('|")(.*?)\1/gmi, function(match, $1, $2) {
					// $1 = type of quoation mark
					// $2 = attribute string
					$2 = $2.replace(/\&amp;/gmi, '&').replace(/\&lt;/gmi, '<').replace(/\&gt;/gmi, '>');
					return $2;
				});
				// for some reason Tiny can place spurios spacess at the end of
				// table class names.  This should remove these.
				text = text.replace(/\s*class="(.*?)"/i, function (match,$1) {
					//$1 = the class name string
					return match.replace(/".*?"/i,'"' + $.trim($1) + '"');
				});
				return text;
			}

			function processElement( elm, level ) {
				var id,
					outerHtml;

				// if this is a text node type then ignore
				if ( elm[0].nodeType == 3) return;
				
				// first deal with elements that need no further processing
				if (elm.hasClass( 'mwt-wikiMagic' )) {
					// process blocks containing parsed wiki text
					elm.replaceWith( function(a) {
						// process stuff after table close on the same line
						var wikiText = htmlDecode( this.attributes[ "data-mwt-wikitext" ].value ),
//2908							id = "<@@@" + elm[0].tagName.toUpperCase() + ":" + createUniqueNumber() + "@@@>";
							id = "<@@@MAGIC:" + createUniqueNumber() + "@@@>";

						_tags4Wiki[id] = wikiText;
						return id;
					});
				} else if (elm.hasClass( 'mwt-nonBreakingSpace' )) {
					// process html entities
					elm.replaceWith( function(a) {
						return '&amp;nbsp;';
					});
				} else if (elm.hasClass( 'mwt-emptylineFirst' )) {
					// process empty line first tags
					elm.replaceWith( function(a) {
						return '<@@elf@@>';
					});
				} else if (elm.hasClass( 'mwt-emptyline' )) {
					// process additional empty line tags
					elm.replaceWith( function(a) {
						return '<@@enl@@>';
					});
				} else if (elm.hasClass( 'mwt-singleLinebreak' )) {
					// process non rendering new lines
					elm.replaceWith( function(a) {
						return '<@@snl@@>';
					});
				} else if (elm.hasClass( 'reference' )) {
					// process reference numbers
					elm.replaceWith( function(a) {
						return '';
					});
				} else {
					if ( elm.children().length > 0) {
					// process all descendents before further processing
					elm.children().each( function ( index ) {
							processElement ( $(this), level + '.' + index )
						})
					}

					if ( elm.hasClass( 'mwt-dummyReference' )) {
						// spans with class mwt-dummyRference are replaced with their innerHTML

						outerHtml = $.trim( elm[0].innerHTML );

					} else if ( elm.hasClass( 'mwt-reference' )) {
						// spans with class mwt-rference are coverted to mediawiki <ref>

						outerHtml = '<ref>' + elm[0].innerHTML + '</ref>';

					} else if ( elm[0].tagName == 'TBODY' ) {
						// tbody tags aren't recognised by mediawiki so replace with contents
						var tagNewline = '',
							tagSpaces = '';

						// set up newlines and spaces if required (for embedded html block tags)
						if (typeof elm.attr('data-mwt-sameLine') != "undefined") {
							if (elm.attr('data-mwt-sameLine') == 'false') tagNewline = '<@@bnl@@>';
						}
						if (elm.attr('data-mwt-spaces')) tagSpaces = elm.attr('data-mwt-spaces');
						outerHtml = tagNewline + tagSpaces + elm[0].innerHTML;

 					} else if ( elm.hasClass( 'mwt-preserveHtml' )) {
						// process html that is preserved in wiki text
						var outerHtml,
							tagNewline = '',
							tagSpaces = '',
							newLineAfter = '',
							id = "<@@@" + elm[0].tagName.toUpperCase() + ":" + createUniqueNumber() + "@@@>";
						// set up newlines and spaces if required (for embedded html block tags)
						if (typeof elm.attr('data-mwt-sameLine') != "undefined") {
							if (elm.attr('data-mwt-sameLine') == 'false') tagNewline = '<@@bnl@@>';
						}
						if (elm.attr('data-mwt-spaces')) tagSpaces = elm.attr('data-mwt-spaces');
						if ( elm[0].nextSibling == null ) {
//								newLineAfter = '<@@bnl@@>';
						} else if (elm[0].nextSibling.nodeName == "#text" ) {
							if (elm[0].nextSibling.textContent.match(/^\s*$/)) {
								newLineAfter = '<@@bnl@@>';
							}
						} else if ( editor.dom.isBlock( elm[0] ) ) {
								newLineAfter = '<@@bnl@@>';
						}
						elm.removeClass( 'mwt-preserveHtml' );
						elm.removeAttr( 'data-mwt-sameLine' );
						elm.removeAttr( 'data-mwt-spaces' )
						if ( elm.attr( 'class' ) == '' ) {
							elm.removeAttr( 'class' );
						}
						outerHtml = tagNewline + tagSpaces + _recoverPlaceholders2Wiki( elm[0].outerHTML ) + newLineAfter;

					} else if ( elm[0].tagName == 'IMG' ) {

						outerHtml = elm[0].innerHTML 
						if (elm[0].parentNode.tagName != "A") {
							outerHtml = _getWikiImageLink( elm[0] );
						}

					} else if ( elm[0].tagName == 'A' ) {
						var aLink,
							protocol = elm[0].protocol,
							dstName = elm[0].href,
							title = elm[0].text;

						if (elm[0].firstElementChild && elm[0].firstElementChild.tagName == "IMG") {
							// process links to images
							aLink = _getWikiImageLink(elm[0].firstElementChild, dstName);
						} else if (protocol) {
							// process external links
							if (title) {
								dstName = dstName + ' ' + title;
							}
							aLink = '[' + dstName + ']'
						} else {
							// process internal links
							if (title) {
								dstName = dstName + '|' + title;
							}
							aLink = '[[' + dstName + ']]'
						}

						outerHtml = aLink;

					} else if ( elm[0].tagName == 'BR' ) {
						// remove 'bogus' br tags inserted by the editor

						outerHtml = elm[0].innerHTML 
						if ( elm.attr('data-mce-bogus') == 1 ) {
							outerHtml = '';
						}

					} else if (( elm[0].tagName == 'LI' )
							|| ( elm[0].tagName == 'DD' )
							|| ( elm[0].tagName == 'DT' )
							) {
						// process list elements
						var parents = elm.parents("ul,ol,dl,dd"),
							listTag = '',
							html = '',
							outerHTML,
							tagNewline = '',
							newLineAfter = '<@@bnl@@>',
							tagSpaces = '',
							id = "<@@@P" + elm[0].tagName.toUpperCase() + ":" + createUniqueNumber() + "@@@>";

						// if this is a table in a definition then remove
						// the new line before the table
						// if this item isn't empty (eg starts with a block new line
						if ( !elm[0].classList.contains( 'mwt-preserveHtml' )) {
							// case where tag inserted in TinyMCE editor
							var temp = elm[0].innerHTML;
							if ( !elm[0].innerHTML.match(/^&lt;@@@(LI|DD):/) ) {
								// build the wiki text list tag
								for (var i = parents.length - 1; i >= 0; i--) {
									if ( !parents[i].classList.contains( 'mwt-preserveHtml' )) {
										if ( parents[i].tagName == "UL" ) {
											listTag = listTag + '*';
										} else if ( parents[i].tagName == "OL" ) {
											listTag = listTag + '#';
										} else if ( parents[i].tagName == "DL" ) {
											if ( elm[0].tagName == 'DD' ) {
												if ( elm.attr('data-mwt-sameLine') == 'true' ) {
													listTag = listTag + ' :';
													// if dd is inline then skip further processing;
													i = 0;
												} else {
													listTag = listTag + ':';
												}
											} else if ( elm[0].tagName == 'DT' ) {
												listTag = listTag + ';';
											}
										} else if ( parents[i].tagName == "DD" ) {
											// nested in a dd so  prefix tag with :
											listTag =  ':' + listTag;
											if ( i > 0 ) {
												if ( parents[ i - 1 ].tagName == "DL" ) {
													// skip the dl tag
													i = i - 1;
												}
											}
										}
									}
								}
								// in the case of a DT only, it can be followed by a DD
								// on te same line so in that case don't put a new line after
								if ( elm[0].tagName != 'DT' ) {
								} else if ( elm[0].nextSibling == null ) {
								} else if ( elm[0].nextSibling.tagName != 'DD' ) {
								} else if ( elm[0].nextSibling.attributes['data-mwt-sameLine'] == undefined ) {
								} else if ( elm[0].nextSibling.attributes['data-mwt-sameLine'].value != 'false' ) {
									newLineAfter = ''
								}

								if ( typeof elm.attr('data-mwt-sameLine') == "undefined" ) {
									if ( elm[0].previousSibling == null ) {
										tagNewline = '<@@nl@@>';
									} else {
										tagNewline = '<@@bnl@@>';										
									}
								} else {
									if ( elm.attr('data-mwt-sameLine') == 'false' ) tagNewline = '<@@bnl@@>';
								}

								if ( elm.attr('data-mwt-spaces')) tagSpaces = elm.attr('data-mwt-spaces') ;
								html = tagNewline + listTag + tagSpaces + elm[0].innerHTML + newLineAfter;
							} else {
								// ignore empty list items
								html = elm[0].innerHTML;
							}
							outerHtml = html; 
						} else {
							// case where tag is being pasted from somewhere else
							outerHtml = elm[0].outerHTML;
						}
					} else if (( elm[0].tagName == 'OL')
							|| (elm[0].tagName == 'UL')
							|| (elm[0].tagName == 'DL')
							) {
						var innerHtml = elm[0].innerHTML;
						// replace ul and ol and dl tags with their contents
						// as they don't exist in wiki text separately to list items

						// if no children of type list then this is a wiki list
						// so just return the innerHtml
						if ( !innerHtml.match(/^s*?<@@@(PLI|PDD):/)) {
							elm.replaceWith( function(a) {
								return innerHtml;
							});
							return;
						} else {
							// case where tag is being pasted from somewhere else
							outerHtml = elm[0].outerHTML;
						}

					} else if (elm.hasClass( 'mwt-heading' )) {
						// process headings
						var headingMarkup = '======',
							text = elm[0].innerText,
							hLevel = elm[0].tagName.substring(1),
							spacesBefore = elm[0].getAttribute("data-mwt-headingSpacesBefore"),
							spacesAfter = elm[0].getAttribute("data-mwt-headingSpacesAfter"),
							newlines = elm[0].getAttribute("data-mwt-headingNewLines"),
							altro = headingMarkup.substring(0, hLevel),
							heading;
						// build the header, including any spaces before the header text
						heading = altro + spacesBefore + text + spacesAfter + altro ;
						heading = '<@@hnl@@>' + heading + '<@@hnl@@>';
						// build back any new lines after the heading
						for (var i = 0; i < newlines; i++) {
							heading += '<@@nl@@>';
						}
						outerHtml = heading;

					} else if ( elm[0].tagName == 'TABLE' ) {
						// now process code at start and end of tables.  Note the new line handling for these
						// happens when all the other new line codes are processed in newLines2wiki
						var parents = elm.parents( "table" ),
							outerHtml = elm[0].outerHTML,
							newLineBefore = '<@@tnl@@>';
							newLineAfter = '<@@tnl@@>';
							id = "<@@@" + elm[0].tagName.toUpperCase() + ":" + createUniqueNumber() + "@@@>";
						// if the table is in a definition item then don't place a new line before it
						if ( elm[0].parentElement.tagName.toUpperCase() == 'DD' ) {
							newLineBefore = '';
						}

						outerHtml = outerHtml.replace(/^<table([^>]*)>([^<]*)<\/table>$/i, function (match, $1, $2) {
							// $1 = any attributes contained in the tag
							// $2 = content of the tag
							var newLines = '';
							// process the empty lines at the start of the table
							$1 = $1.replace(/\s*data-mwt-tablestartnewlines="(\d)"/gmi, function (match,$1) {
								//$1 = number of new lines following the opening code of table
								for ( var i = 1 ; i < $1 ; i++ ) {
									newLines += "<@@tnl@@>";
								}
								return '';
							});

							// process other attributes
							$1 = processAttributes2Html( $1 );
							// if this table is nested in another or there is text on
							// the same line as the table closure, then no new line after
							if ( elm[0].nextSibling != null ) {
								if ( elm[0].nextSibling.className != undefined ) {
									if ( elm[0].nextSibling.className.indexOf( 'mwt-closeTable' ) > -1 ) {
										newLineAfter = '';
									}
								}
							}
							if ( parents.length >= 1 ) {
								newLineAfter = '';
							}
							return newLineBefore + "{" + _pipeText + $1 + newLines + $2 + "<@@tnl@@>" + _pipeText + "}" + newLineAfter;
						});

					} else if ( elm[0].tagName == 'CAPTION' ) {
						// process table captions
						var outerHtml = elm[0].outerHTML,
							id = "<@@@" + elm[0].tagName.toUpperCase() + ":" + createUniqueNumber() + "@@@>";
						outerHtml = outerHtml.replace(/^<caption([^>]*)>([^<]*)<\/caption>$/i, function(match, $1, $2) {
							// check to see if there are attributes.  If there are, place these
							// before the a pipe in the caption line
							// $1 = attributes of the tag
							// $2 = content of the tag
							// process other attributes
							$1 = processAttributes2Html( $1 );
							if ($1) {
								return "<@@tnl@@>" + _pipeText + "+" + $1 + _pipeText + $2;
							} else {
								return "<@@tnl@@>" + _pipeText + "+" + $2;
							}
						});

					} else if ( elm[0].tagName == 'TR' ) {
						// process table rows
						var outerHtml = elm[0].outerHTML,
							id = "<@@@" + elm[0].tagName.toUpperCase() + ":" + createUniqueNumber() + "@@@>";
						outerHtml = outerHtml.replace(/^<tr([^>]*)>([^<]*)<\/tr>$/i, function(match, $1, $2) {
							// $1 = attributes of tag
							// $2 = content of the tag
							if ($1.match(/mwt-silentTr/gmi)) {
								// silent TRs aren't rendered in wikicode
								return $2;
							}
							if ($1.match(/^\s*$/gmi)) {
								// attributes string that is just spaces should be made empty
								$1 = '';
							}
							// process other attributes
							$1 = processAttributes2Html( $1 );
							return "<@@tnl@@>" + _pipeText + "-" + $1 + $2;
						});

					} else if ( elm[0].tagName == 'TH' ) {
						// process table headings
						var outerHtml = elm[0].outerHTML,
							id = "<@@@" + elm[0].tagName.toUpperCase() + ":" + createUniqueNumber() + "@@@>";
						outerHtml = outerHtml.replace(/\n?<th([^>]*)>(\s*)([^<]*?)(\s*)<\/th>$/i, function (match, $1, $2, $3, $4 ) {
							// $1 = any html attributes of the header
							// $2 = spaces before content of the tag
							// $3 = content of the tag
							// $4 = spaces at end of content of the tag
							var cellPipeText = '!',
								cellNewLine = '<@@tnl@@>',
								cellEmptyLineFirst = '';

							$1 = $1.replace(/ data-mwt-wikiPipe\="(.*?)"/gmi, function (match, $1) {
								if ($1 == '!!') {
									cellPipeText += cellPipeText;
									if ( $4 == '' ) cellPipeText = ' ' + cellPipeText;
								}
								return "";
							});

							$1 = $1.replace(/ data-mwt-cellInline\="(.*?)"/gmi, function (match, $1) {
								if ($1 == 'true') {
									cellNewLine = "";
								} else {
									cellNewLine = "<@@tnl@@>";
								}
								return "";
							});

							$1 = $1.replace(/ data-mwt-cellEmptyLineFirst\=("|')(.*?)\1/gmi, function (match, $1, $2) {
								// $1 = type of quotation mark
								// $2 = the value of the parameter
								if ($2 == 'false') {
									cellEmptyLineFirst = "";
								} else {
									cellEmptyLineFirst = "<@@tnl@@>";
								}
								return "";
							});

							// process other attributes
							$1 = processAttributes2Html( $1 );

							// always have at least one space before cell content
							if ($2 == '' ) $2 = ' ';

							if ($1) {
								return cellNewLine + cellPipeText + $1 + ' ' + _pipeText + cellEmptyLineFirst + $2 + $3;
							} else {
								return cellNewLine + cellPipeText + cellEmptyLineFirst + $2 + $3;
							}
						});

					} else if ( elm[0].tagName == 'TD' ) {
						// process table cells
						var outerHtml,
							innerHtml = elm[0].innerHTML,
							id = "<@@@" + elm[0].tagName.toUpperCase() + ":" + createUniqueNumber() + "@@@>";
							
						innerHtml = innerHtml.replace(/^(\s*)&nbsp;(\s*)$/, '$1$2');
						elm.prop( "innerHTML", innerHtml );
						
						outerHtml = elm[0].outerHTML;
						outerHtml = outerHtml.replace(/^<td([^>]*?)>(\s*)([^<]*?)<\/td>$/i, function (match, $1, $2, $3 ) {
							// $1 = any attributes associated with the cell
							// $2 = spaces before content of the tag
							// $3 = content of the tag
							var cellPipeText = _pipeText,
								cellNewLine = '<@@tnl@@>',
								cellEmptyLineFirst = '';

							// process the pipe text
							$1 = $1.replace(/ data-mwt-wikiPipe\="(.*?)"/gmi, function (match, $1) {
								if ($1 == '||') {
									cellPipeText += _pipeText;
								}
								return "";
							});

							// process if inline or not
							$1 = $1.replace(/ data-mwt-cellInline\="(.*?)"/gmi, function (match, $1) {
								if ($1 == 'true') {
									cellNewLine = "";
								} else {
									cellNewLine = "<@@tnl@@>";
								}
								return "";
							});

							$1 = $1.replace(/ data-mwt-cellEmptyLineFirst\=("|')(.*?)\1/gmi, function (match, $1, $2) {
								// $1 = type of quotation mark
								// $2 = the value of the parameter
								if ($2 == 'false') {
									cellEmptyLineFirst = "";
								} else {
									cellEmptyLineFirst = "<@@tnl@@>";
								}
								return "";
							});

							// process other attributes
							$1 = processAttributes2Html( $1 );

							// always have at least one space before cell content
							if ($2 == '' ) $2 = ' ';

							if ($1) {
								return cellNewLine + cellPipeText + $1 + ' ' + _pipeText + cellEmptyLineFirst + $2 + $3;
							} else {
								return cellNewLine + cellPipeText + cellEmptyLineFirst + $2 + $3;
							}
						});

					} else if (elm.hasClass( 'mwt-closeTable' )) {
						// process stuff after table close on the same line
						var outerHtml = elm[0].outerHTML,
							innerHtml = elm[0].innerHTML,
							id = "<@@@" + elm[0].tagName.toUpperCase() + ":" + createUniqueNumber() + "@@@>",
							tableClose = '';

						outerHtml = outerHtml.replace(/mwt-spaces="(.*?)"/gi,
							function(match, $1, $2, $3) {
								// $1 = spaces following close table on the same line
								// $2 = text following close table on the same line

								innerHtml = $1 + innerHtml;

								return '';
						});

						outerHtml = innerHtml;

					} else if ( elm[0].tagName == 'STRONG' ) {
						// process strong text

						outerHtml = elm[0].outerHTML;

						outerHtml = outerHtml.replace(/<strong>(.*?)<\/strong>/gmi, "'''$1'''");

					} else if ( elm[0].tagName == 'B' ) {
						// process strong text
						outerHtml = elm[0].outerHTML;
						outerHtml = outerHtml.replace(/<b>(.*?)<\/b>/gmi, "'''$1'''");

					} else if ( elm[0].tagName == 'EM' ) {
						// process strong text
						var outerHtml = elm[0].outerHTML,
							innerHtml =  elm[0].innerHTML;
						// TinyMCE copy/cut sometimes nests EMs in EMs so fix here for paste
						if (elm[0].parentNode.tagName == "EM") {
							outerHtml = innerHtml;
						} else {
							outerHtml = outerHtml.replace(/<em>(.*?)<\/em>/gmi, "''$1''");
						}

					} else if ( elm[0].tagName == 'I' ) {
						// process strong text
						var outerHtml = elm[0].outerHTML;
						outerHtml = outerHtml.replace(/<i>(.*?)<\/i>/gmi, "''$1''");

					} else if ( elm[0].tagName == 'STRIKE' ) {
					// process strong text
						var outerHtml = elm[0].outerHTML;
						outerHtml = outerHtml.replace(/<strike>(.*?)<\/strike>/gi, "<s>$1</s>");

					} else if ( elm[0].tagName == 'P' ) {
						var html,
							outerHtml = elm[0].outerHTML,
							id = "<@@@" + elm[0].tagName.toUpperCase() + ":" + createUniqueNumber() + "@@@>";

						if (elm.hasClass( 'mwt-paragraph' )) {
							// if copying from TinyMCE process 'p' tags 
							// (including forced root blocks) by adding new lines
							outerHtml  = '<@@pnl@@>' + elm.html();
						}

					} else if ( elm[0].tagName == 'DIV' ) {
						var html,
							outerHtml = elm[0].outerHTML,
							id = "<@@@" + elm[0].tagName.toUpperCase() + ":" + createUniqueNumber() + "@@@>";

						if (elm.hasClass( 'mwt-paragraph' )) {
							// if copying from TinyMCE process 'div' tags 
							outerHtml  = elm.html();
						}

					} else {
						// treat everything else as preserved html
							outerHtml = elm[0].outerHTML;	
					}
					// create and store a place holder for the converted element
					id = "<@@@" + elm[0].tagName.toUpperCase() + ":" + createUniqueNumber() + "@@@>";
					_tags4Wiki[id] = outerHtml;
					elm.replaceWith( function(a) {
						return id;
					});
				}
			};

			// convert html text to DOM
			$dom = $( "<div id='tinywrapper'>" + text + "</div>", "text/xml" );
			text = htmlDecode ($dom[0].innerHTML);

			// walk through the dom element by element converting the
			// html to wiki text from the leaves up to the root

			// process blocks containing parsed wiki text
			processElement ( $dom, '0' );

			// convert DOM back to html text
			text = htmlDecode ($dom[0].innerHTML);

			// remove any unwanted attributes
			text = text.replace(/data-mce-[^=]*?=\s*("|')[^\1]*?\1\s*/gmi, '');
			text = text.replace(/data-mwt-[^=]*?=\s*("|')[^\1]*?\1\s*/gmi, '');

			// remove non-breaking space after ||
			text = text.replace(/\|\|&nbsp;/gi, _pipeText + _pipeText);

			// clean up newline before images
			// do it here before placeholders are converted back
			text = text.replace(/<@@pnl@@>(<@@@IMAGE:)/gmi, '$1');
			return text;
		}
		/**
		 * replaces placeholders with their wiki code equivalent
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function recoverTags2Wiki(text) {
			if (_tags4Wiki){
				while (text.match(/\<@@@.*?:\d*@@@>/)) {
					text = text.replace(/(\<@@@.*?:\d*@@@>)/gi, function(match, $1, offset, text) {

						// replace '&amp;amp;' with '&amp;' as we double escaped these when they were converted
//						return _tags4Wiki[$1].replace(/&amp;amp;/gmi,'&amp;');
						// '&amp;' is processed by the wiki don and turned into '&'
						// so we subsitue it with a placeholder which will be replaced later
						if ( _tags4Wiki[$1] != undefined) {
							return _tags4Wiki[$1].replace(/&amp;/gmi,'{{{{@@@@}}}}').replace(/&gt;/gmi,'>').replace(/&lt;/gmi,'<');
						} else {
							return '### ' + $1.replace(/>/gmi,'&gt;').replace(/</gmi,'&lt;') + ' not found ###';;
						}
					});
				}
			}
			return text;
		}
		/**
		 * this rationalises all the different new line placeholders to '\n's
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function newLines2wiki (text) {
			var regex,
				findText;
			// process single new lines bracketed by block new lines
			text = text.replace(/(<@@[epbht]nl@@>)*(\s*<@@snl@@>\s*)/gmi, "$2");
			text = text.replace(/(\s*<@@snl@@>\s*)(<@@[pbht]nl@@>)*/gmi, function(match, $1, $2, $3, $4) {
				return $1;
			});
			// process empty lines bracketed by block new lines
			text = text.replace(/(<@@[pbht]nl@@>)?((\s*<@@(enl|elf)?@@>\s*)+)(<@@[pbht]nl@@>)?/gmi, "$2");
			// replace remaining br_emptyline_first with 2 new lines
			text = text.replace(/\n?<@@elf@@>/gmi, "<@@2nl@@>");
			// replace br_emptyline with a single new line
			text = text.replace(/\n?<@@enl@@>/gmi, "<@@nl@@>");
			// respect the &nbsp
			text = text.replace(/<@@bnl@@>(&nbsp;)/gmi, "$1");
			// one or more forced new lines for blocks at the start of the page
			// should be removed
			text = text.replace(/^(<@@[pbht]nl@@>)*/gmi, "");
			// where two or more blocks are adjacent we only need one new line
			text = text.replace(/(<@@[pbht]nl@@>\s*)+<@@[pbht]nl@@>/gmi, "<@@nl@@>");
			// where one or two new lines are followed or preceded by
			// a header/block/table new line then remove it
			text = text.replace(/<@@2nl@@><@@[pbht]nl@@>/gmi, "<@@2nl@@>");
			text = text.replace(/<@@[pbht]nl@@><@@2nl@@>/gmi, "<@@2nl@@>");
			text = text.replace(/<@@hnl@@><@@nl@@>/gmi, "<@@nl@@>");
			text = text.replace(/<@@nl@@><@@[pbht]nl@@>/gmi, "<@@nl@@>");
			// rationalise forced new lines for blocks at start and end of table cells
			text = text.replace(/((<@@tnl@@>)?\|{1,2}\s*)<@@[bh]nl@@>/gmi, "$1");
			text = text.replace(/<@@[bh]nl@@>((<@@tnl@@>)?\|{1,2}\s*)/gmi, "$1");
			// clean up newline before tables in definitions
			text = text.replace(/<@@pnl@@>:{/gmi, '<@@bnl@@>:{');
			// otherwise replace forced 'p' placeholder with single new line
			text = text.replace(/<@@pnl@@>/gmi, "<@@2nl@@>");
			// otherwise replace forced new line placeholder with single new line
			text = text.replace(/<@@[bht]nl@@>/gmi, "<@@nl@@>");
			// replace br_singlelinebreak with single new line
			text = text.replace(/<@@snl@@>/gmi, "<@@nl@@>");
			// replace the remaining placeholders with wiki code
			text = text.replace(/<@@br@@>/gmi, "<br />");
			text = text.replace(/<@@2nl@@>/gmi, "\n\n");
			text = text.replace(/<@@nl@@>/gmi, "\n");
			// tidy up end of lists(this is an assumption)
			// note: [^\S\r\n] matches whitespace without new lines
			text = text.replace(/(<\/li>)([^\S\r\n]*<\/[uo]l>)/gi, "$1\n$2");
			text = text.replace(/(<\/[uo]l>)([^\S\r\n]*<\/[uo]l>)/gi, "$1\n$2");
			// tidy up tables row ends(this is an assumption)
			text = text.replace(/(<\/t[hd]>)([^\S\r\n]*<\/tr>)/gmi, "$1\n$2");
			text = text.replace(/(<\/tr>)([^\S\r\n]*<\/table>)/gmi, "$1\n$2");
			//remove any empty <p> blocks, these are spurious anyway
			text = text.replace(/<p><\/p>/gmi, "");
			return text;
		}

		// save some work
		if ( text === '' ) return text;

		// wrap the text in an object to send it to event listeners
		textObject = {text: text};
		$(document).trigger('TinyMCEBeforeHtmlToWiki', [textObject]);
		text = textObject.text;

		// preprocess tags in html using placeholders where needed
		text = processHtml2Wiki(text);

		//recover special tags to wiki code from placeholders
		text = recoverTags2Wiki(text);

		// recover all the new lines to the text
		text = newLines2wiki (text);

		// finally substitute | with {{!}} if text is part of template
		if ( _pipeText == '{{!}}' ) {
			text = text.replace(/\|/gmi, "{{!}}");
		}

		// clean up empty space at end of text
		text = text.trimRight();

		// wrap the text in an object to send it to event listeners
		textObject = {text: text};
		$(document).trigger('TinyMCEAfterHtmlToWiki', [textObject]);
		text = textObject.text;

		// because _ is called recusrsively we get a problem that
		// html entities of form &xxx; get over converted so we used a
		// placeholder to prevent this.  The next line reverse this

		text = text.replace(/{{{{@@@@}}}}/gmi,"&");
		return text;
	}


	/**
	 * Event handler for "onChange"
	 * @param {tinymce.ContentEvent} e
	 */
	function _onChange(e) {
//debugger;
	}

	/**
	 * Event handler for "beforeSetContent"
	 * This is used to process the wiki code into html.
	 * @param {tinymce.ContentEvent} e
	 */
	function _onBeforeSetContent(e) {
		// if raw format is requested, this is usually for internal issues like
		// undo/redo. So no additional processing should occur. Default is 'html'
debugger;
		if (e.format == 'raw' ) {
			return;
		}

		// if this is the initial load of the editor
		// tell it to convert wiki text to html
		if (e.initial == true) {
			e.convert2html = true;
		}
		
		// for seome reason _showPlaceholders won't be picked up so set it here again!
		_showPlaceholders = editor.getParam("showPlaceholders");
		_placeholderClass = _showPlaceholders ? "mwt-showPlaceholder" : "mwt-hidePlaceholder";

		// if this is a new reference then ensure placeholder is displayed
		if ( e.newRef != undefined ) {
			if ( e.newRef == true ) {
				_placeholderClass = "mwt-showPlaceholder";
			}
		}

		// set format to raw so that the Tiny parser won't rationalise the html
		e.format = 'raw';

		// if the content is wikitext then convert to html
		if ( e.convert2html ) {
			e.content = _convertWiki2Html(e.content);
		}
		if ( e.initial ) {
			e.content = '<div class="mwt-paragraph">' + e.content + '</div>';
		}
		return;
	}

	/**
	 * Event handler for "onSetContent".
	 * This is currently not used.
	 * @param {tinymce.SetContentEvent} e
	 */
	function _onSetContent(e) {
debugger;
		return;
	}
	/**
	 * Event handler for "beforeGetContent".
	 * This is used to ensure TintMCE process the content as 'raw' html.
	 * @param {tinymce.ContentEvent} e
	 */
	function _onBeforeGetContent(e) {
		// generally we want to get the content of the editor
		// unaltered by any html rationalisation!!!
debugger;
			e.format = 'raw';
		return;
	}
	/**
	 * Event handler for "getContent".
	 * This is used to process html into wiki code.
	 * @param {tinymce.ContentEvent} e
	 */
	function _onGetContent(e) {
		var text;
		text = e.content;
debugger;
		if (e.save == true) {
			e.convert2wiki = true;
		}
		if (e.convert2wiki) {
			text = _convertHtml2Wiki( text );
			e.convert2wiki = false;
		} else {
			// if we are just retrieving the html, for example for CodeMirror,
			// we may have to tidy up some of the 'rationalisation' that
			// TinyMCE makes to the html, mainly as a result of forcing root blocks
			text = text.replace(/<br class="mwt-emptylineFirst"><\/p>/gm,"</p>");
		}
		e.content = text;
		return;
	}

	/**
	 * Event handler for "loadContent".
	 * This is currently not used.
	 * @param {tinymce.LoadContentEvent} e
	 */
	function _onLoadContent(e) {
debugger;
		return;
	}

	/**
	 * Event handler for "drop"
	 * Add function for processing when drag/dropping items.
	 * @param {tinymce.DropEvent} e
	 */
	function _onDrop(e) {
debugger;
		return;
	}

	/**
	 * Event handler for "onPastePreProcess"
	 * Add function for processing when drag/dropping items.
	 * @param {tinymce.DropEvent} e
	 */
	function _onPastePreProcess(e) {
		// if this is html then covert to wiki and back so it displays correctly
		var text,
			textObject;
debugger;
		text = e.content,

		// wrap the text in an object and send it to event listeners
		textObject = {text: text};
		$(document).trigger('TinyMCEBeforePastePreProcess', [textObject]);
		text = textObject.text;
		
		// wrap the text in an object and send it to event listeners
		textObject = {text: text};
		$(document).trigger('TinyMCEAfterPastePreProcess', [textObject]);
		text = textObject.text;

		e.content = text;
	}

	/**
	 * Event handler for "onPastePreProcess"
	 * Add function for processing when drag/dropping items.
	 * @param {tinymce.DropEvent} e
	 */
	function _onPastePostProcess(e) {
		// check if this is the content of a drag/drop event
		// if it is then no need to convert wiki to html
debugger;
		var text,
			$dom;

		$dom = $(e.node);

		if ( e.internal ) {
			_internalPaste( $dom );
		} else {
			_externalPaste( $dom );
		}
		// upload any images in the dropped content before continuing with paste
//1408		e.node = _uploadImages(editor, $dom);

	}

	/**
	 * Event handler for "dblclick"
	 * Add function for processing when double clicking items.
	 * @param {tinymce.DblclickEvent} e
	 */
	function _onDblClick(evt) {
		var ed = editor,
		selectedNode,
		targetFound = false;

		var onDblClickLaunch = function ( editor, aTarget, aClass, aCommand) {
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

		if ( onDblClickLaunch ( editor, evt.target, "mwt-image", "wikiupload" )) {
			return;
		} else if ( onDblClickLaunch ( editor, evt.target, "mwt-internallink", "wikilink" )) {
			return;
		} else if ( onDblClickLaunch ( editor, evt.target, "mwt-externallink", "wikilink" )) {
			return;
		} else if ( onDblClickLaunch ( editor, evt.target, "mwt-wikiMagic", "wikitextEditor" )) {
			return;
		}
		
		return;
	}

	/**
	 * Event handler for "onKeyDown"
	 * Add function for processing when using down or up arrow in
	 * the bottom or top rows, to add a new paragraph.
	 *
	 * @param {tinymce.onKeyDownEvent} e
	 */	
	function _onKeyDown(evt) {
		if (( evt.keyCode == 38 ) || ( evt.keyCode == 40 )) {
			// up-arrow or down arrow at start or end of editor
			// content results in an empty paragraph being added
			var cursorLocation = getCursorOffset();

			_cursorOnDown = cursorLocation.cursor;
			_cursorOnDownPreviousNode = cursorLocation.previousNode;
			_cursorOnDownNextNode = cursorLocation.nextNode;
		}
	};

	/**
	 * Event handler for "onKeyUp"
	 * Add function for processing when using down or up arrow in
	 * the bottom or top rows, to add a new paragraph.
	 *
	 * @param {tinymce.onKeyUpEvent} e
	 */	
	function _onKeyUp(evt) {
		if ( evt.keyCode == 38 ) {
			var cursorLocation = getCursorOffset();

			_cursorOnUp = cursorLocation.cursor;
			_cursorOnUpPreviousNode = cursorLocation.previousNode;

			if ( _cursorOnDown == _cursorOnUp) {
				// cursor didn't move
				if ( !_cursorOnDownPreviousNode ) {
					// there is no previous nodes
					if ( _cursorOnDown == 0) {
						// we are already at start of text
						var el = editor.dom.create( 'p', { 'class' : 'mwt-paragraph' }, '<br class="mwt-emptyline"/>' );
						editor.getBody().insertBefore(el, editor.getBody().firstChild);
						editor.selection.setCursorLocation();
					} else {
						// edge will not place cursor at start of text automatically
						// so we make sure here
						editor.selection.setCursorLocation();
					}
				}
			}
		} else if ( evt.keyCode == 40 ) {
			var range,
				ftxt,
				cursorLocation = getCursorOffset();

			_cursorOnUp = cursorLocation.cursor;
			_cursorOnUpNextNode = cursorLocation.nextNode;
			var range = editor.selection.getRng();
			editor.selection.select(tinyMCE.activeEditor.getBody(), true);
			var ftxt = editor.selection.getRng().toString().length;
			editor.selection.setRng( range );
			if ( _cursorOnDown >= _cursorOnUp ) 
				// the cursor din't move forward
				if ( !_cursorOnDownNextNode ) {
					// there are no more nodes
					if (_cursorOnUp >= ftxt ) {
						// we're already at the end of the text
						var el = editor.dom.create( 'p', { 'class' : 'mwt-paragraph' }, '<br class="mwt-emptyline"/>' );
						$(el).insertAfter(editor.getBody().lastChild);;
						editor.selection.select( el );
						editor.selection.collapse();
					} else {
						editor.selection.select( editor.getBody(), true );
						editor.selection.collapse();
					}
			}
		}
	};

function wikiparser( editor ) {
	/**
	 * Initialise editor function
	 * Defines event handlers.
	 *
	 * @param {array} ed = the instance of the editor
	 * @param {string} url = the url of this tinyMCE plugin
	 * @returns {String}
	 */
	this.init = function(ed, url) {
		//
		// set up functions that respond to events
		//
		editor.on('loadContent', _onLoadContent);
		editor.on('change', _onChange);
		editor.on('beforeSetContent', _onBeforeSetContent);
		editor.on('setContent', _onSetContent);
		editor.on('beforeGetContent', _onBeforeGetContent);
		editor.on('getContent', _onGetContent);
		editor.on('drop', _onDrop);
		editor.on('pastePreProcess', _onPastePreProcess);
		editor.on('pastePostProcess', _onPastePostProcess);
		editor.on('dblclick', _onDblClick);
		editor.on('keydown', _onKeyDown);
		editor.on('keyup', _onKeyUp);

		//
		// add processing for browser context menu
		//
		editor.ui.registry.addButton('browsercontextmenu', {
			icon: 'info',
			tooltip: mw.msg( 'tinymce-browsercontextmenu' ),
			onAction:  function(e) {
				editor.focus();
				editor.windowManager.confirm(mw.msg( 'tinymce-browsercontextmenu' ), function(state) {
					if (state) {
						editor.off('contextmenu');
					}
				});
			}
		});
		editor.ui.registry.addMenuItem('browsercontextmenu', {
			icon: 'info',
			text: mw.msg('tinymce-browsercontextmenu-title'),
			tooltip: mw.msg( 'tinymce-browsercontextmenu' ),
			context: 'insert',
			onAction: function(e) {
				editor.focus();
				editor.windowManager.confirm(mw.msg( 'tinymce-browsercontextmenu' ), function(state) {
					if (state) {
						editor.off('contextmenu');
					}
				});
			}
		});
		//
		// add processing for inserting empty <p> block before or after curent block
		//
		editor.shortcuts.add('meta+' + 13, 'empty paragraph after this block', function (a) {
			var el = ed.dom.create('p', {'class' : 'mwt-paragraph'}, '<br>');
			editor.dom.insertAfter( el, editor.selection.getNode() );
			editor.selection.setCursorLocation( el );
		});
		editor.shortcuts.add('access+' + 13, 'empty paragraph before this block', function (a) {
			var el = ed.dom.create('p', {'class' : 'mwt-paragraph'}, '<br>');
			$(el).insertBefore( editor.selection.getNode() );
			editor.selection.setCursorLocation( el );
		});
		//
		// setup MW TinyMCE macros - these are defined in localSettings.php
		//
		var templates = editor.getParam("tinyMCETemplates"),
			templateItems = [];
		if ( Array.isArray( templates )) {
			templates.forEach( function( template ) {
				templateItems.push({
					title: template['title'],
					description: template['description'],
					content: htmlDecode ( template['content'] ),
				});
			});
		}
		editor.settings['templates'] = templateItems;
	//
	// setup minimising menubar when field not selected in pageforms
	//
	var minimizeOnBlur = $(editor.getElement()).hasClass( 'mceMinimizeOnBlur' );
		if ( minimizeOnBlur ) {
			editor.on('focus', function(e) {
				var mcePane = $("textarea#" + e.target.id).prev();
				mcePane.find(".tox-toolbar__primary").css("height", "");
				mcePane.find(".tox-toolbar__primary .tox-flow-layout").show("medium");

			});
			editor.on('blur', function(e) {
				var mcePane = $("textarea#" + e.target.id).prev();
				// Keep a little sliver of the toolbar so that users see it.
				mcePane.find(".tox-toolbar__primary").css("height", "10px");
				mcePane.find(".tox-toolbar__primary .tox-flow-layout").hide("medium");
			});
		}
	};
	this.getInfo = function() {
		var info = {
			longname: 'TinyMCE WikiCode Parser',
			author: 'Hallo Welt! GmbH, Duncan Crane at Aoxomoxoa Limited & Yaron Koren at Wikiworks',
			authorurl: 'http://www.hallowelt.biz, https://www.aoxomoxoa.co.uk, https://wikiworks.com/',
			infourl: 'http://www.hallowelt.biz, https://www.aoxomoxoa.co.uk, https://wikiworks.com/'
		};
		return info;
	};
};

	pluginManager.add('wikiparser', wikiparser);

}(window));
