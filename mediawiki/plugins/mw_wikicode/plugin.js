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

var MwWikiCode = function() {

	"use strict";

	/**
	 *
	 * definition of variables used 
	 * globally in this plugin
	 * @type Array
	 */
	var
		/**
		 * global variable that contains the editor instance
		 * @type TinyMCE
		 */
		_ed = tinymce.activeEditor,
		/**
		 *
		 * Points to the mediawiki API for this wiki
		 * @type String
		 */
		_mwtWikiApi = _ed.getParam("wiki_api_path"),
		/**
		 *
		 * Points to the title of the mediawiki page to be accessed by API
		 * @type String
		 */
		_mwtPageTitle = _ed.getParam("wiki_page_mwtPageTitle"),
		/**
		 *
		 * allowable url protocols defined in wiki
		 * @type Array
		 */
		_mwtUrlProtocols = _ed.getParam("wiki_url_protocols"),
		/**
		 *
		 * allowable namespace ID's, defined by wiki
		 * @type Array
		 */
		_mwtNamespaces = _ed.getParam("wiki_namespaces"),
		/**
		 *
		 * local name of the 'file' namespace
		 * @type Array
		 */
		_mwtFileNamespace = _ed.getParam("wiki_fileNamespace"),
		/**
		 *
		 * allowable extension tags, defined by wiki
		 * @type Array
		 */
		_mwtExtensionTagsList = _ed.getParam("wiki_extension_tags_list"),
		/**
		 *
		 * allowable tags html tags, defined in MW_tinymce.js
		 * @type Array
		 */
		_mwtPreservedTagsList = _ed.getParam("wiki_preserved_tags_list"),
		/**
		 *
		 * allowable tags that form html blocks, defined in MW_tinymce.js
		 * @type Array
		 */
		_mwtBlockTagsList = _ed.getParam("wiki_block_tags"),
		/**
		 *
		 * allowable tags that are processed identically by mediawiki
		 * and html bowser, defined in MW_tinymce.js
		 * @type Array
		 */
		_mwtInvariantTagsList = _ed.getParam("wiki_invariant_tags"),
		/**
		 *
		 * global used to store the form of pipe used in the original wikicode
		 * Set to '{{!}}' or '|' depending on whether the target text is in
		 * a template or not
		 * default '|'
		 * @type String
		 */
		_pipeText = ($(_ed.target.targetElm).hasClass('mcePartOfTemplate')) ? '{{!}}' : '|',
		/**
		 *
		 * string for inserting a placeholder in editor text for 
		 * various non-vivble codes in the wiki text.
		 * @type String
		 */
		_markupFormat = '<span class="mceNonEditablePlaceHolder {0}" title="{1}" dragable="true" contenteditable="false">{2}</span>',
		/**
		 *
		 * string for inserting a placeholder in editor text for 
		 * non-rendering new lines in the wiki code.  The character
		 * displayed is defined in MW_tinymce.js 
		 * @type String
		 */
		_slb = "null",
		/**
		 *
		 * string for inserting a placeholder in editor text for 
		 * comments in the wiki code.  The character
		 * displayed is defined in MW_tinymce.js 
		 * @type String
		 */
		_cmt = (_ed.getParam("wiki_non_rendering_comment_character")) ?
			 _ed.getParam("wiki_non_rendering_comment_character") : null,
		/**
		 *
		 * string for inserting a placeholder in editor text for 
		 * <nowiki /> tags in the wiki code.  The character
		 * displayed is defined in MW_tinymce.js 
		 * @type String
		 */
		_snw = (_ed.getParam("wiki_non_rendering_nowiki_character")) ?
			 _ed.getParam("wiki_non_rendering_nowiki_character") : null,
		/**
		 *
		 * string for inserting a placeholder in editor text for 
		 * <br /> tags in the wiki code.  The character
		 * displayed is defined in MW_tinymce.js 
		 * @type String
		 */
		_rbr = (_ed.getParam("wiki_rendering_br_character")) ?
			 _ed.getParam("wiki_rendering_br_character") : null,
		/**
		 *
		 * string for inserting a placeholder in editor text for 
		 * <img> tags in the wiki code.  The character
		 * displayed is defined in MW_tinymce.js 
		 * @type String
		 */
		_img = (_ed.getParam("wiki_non_rendering_img_character")) ?
			 _ed.getParam("wiki_non_rendering_img_character") : null,
		/**
		 *
		 * string for inserting a placeholder in editor text for 
		 * non-rendering mediawiki parser output in the wiki code.  
		 * The character displayed is defined in MW_tinymce.js 
		 * @type String
		 */
		_nrw = (_ed.getParam("wiki_non_rendering_parser_output_character")) ?
			 _ed.getParam("wiki_non_rendering_parser_output_character") : null,
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
		_tags4Wiki = new Array();

	/**
	 *
	 * definition of functions used 
	 * globally in this plugin
	 * 
	 * look for this.init to find the start of the main routine
	 */

	/**
	 * format a string by replacing numbered parameters by the parameters passed to it
	 * where {x} is the placeholder replaced by xth parameter passed to string.format
	 *
	 * @param {String} text
	 * @returns {String}
	 */
	String.prototype.format = function () {
		var args = arguments;
		return this.replace(/{(\d+)}/g, function(match, number) {
			return typeof args[ number ] !== 'undefined' ? args[number] : match;
		});
	}

	/**
	 *
	 * create's a unique number for an id
	 * @param {String} html
	 * @returns {String}
	 */
	function _createUniqueNumber () {
		return Math.floor( ( Math.random() * 100000000 ) + Date.now());
	}
	
	/**
	 *
	 * convert encoded html to text
	 * @param {String} html
	 * @returns {String}
	 */
	function _htmlDecode (value) {
		return $("<textarea/>").html(value).text();
	}
	
	/**
	 *
	 * convert text to encoded html
	 * @param {String} text
	 * @returns {String}
	 */
	function _htmlEncode (value) {
		return $('<textarea/>').text(value).html();
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
		id = "<@@@" + tagClass.toUpperCase() + ":" + _createUniqueNumber() + "@@@>";

		// if tagWikiText doesn't need to be parsed create dom element now
		if ( tagHTML != 'toParse' && protection == 'nonEditable' ) {

			// encode the wiki text so it displays correctly
			displayTagWikiText = _htmlEncode( tagWikiText )
			
			// replace any tag new line placeholders from the title
			titleWikiText = tagWikiText.replace(/<@@[bht]nl@@>/gmi, "\n");

			// make sure tagHTML is really HTML else will break when 
			// converting to DOM element.  If not wrap in <code> tags
			if ( !tagHTML.match(/^<.*>$/gmi) ) {
				tagHTML = '<code>' + tagHTML + '</code>';
			}; 

			// create DOM element from tagHTML
			element = $(tagHTML);							
			element.addClass("mceNonEditable mwt-wikiMagic mwt-" + tagClass);
			element.attr({
				'id': id,
				'title': titleWikiText ,
				'data-mwt-type': tagClass,
				'data-mwt-wikitext': titleWikiText,
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
			textLength = text.length,
			linkPlaceholder,
			regex,
			matcher,
			pos = 0,
			urlProtocolMatch = "/^" + _mwtUrlProtocols + "/i";

		// save some effort if there are no links
		if ( !text.match(/\[/) ) return text;
		
		// now walk through the text processing all the
		// links storing external links and internal links
		// in arrays to process later
		for (pos = 0; pos < textLength; pos++) {
			if (text[pos] === '[') {
				squareBraceDepth++;
				linkStart = pos;

				// check to see if an internal link eg starts with [[
				// and process as intrnal link if it is
				if (pos < textLength) {
					if (text.charAt(pos + 1) === '[') {
						pos = pos + 2;
						squareBraceDepth++;
						for (pos = pos; pos < textLength; pos++) {
							if (text[pos] === '[') {
								squareBraceDepth++;
							} else if (text[pos] === ']') {
								if (squareBraceDepth == 2) {

									// checking for closure of internal link eg ]]
									// if not then don't decrement depth counter
									// otherwise won't be able to match closure
									if ((pos < textLength) && (text.charAt(pos + 1) === ']')) {
										pos = pos +1;
										squareBraceDepth = 0;
										
										// make sure we include any text immediately following 
										// the link to ensure we obey 'linktrail' rules
										// Check there is more text after the pos by the way
										while (pos < textLength) {
											if (text.charAt(pos + 1).match(/\w/)) {
												pos = pos +1;
											} else {
												break;
											}
										}

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
										}
										linkPlaceholder = _getPlaceHolder4Html(tempLink, 'toParse', linkType, 'nonEditable');
										
										// replace the link with the placeholder
										regex = tempLink.replace(/[^A-Za-z0-9_]/g, '\\$&');
										matcher = new RegExp(regex, '');
										text = text.replace(matcher, linkPlaceholder);
										
										// reset the textlength and
										// set the pos to the end of the placeholder
										textLength = text.length;
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
						for (pos = pos; pos < textLength; pos++) {
							if (text[pos] === '[') {
								squareBraceDepth++;
							} else if (text[pos] === ']') {
								if (squareBraceDepth == 1) {

									// checking for closure of external link eg ']'
									pos ++;
									squareBraceDepth = 0;
									tempLink = text.substring(linkStart,pos)
									linkPlaceholder = _getPlaceHolder4Html(tempLink, 'toParse', linkType, 'nonEditable');
									regex = tempLink.replace(/[^A-Za-z0-9_]/g, '\\$&');
									matcher = new RegExp(regex, '');
									text = text.replace(matcher, linkPlaceholder);

									// reset the textlength and
									// set the pos to the end of the placeholder
									pos = linkStart + linkPlaceholder.length - 1;
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
			matcher;

		// replace non rendering new line placeholder with html equivalent
		text = text.replace(/<@@slb@@>/gmi, _slb);

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
				// of the way pre and pseudo pre tagfs are handled in the wiki parser
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

						regex = "<(" + _mwtBlockTagsList + ")";
						matcher = new RegExp(regex, 'i');
						html = parserTable[count];
						elementTitle = _tags4Wiki[tag];

						if ( parserTable[count].match(matcher) ) {
							// if parser result contains a block tag. wrap in a <div>
							// and add a new line to the wiki text
							html = '<div>' + html + '</div>';
							_tags4Wiki[tag] = '<@@bnl@@>' + _tags4Wiki[tag] + '<@@bnl@@>';
						} else {
							// otherwise wrap in a <span>
							if (html) {
								html = '<span>' + html + '</span>';
							} else {
								html = '<span>' + _nrw + '</span>';
							}
						}

						// now build the html equivalent from each parsed wikicode fragment
						element = $(html);							
						element.addClass("mceNonEditable mwt-wikiMagic mwt-" + tagClass);
						element.attr({
							'title': elementTitle,
							'id': tag,
							'data-mwt-type': tagClass,
							'data-mwt-wikitext': elementTitle, 
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
		var textObject;

		/**
		 * Converts wiki tags to html and preserves them for recovery later.
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function preserveWikiTags4Html(text) {
			var regex, 
				matcher;

			// find and process all the switch tags in the wiki code
			// may contain wikitext so process first to avoid processing tags within tags
			regex = "__(.*?)__";
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match) {
				var html;
				
				html = '<span> &sect; </span>'
				return _getPlaceHolder4Html(match, html, 'switch', 'nonEditable');
			});

			// find and process all the comment tags in the wiki code
			// may contain wikitext so process first to avoid processing tags within tags
			regex = "<!--([\\S\\s]+?)-->";
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match) {
				var html;
				
				html = '<span>' + _cmt + '</span>'
				return _getPlaceHolder4Html(match, html, 'comment', 'nonEditable');
			});

			// nowiki tags can be used to escape html so process
			// these before processing other tags

			// case <<nowiki />atag ...>
			regex = '<<nowiki\\s*?\\/?>([\\S\\s]*?>)';
			matcher = new RegExp(regex, 'gm');
			text = text.replace(matcher, function(match,$1) {
				//$1 = the text in the escaped tag
				var html;

				html = '<span class="mceNonEditable mwt-wikiMagic">&lt;' + $1 + '</span>';
				return _getPlaceHolder4Html(match, html, 'nowiki', 'nonEditable');
			});
	
			// case <atag ...<nowiki />> ... </atag>
			regex = '<(\\w*)[\\S\\s]*?<nowiki\\s*?\\/>>[\\S\\s]*?<\\/\\1>';
			matcher = new RegExp(regex, 'gm');
			text = text.replace(matcher, function(match) {
				
				return _getPlaceHolder4Html(match, 'toParse', 'nowiki', 'nonEditable')
			});
	
			// find and process all the <nowiki /> tags in the wiki code
			regex = '<nowiki\\s*?\\/>';
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match) {
				var html;
				
				html = '<span class="mceNonEditable mwt-wikiMagic">' + _snw + '</span>';
				return _getPlaceHolder4Html(match, html, 'nowiki', 'nonEditable')
			});
			
			// preserve characters encoded in &xxx; format by placing them in spans 
			// with class of mwt_htmlEntity.  These are typically used 
			// to stop the wiki parser interpretting characters as formatting
			regex = '&([^\\s;]+);';
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match, $1) {
				//$1 = the encoded character
				var html;

				// double encode &amp; otherwise will display incorrectly if recoverred
				if ($1 == 'amp') {
					match = _htmlEncode(match);
				}
				html = '<span class="mceNonEditable mwt-wikiMagic ">&' + $1 + ';</span>';
				return _getPlaceHolder4Html(match, html, 'htmlEntity', 'nonEditable')
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

			// find and process all the <br /> tags in the wiki code
			// may contain wikitext so process first to avoid processing tags within tags
			regex = "<br(\\s*?\/|)>";
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match) {
				var html;
				
				html = '<span>' + _rbr + '<br /></span>'
				return _getPlaceHolder4Html(match, html, 'br', 'nonEditable');
			});

			// treat any extension tag pairs in the wikicode 
			// The list of extension tag codes is define in MW_tinymce.js in the extension root
			regex = '<(' + _mwtExtensionTagsList + ')(\\s.*?>|>)([\\S\\s]*?)<\\/\\1>';
			matcher = new RegExp(regex, 'gmi');

			text = text.replace(matcher, function(match, $1) {
				// $1 = the tag name

				return _getPlaceHolder4Html(match, 'toParse', $1, 'nonEditable');
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
			regex = '<(?!' + _mwtPreservedTagsList + '|@@@|\\/)(.*?)(>([\\S\\s]*?)<\\/\\1>)';
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match) {
				var html;

				html = '<code class="mceNonEditable mwt-wikiMagic">' + match.replace(/\</gmi, '&lt;') + '</code>';
				return _getPlaceHolder4Html(match, html, 'unknown', 'nonEditable');
			});

			// then treat unrecognised tag singletons
			regex = '<(?!' + _mwtPreservedTagsList + '|@@@|\\/).*?\\/?>';
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match) {
				var html;

				html = '<code class="mceNonEditable mwt-wikiMagic">' + match.replace(/\</gmi, '&lt;') + '</code>';
				return _getPlaceHolder4Html(match, html, 'unknown', 'nonEditable');
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

				html = '<code class="mceNonEditable mwt-wikiMagic">' + match.replace(/\</gmi, '&lt;') + '</code>';
				return _getPlaceHolder4Html(match, html, 'unknown', 'nonEditable');
			});

			// find and process pseudo <pre> tags where wikicode lines starts with spaces.  If
			// several consecutive lines start with a space they are treated as a single <pre> block.
			// If the space is followed by any tag or | then ignore
			regex = '(^|\\n)( +[^\\s][^]+?)(?=(\\n\\S|\\n\\s*\\n|\\n\\s*$))';
			matcher = new RegExp(regex, 'gmi');
			text = text.replace(matcher, function(match, $1, $2, $3, offset, string) {
				// $1 = the new lines preceding the text in pseudo <pre>s
				// $2 = lines starting with spaces to be placed in the pseudo <pre>s
				// $3 = the line following the text in pseudo <pre>s
				var parserResult,
					tableCloseNewLine = '';

				return $1 + _getPlaceHolder4Html($2, 'toParse', 'pre', 'nonEditable') +
						tableCloseNewLine;
			});

			// find and process all the 'hr's in the wiki code making sure to
			// process additional '-'s, spaces and text on same line.  We do this here
			// because we don't want the br tags codified 
			text = text.replace(/(?<=(^|\n{1,2}))(----+)([ ]*)(.*)(\n{1,2})/gi, function(match, $1, $2, $3, $4, $5, offset, string) {
				// $1 = start of text or new line that preceeds the '-----'
				// $2 = the dashes in the original wikicode, must be four or more
				// $3 = any spaces that follow the dashes on the same line
				// $4 = any text following the spaces on the same line
				// $5 = any new lines following the text on the same line

				// Because of a quirk with mediawiki, a horizontal rule can be followed by spaces and text
				// The text is displayed on a new line. This text is rendered as part of the hr block so we 
				// place it in a <div> block
				var preNewLines = '',
					postNewLines = '',
					placeHolder,
					wikiText = '<@@bnl@@>' + $2 + $3 + '<@@bnl@@>', 
					html = '<hr class="mw-hr" data-mwt-wikitext="' + encodeURI(wikiText) + '">';

				// we need to keep put the '\n's in here in case a table or other block
				// starts on the next line.  If there are 2 then one is non-rendering
				// and we use a placehoder so it is revealed in the editor window
				if ($5.length == 1) {
					postNewLines = '\n';
				} else if ($5.length == 2) {
					postNewLines = '<@@slb@@>\n';
				}

				// we also need to process the case where there is text on
				// the same line as the '-'s
				if ($4) {
					placeHolder = _getPlaceHolder4Html(match, 'toParse', 'hr', 'nonEditable');
				} else {
					placeHolder = _getPlaceHolder4Html(wikiText, html, 'hr', 'nonEditable');
				}
				return preNewLines + placeHolder + postNewLines;
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
			 * The dom parser used in this function will close
			 * HTML tags, such as <li> which in all likelihood weren't closed
			 * in the original wiki text.  This function is a hack which assumes
			 * they shouldn't be closed and removes any closing tags.  Sorry!!
			 *
			 * @param {elementHTML} text
			 * @returns {text}
			 */
			function unClose( elementHTML ) {
				return elementHTML.replace(/<\/li>(<\/?li|<\/?ol|<\/?ul)(\s*|>)/gmi,"$1$2");
			}

			/**
			 * Convert child elements which shouldn't be converted back to 
			 * wiki code on saving and preserve them for recovery later.
			 * BEWARE recursive function
			 *
			 * @param {element} dom element
			 * @returns {} dom is update by function
			 */
			function convertChildren( element ) {
				//be aware this function is recursive

				// if the tag is an html tag then we don't need to parse
				// it with the mediawiki parser but we do want to preserve it
				// so it doesn't get converted to wiki markup when being saved
				// but remains as html in the wiki code 
				element.children().each( function() {
					var elm = $(this),
						elmTagName = elm.prop("tagName").toLowerCase(),
						elmTagHtml = _htmlDecode(elm.prop("outerHTML")),
						elmTagHtml = unClose(elmTagHtml),
						elmTagWikiText = elmTagHtml,
						displayTagWikiText = elmTagHtml,
						regex,
						matcher,
						html;

					// If this Tag is allowed by mediawiki but has no wiki markup
					// equivalent then it doesn't need to be protected in the TinyMCE
					// editor.  Everything else need to be preserved
					if (invariantTags.indexOf(elmTagName) == -1) {
						if ((extensionTags.indexOf(elmTagName) > -1) || 
							(preservedTags.indexOf(elmTagName) > -1)) {
							// process other tags that are allowed by mediawiki
							elm.replaceWith( _getPlaceHolder4Html(elmTagWikiText, 'toParse', elmTagName, 'nonEditable') );
						} else {
							// this tag is unrecognised as an html or a mediawiki tag
							// so we wrap it in <code> tags.  All these should have be caught 
							// before now so this is just a failsafe.
							elm.wrap("<code class='mceNonEditable mwt-wikiMagic mwt-" + elmTagName + "'></code>")
						}
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
			convertChildren($dom);

			// substiture placeholders for mediawiki extension tags
			$dom.find( "*[class*='mwExtensionTag']" ).replaceWith( function() {
				return this.id;
			});

			// convert DOM back to html text and decode html entities
			text = $dom.html();
			text = _htmlDecode( text );

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
				blockTagList;

			// A single new line is not renderred as such by mediawiki unless 
			// it is preceded or followed by certain types of line. We need 
			// to pass text several times to be sure we got them all
	
			// a single new line followed by any line starting with an 
			// element in postText, possibly preceded by spaces, 
			// is rendered as a new line.  Basically this is any blocktag (already 
			// substitued with a place holder or wiki markup for headers,
			// tables and lists
			startTagsList = _mwtBlockTagsList.split("|").join(":|<@@@");
			postText = '\\s*(\\n|\\||!|\\{\\||#|\\*|;|=|:|<@@@' + startTagsList + ':|\\s*$)';

			// remove any exceptions from the list of tags that are ignored
			postText = postText.replace(/:\|<@@@pre:/gmi, ""); // <pre> tags
			postText = postText.replace(/:\|<@@@h[1-6]/gmi, ""); // <h[n]> tags

			// cater for blank lines at start of text before blocks
			regex = '(?<=(^|\\n)([^\\n]+))(\\n)(?!(' + postText + '))';
			matcher = new RegExp(regex, 'gi');
			
			// also set up the matcher for the inner match statement to avoid having to redefine it
			// every time the out matcher matches!
			blockTagList = _mwtBlockTagsList.split("|").join(":\\d*@@@>|<@@@");
			regex2 = '(\\|\\}\\s*$|=\\s*$|<@@@' + blockTagList + ':\\d*@@@>|<\\/span>\\s*$|^\\s*(#|\\*|:|;|\\|\\||\\|-|\\|\\}))';
			matcher2 = new RegExp(regex2, 'i');
			
			// special case if page starts with a single new line
			text = text.replace(/^\n([^\n]+)/, '<@@slb@@>$1');

			// now process all single new lines
			do {
				processFlag = false;
				text = text.replace(matcher, function(match, $1, $2, $3, $4, offset, string) {
					// $1 = start of text or new line that preceeds text preceding single new line
					// $2 = the text preceding single new line
					// $3 = the single new line itself
					// $4 = any non-excluded text following the single new line 

					// if the line preceding the single new line doesn't end with any of the
					// folowing characters in a line or start with others then render as a new line
					if ($2.match(matcher2)){
						// ignore if the first line following starts with a block tag
						return match;
					} else {
						// insert placeholder for single new line if placeholder is defined
						processFlag = true;
						if (_slb) {
							return '<@@slb@@>';
						} else {
							return ' ';
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
			text = text.replace(/(^|\n)(={1,6})(.+?)\2([^\n]*)(\n+|$)/img, 
				function(match, $1, $2, $3, $4, $5, $6, $7) {
				// $1 = the new line before the heading, if any 
				// $2 = the level of the heading
				// $3 = the content of the heading
				// $4 = text following heading on same line
				// $5 = new lines following the heading
				// $6 = offset
				// $7 = original text
				var heading;

				// if there is text after the heading on the same line then 
				// treat as if not a heading
				if( $4.match(/\S/)) return match;

				// if no new lines before, make '' rather than undefined
				if( typeof $1 == 'undefined' ) {
					$1 = '';
				}

				// build the html for the heading
				heading = $1 + "<h" + $2.length + 
					" class='mwt-heading'" +
					" data-mwt-headingSpaces='" + $4 + "'" +
					" data-mwt-headingNewLines=" + $5.length + 
					" >" + $3 + "</h" + $2.length + ">" ;

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
				matcher;
	
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
			if (!text.match(/(^|\n)\:?\{\|/,'gm')) return text;

			// make a regular expresion matcher to see if a line contains a block element
			// this is used later when walking through the editor content line by line
			blockTagList = _mwtBlockTagsList.split("|").join(":\\d*@@@>|<@@@");
			regex = '^(<@@@' + blockTagList + ':\\d*@@@>' +
				 '|<' + _mwtBlockTagsList.split("|").join("[^>]*>|<") +
				 '|<\\/' + _mwtBlockTagsList.split("|").join(">|<\\/") +
				 '|<br[^>]*>|<@@slb@@>)' ;
			matcher = new RegExp(regex, 'i');

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
				line = lines[i].match(/^\:?\{\|(.*)/gi);
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
					lines[i] = line[0].replace(/^(\:?)\{\|(.*)/, function(match, $1, $2) {
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
							return '<dl><dd data-mwt-sameLine="true">' + tableTag;
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
								if ( !lines[i].match(matcher) ) {
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
			function openList2html(lastList, cur) {
				var listTags = '';
				for (var k = lastList.length; k < cur.length; k++) {
					switch (cur.charAt(k)) {
						case '*' :
							listTags = listTags + "<ul><li>";
							break;
						case '#' :
							listTags = listTags + '<ol><li>';
							break;
						case ';' :
							listTags = listTags + '<dl><dt>';
							break;
						case ':' :
							listTags = listTags + '<dl><dd data-mwt-sameLine="false">';
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
			function continueList2html(lastList, curList) {
				var listTags = '',
					lastTag = lastList.charAt(lastList.length - 1),
					curTag = curList.charAt(curList.length - 1),
					k;

				if (lastList === curList) {
					// this is a straighjtforward continuation of the previous list
					switch (lastTag) {
						case '*' :
						case '#' :
							listTags = '</li><li>';
							break;
						case ';' :
							listTags = listTags + '</dt><dt>';
							break;
						case ':' :
							listTags = '</dd><dd data-mwt-sameLine="false">';
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
								listTags = listTags + '</dd>';
								break;
						}
						k--;
					}
					do {
						// now add back the new list codes
						curTag = curList.charAt(k)
						switch (curTag) {
							case '*' :
								listTags = listTags + '<ul><li>';
								break;
							case '#' :
								listTags = listTags + '<ol><li>';
								break;
							case ';' :
								if ( lastTag == ':' ) {
									listTags = listTags + '<dt>';
								} else {
									listTags = listTags + '<dl><dt>';
								}
								break;
							case ':' :
								if ( lastTag == ';' ) {
									listTags = listTags + '<dd data-mwt-sameLine="false">';
								} else if (( lastTag == '*' ) || ( lastTag == '#' ) || ( lastTag == ':' )) {
									// close the previous lists and start a new definition list
									if (!lastList) {
										// on the smae line
										listTags = listTags + '<dl><dd data-mwt-sameLine="true">';
									} else {
										// on a different line
										listTags = listTags + '<dl><dd data-mwt-sameLine="false">';
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

			// make a regular expresion matcher to see if a line contains a block element
			// this is used when walking through the editor content line by line
			blockTagList = _mwtBlockTagsList.split("|").join(":\\d*@@@>|<@@@");
			regex = '(<@@@' + blockTagList + ':@@@>' + '|<' + _mwtBlockTagsList.split("|").join("[^>]*>|<") +
				 '|<\\/' + _mwtBlockTagsList.split("|").join(">|<\\/") +
				 '|<br[^>]*>|<@@slb@@>)$' ;
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
					lines[i] = lines[i].replace(/^(\*|#|:|;)*(\s*.*?)$/gmi, "$2");
					if (line[0].match(/^(\*|#)+:$/) ) {
						// If the line starts with something like '*:' or '#:'
						// then its probably a definition description within a list.
						lines[i] = continueList2html(lastList, line[0]) + lines[i];
					} else if (line[0].indexOf(':') === 0) {
						// If the line belongs to a definition list starting with a ':' and
						// follows the last line of a sub, omit <li> at start of line.
						if (line[0].length > lastList.length) {
							lines[i] = openList2html(lastList, line[0]) + lines[i];
						} else if (line[0].length === lastList.length) {
							lines[i] = continueList2html(lastList, line[0]) + lines[i];
						} else if (line[0].length < lastList.length) {//close list
							lines[i] = closeList2html(lastList, line[0]) + lines[i];
						}
					} else {
						//else if the line doesn't belong to a definition list starting with a ':' and follows
						//the last line of a sub list, include <li> at start of line
						if (line[0].length === lastList.length) {
							lines[i] = continueList2html(lastList, line[0]) + lines[i];
						} else if (line[0].length > lastList.length) {
							lines[i] = openList2html(lastList, line[0]) + lines[i];
						} else if (line[0].length < lastList.length) {
							// if moving back to higher level list from a sub list then 
							// precede line with a <li> or <dl> tag depending on the type of list
							if (line[0].charAt(line[0].length - 1) === ';') {
								lines[i] = closeList2html(lastList, line[0]) + '<dt>' + lines[i];
							} else {
								lines[i] = closeList2html(lastList, line[0]) + '<li>' + lines[i];
							}
						}
					}
					if (line[0].charAt(line[0].length - 1) === ';') {
						// if it is a definition term, check to see if line
						// contains definition and process accordingly
						lines[i] = lines[i].replace(/:/,function(match,$1){
							line[0] = line[0].substring(0,line[0].length - 1) + ':';
							return '</dt><dd data-mwt-sameLine="true">';
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
								if ( lines[i-1].match(/<br class="mwt-emptyline" \/>$/) > -1 ) {
									lines[i] = lines[i] + '<@@slb@@>';
								} else {
									lines[i] = lines[i] + '<@@slb@@><@@slb@@>';
								}
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
	 * Converts html content of the editor window to wiki code.
	 *
	 * @param {String} text
	 * @returns {String}
	 */
	function _convertHtml2Wiki(e) {
		var text = e.content,
			textObject;
		
		/*
		 * Preprocess HTML in DOM form. This is mainly used to replace tags
		 * @param {String} text
		 * @returns {String}
		 */
		function preprocessHtml2Wiki( text ) {
			var $dom,
				done,
				htmlPrefilter = $.htmlPrefilter;

			// convert html text to DOM
			$dom = $( "<div id='tinywrapper'>" + text + "</div>", "text/xml" );
	
			// process 'p' tags (including forced root blocks) by
			// replacing them with their contents
			$dom.find( "p[class*='mwt-paragraph']" ).replaceWith( function(a) {
				return $( this ).html() + '<@@pnl@@>';
			});
	
			// process 'br' tags, replacing them with placeholders
			$dom.find( "br[class*='mwt-emptylineFirst']" ).replaceWith( function(a) {
				return '<@@elf@@>';
			});
			$dom.find( "br[class*='mwt-emptyline']" ).replaceWith( function(a) {
				return '<@@el@@>';
			});
			$dom.find( "br[data-mce-bogus]" ).replaceWith( function(a) {
				return '';
			});
	
			// process singLineBreak spans, replacing them with placeholders
			$dom.find( "span[class*='mwt-singleLinebreak']" ).replaceWith( function(a) {
				return '<@@snl@@>';
			});
	
			// process blocks containin parsed wiki text
			$dom.find( "*[class*='mwt-wikiMagic']" ).replaceWith( function(a) {
				return this.id;
			});
	
			// process heading 
			$dom.find( ":header" ).replaceWith( function(a) {
				var headingMarkup = '======',
					text = this.innerText,
					level = this.tagName.substring(1),
					spaces = this.getAttribute("data-mwt-headingSpaces"),                 	
					newlines = this.getAttribute("data-mwt-headingNewLines"), 
					altro = headingMarkup.substring(0, level),
					heading;

				// build the header, including any spaces after the header text
				heading = (spaces == null) ? altro + text + altro : altro + text + altro + spaces ;
				heading = '<@@hnl@@>' + heading + '<@@hnl@@>';

				// build back any new lines after the heading 
				for (var i = 0; i < newlines; i++) {
					heading += '<@@nl@@>';
				}
	
				return heading;
			});
	
			// convert DOM back to html text
			text = _htmlDecode($dom[0].innerHTML);
	
			return text;
		}

		/**
		 * Convert html text styling into wiki text styling
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function textStyles2wiki (text) {
			// underline, sub and sup  needs no conversion
			// convert bold, italic and strike out tags
	
			text = text.replace(/<strong>(.*?)<\/strong>/gmi, "'''$1'''");
			text = text.replace(/<b>(.*?)<\/b>/gmi, "'''$1'''");
			text = text.replace(/<em>(.*?)<\/em>/gmi, "''$1''");
			text = text.replace(/<i>(.*?)<\/i>/gmi, "''$1''");
			//underline needs no conversion
			text = text.replace(/<strike>(.*?)<\/strike>/gi, "<s>$1</s>");

			return text
		}

		/**
		 * convert html lists to wiki lists
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function lists2wiki (text) {
			var listTag = '',
				currentPos, 
				nextPos, 
				lastPos,
				oldText, 
				message,
				definitionNewLine;
	
			/**
			 * find the next list tag in the html
			 *
			 * @param {String} text
			 * @returns {String}
			 */
			function htmlFindList(text) {	
				return text.search(/(<\/?ul|<\/?ol|<\/?li( |>)|<\/?dl|<\/?dt|<\/?dd)/);
			}
	
			// careful in the upcoming code: .*? does not match newline, however, [\s\S] does.
			nextPos = htmlFindList(text);
			while (nextPos !== -1) {
				oldText = text;
				switch (text.substr(nextPos, 3)) {
					case '<ul'	:
						listTag = listTag + '*';
						text = text.replace(/<ul[^>]*?>/, "");
						break;
					case '<ol' :
						listTag = listTag + '#';
						text = text.replace(/<ol[^>]*?>/, "");
						break;
					case '<dl' :
						//listTag = listTag + '#';
						text = text.replace(/<dl[^>]*?>/, "");
						break;
					case '<dt' :
						listTag = listTag + ';';
						text = text.replace(/<dt[^>]*?>/, "<@@bnl@@>" + listTag);
						break;
					case '<dd' :
						// if already in a definition tag or if the listTag is empty then don't
						// add a ':' to the list tag, unless this is not on the same line! 
						text = text.replace(/<dd([^>]*?)>/, function(match, $1) {
							// $1 = any attributes associated with tag
							$1 = $1.replace(/ data-mwt-sameLine\="(.*?)"/gmi, function (match, $1) {
								if ($1 == 'true') {
									definitionNewLine = "";
								} else {
									definitionNewLine = "<@@bnl@@>";
								}
								return "";
							});
							listTag = listTag + ':';
							if (definitionNewLine) {
									return definitionNewLine + listTag;
							} else {
									return ':';
							}
						});
	
						break;
					case '<li' :
						if (text.search(/<li[^>]*?>\s*(<ul[^>]*?>|<ol[^>]*?>)/) === nextPos) {
							text = text.replace(/<li[^>]*?>/, "");
						} else {
							text = text.replace(/\n?<li[^>]*?>/mi, "<@@bnl@@>" + listTag);
						}
						break;
				}
				switch (text.substr(nextPos, 4)) {
					case '</ul'	:
						listTag = listTag.substr(0, listTag.length - 1);
						//prevent newline after last blockquote
						if (listTag.length > 0) {
							text = text.replace(/<\/ul>/, "");
						} else {
							text = text.replace(/<\/ul>/, "<@@bnl@@>");
						}
						break;
					case '</ol' :
						listTag = listTag.substr(0, listTag.length - 1);
						//prevent newline after last blockquote
						if (listTag.length > 0) {
							text = text.replace(/<\/ol>/, "");
						} else {
							text = text.replace(/<\/ol>/, "<@@bnl@@>");
						}
						break;
					case '</li' :
						text = text.replace(/\n?<\/li>/mi, "");
						break;
					case '</dl' :
						//prevent newline after last blockquote
						if (listTag.length > 0) {
							text = text.replace(/<\/dl>/, "");
						} else {
							text = text.replace(/<\/dl>/, "<@@bnl@@>");
						}
						break;
					case '</dt' :
						listTag = listTag.substr(0, listTag.length - 1);
						text = text.replace(/<\/dt>/, "");
						break;
					case '</dd' :
						listTag = listTag.substr(0, listTag.length - 1);
						text = text.replace(/<\/dd>/, "");
						break;
				}
	
				// this is a rather expensive function in order to prevent system crashes.
				// if the text has not changed, text.search will find the same tag over and over again
				// Todo: Identify infinite loops and prevent
				if (oldText == text) {
					// Todo: i18n
					message = mw.msg("tinymce-wikicode-alert-infinte-loop");
					alert(message);
					break;
				}
				nextPos = htmlFindList(text);
			}

			// tidy up (eg remove) any empty definition list items
			text = text.replace(/(^|<@@bnl@@>)(\*|\#|\;|\:)+\s*(?=<@@bnl@@>)/gmi, function (match, $1) {
				return "";
			});
		
			return text;
		}
		
		/**
		 * Convert HTML tables to wiki code
		 *
		 * @param {String} text
		 * @returns {String}
		*/
		function tables2wiki(text) {
			var $dom,
				tableparser,
				emptyLine,
				tables,
				done;

			// save some effort if no tables
			if (!text.match(/\<table/g)) return text;
	
			// the elements tbody,thead,tfoot,colgroup,col aren't supported in
			// wikicode.  These are filtered out using invalid_elements directive
			// in the MW_tinymce.js initialisation file except tbody which doesn't
			// seem to get filtered?
			text = text.replace(/<(\/)?tbody([^>]*)>/gmi, "");
	
			// now process code at start and end of tables.  Note the new line handling for these 
			// happens when all the other new line codes are processed in newLines2wiki
			text = text.replace(/(:?)<table([^>]*)>/gmi, function (match, $1, $2) {
				// $1 = any : preceding the table tag
				// $2 = any attributes contained in the table tag
				var newLines = '';

				// process the empty lines at the start of the table
				$2 = $2.replace(/\s*data-mwt-tablestartnewlines="(\d)"/gmi, function (match,$1) {
					//$1 = number of new lines following the opening code of table
					
					for ( var i = 1 ; i < $1 ; i++ ) {
						newLines += "<@@tnl@@>";
					}
					return '';
				});
				
				return "<@@tnl@@>" + $1 + "{" + _pipeText + $2 + newLines;
				});

			// this processes the end of the table
			text = text.replace(/<\/table>(<span class="mwt-closeTable" mwt-spaces="(.*?)">(.*?)<\/span>(?=<@@el@@>)){0,1}/gi, 
				function(match, $1, $2, $3) {
					// $1 = closeTable span element
					// $2 = spaces following close table on the same line
					// $3 = text following close table on the same line
					var tableClose
					
					tableClose = "<@@tnl@@>" + _pipeText + "}";
					if ($2) tableClose += $2;
					if ($3) tableClose += $3;
					// if there is text after table close we've already added a new line
					// so don't do it again
					if (!$1) tableClose += "<@@tnl@@>";

					return tableClose;					
			});

// DC TODO there shouldn't be any \n in code by now so shouldn't need them in following searches
// the next replace just tests to see if we ever get any before I nuke the rest
			text = text.replace(/\n/gmi, function(match) {
debugger;
				return "";
			});

			// process captions
			text = text.replace(/\n?<caption([^>]*)>/gmi, function(match, $1) {
					// check to see if there are attributes.  If there are, place these
					// before the a pipe in the caption line
					// $1 = attributes of the caption tag
					
					if ($1) {
						return "<@@tnl@@>" + _pipeText + "+" + $1 + _pipeText;
					} else {
						return "<@@tnl@@>" + _pipeText + "+";
					}
			});
			text = text.replace(/\n?<\/caption([^>]*)>/gmi, "");
	
			// process rows
			text = text.replace(/\n?<tr([^>]*)>/gmi, function(match, $1) {
				// $1 = attributes of tag

				if ($1.match(/mwt-silentTr/gmi)) {
					// silent TRs aren't rendered in wikicode
					return "";
				}
				if ($1.match(/^\s*$/gmi)) {
					// attributes string that is just spaces should be made empty
					$1 = '';
				} 
				return "<@@tnl@@>" + _pipeText + "-" + $1;
			});
			text = text.replace(/\n?<\/tr([^>]*)>/gmi, "");
	
			// process headings
			text = text.replace(/\n?<th([^>]*)>/gmi, function (match, $1) {
				// $1 = any html attributes of the header
				var cellPipeText = '!',
					cellNewLine;

				$1 = $1.replace(/ data-mwt-wikiPipe\="(.*?)"/gmi, function (match, $1) {
					if ($1 == '!!') {
						cellPipeText += cellPipeText;
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
				
				if ($1) {
					return cellNewLine + cellPipeText + $1 + ' ' + _pipeText;
				} else {
					return cellNewLine + cellPipeText;
				}
			});
			text = text.replace(/\n?<\/th([^>]*)>/gmi, "");

			// process cells
			text = text.replace(/\n?<td([^>]*)>/gmi, function (match, $1, offset, string) {
				// $1 = any attributes associated with the cell
				var cellPipeText = _pipeText,
					cellNewLine,
					cellEmptyLineFirst;
				
				$1 = $1.replace(/ data-mwt-wikiPipe\="(.*?)"/gmi, function (match, $1) {
					if ($1 == '||') {
						cellPipeText += _pipeText;
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

				$1 = $1.replace(/ data-mwt-cellEmptyLineFirst\="(.*?)"/gmi, function (match, $1) {
					// $1 = the value of the parameter

					if ($1 == 'false') {
						cellEmptyLineFirst = "";
					} else {
						cellEmptyLineFirst = "<@@tnl@@>";
					}
					return "";
				});
				
				if ($1) {
					return cellNewLine + cellPipeText + $1 + ' ' + _pipeText + cellEmptyLineFirst;
				} else {
					return cellNewLine + cellPipeText + cellEmptyLineFirst;
				}
			});

			// tidy up after converting the tables

			// replace any data-mwt-attr attributes with their values
			text = text.replace(/data-mwt-attr=('|")(.*?)\1/gmi, function(match, $1, $2) {
				// $1 = type of quoation mark
				// $2 = attribute string
				
				$2 = $2.replace(/\&lt;/gmi, '<').replace(/\&gt;/gmi, '>');
				return $2;
			});

			// remove newline after table if tables are nested
			text = text.replace(/<@@tnl@@>\s*(<\/td[^>]*>)/gmi, "$1");
	
			// remove closing td tags
			text = text.replace(/\n?<\/td([^>]*)>/gmi, "");
	
			// remove non-breaking space after ||
			text = text.replace(/\|\|&nbsp;/gi, _pipeText + _pipeText);
	
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
				text = text.replace(/(\<@@@.*?:\d*@@@>)/gi, function(match, $1, offset, string) {
					// replace '&amp;amp;' with '&amp;' as we double escaped these when they were converted
					return _tags4Wiki[$1].replace(/&amp;amp;/gmi,'&amp;');
				}); 
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
			text = text.replace(/(?<=(<@@[pbht]nl@@>)?)((\s*<@@snl@@>\s*)+)(<@@[pbht]nl@@>)*/gmi, "$2");

			// process empty lines bracketed by block new lines
			text = text.replace(/(<@@[pbht]nl@@>)?((\s*<@@el(f)?@@>\s*)+)(<@@[pbht]nl@@>)?/gmi, "$2");

			// replace remaining br_emptyline_first with 2 new lines
			text = text.replace(/\n?<@@elf@@>/gmi, "<@@2nl@@>");
			
			// replace br_emptyline with a single new line
			text = text.replace(/\n?<@@el@@>/gmi, "<@@nl@@>");

			// respect the &nbsp
			text = text.replace(/<@@bnl@@>(&nbsp;)/gmi, "$1");

			// where two blocks are adjacent we only need one new line
			text = text.replace(/<@@[pbht]nl@@>\s*<@@[pbht]nl@@>/gmi, "<@@nl@@>");

			// where one or two new lines are followed or preceded by
			// a header/block/table new line then remove it
			text = text.replace(/<@@2nl@@><@@[pbht]nl@@>/gmi, "<@@2nl@@>");
			text = text.replace(/<@@[pbht]nl@@><@@2nl@@>/gmi, "<@@2nl@@>");
			text = text.replace(/<@@hnl@@><@@nl@@>/gmi, "<@@nl@@>");
			text = text.replace(/<@@nl@@><@@[pbht]nl@@>/gmi, "<@@nl@@>");

			// rationalise forced new lines for blocks at start and end of table cells
			text = text.replace(/((<@@tnl@@>)?\|{1,2}\s*)<@@[bh]nl@@>/gmi, "$1");
			text = text.replace(/<@@[bh]nl@@>((<@@tnl@@>)?\|{1,2}\s*)/gmi, "$1");

			// one or more forced new lines for blocks at the start of the page 
			// should be removed
			text = text.replace(/^(<@@[pbht]nl@@>)*/gmi, "");

			// otherwise replace forced 'p' placeholder with single new line
			text = text.replace(/<@@pnl@@>/gmi, "<@@2nl@@>");

			// otherwise replace forced new line placeholder with single new line
			text = text.replace(/<@@[bht]nl@@>/gmi, "<@@nl@@>");

			// replace br_singlelinebreak with single new line
			text = text.replace(/<@@snl@@>/gmi, "<@@nl@@>");

			// replace the remaining placeholders with wiki code
			text = text.replace(/<@@br@@>/gmi, "<br>");
			text = text.replace(/<@@2nl@@>/gmi, "\n\n");
			text = text.replace(/<@@nl@@>/gmi, "\n");

			return text;
		}

		// save some work
		if ( text === '' ) return text;
		
		// wrap the text in an object to send it to event listeners
		textObject = {text: text};
		$(document).trigger('TinyMCEBeforeHtmlToWiki', [textObject]);
		text = textObject.text;

		//Remove any '\n' as they are not part of html formatting
		text = text.replace(/\n/gi, "");

		// preprocess tags in html using placeholders where needed
		text = preprocessHtml2Wiki(text);

		// convert text decorations
		text = textStyles2wiki(text);

		// convert blocks 
		text = lists2wiki(text);

		// convert tables
		text = tables2wiki(text);

		//recover special tags to wiki code from placeholders
		text = recoverTags2Wiki(text);

		// recover all the new lines to the text
		text = newLines2wiki (text);

		// finally substitute | with {{!}} if text is part of template
		if ( _pipeText == '{{!}}' ) {
			text = text.replace(/\|/gmi, "{{!}}");
		}

		// wrap the text in an object to send it to event listeners
		textObject = {text: text};
		$(document).trigger('TinyMCEAfterHtmlToWiki', [textObject]);
		text = textObject.text;

		return text;
	} 

	/**
	 * Find images in text and upload these to the wiki if allowed
	 *
	 * @param {String} text
	 * @returns {String}
	 */
	function _uploadImages(editor,text) {
		var $dom;
		
		/**
		 * uploads an image to the wiki
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function doUpload(fileType, fileToUpload, fileName, fileSummary, ignoreWarnings){
			var uploadData = new FormData();
			uploadData.append("action", "upload");
			uploadData.append("filename", fileName);
			uploadData.append("text", fileSummary);
			uploadData.append("token", mw.user.tokens.get( 'csrfToken' ) );
			uploadData.append("ignorewarnings", ignoreWarnings );
			if (fileType == 'File') uploadData.append("file", fileToUpload);
			if (fileType == 'URL') uploadData.append("url", fileToUpload);
			uploadData.append("format", 'json');
			var uploadDetails;
			//as we now have created the data to send, we send it...
			$.ajax( { //http://stackoverflow.com/questions/6974684/how-to-send-formdata-objects-with-ajax-requests-in-jquery
				url: _mwtWikiApi,
				contentType: false,
				processData: false,
				type: 'POST',
				async: false,
				data: uploadData,//the formdata object we created above
				success: function(data){
						uploadDetails = data;
				},
				error:function(xhr,status, error){
					uploadDetails.responseText = xhr.responseText;
					console.log(error);
				}
			});
			return uploadDetails;
		}
		
		/**
		 * check upload succesful or report errors and warnings
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function checkUploadDetail(uploadDetails, ignoreWarnings, destinationName) {
			var message,
				result;

			if (typeof uploadDetails == "undefined") {
				message = mw.msg("tinymce-upload-alert-unknown-error-uploading",
					destinationName );
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
					ed.windowManager.alert(message);
				}
			} else if (typeof uploadDetails.warnings != "undefined" && (!ignoreWarnings)) {
				message = mw.msg("tinymce-upload-alert-warnings-encountered",
					' ' + destinationName) + "\n\n" ;  
				result = 'warning';
				for (warning in uploadDetails.warnings) {
					warningDetails = uploadDetails.warnings[warning];
					if (warning == 'badfilename') {
						message = message + "	" + mw.msg("tinymce-upload-alert-destination-filename-not-allowed") + "\n";
						result = false;
					} else if (warning == 'exists') {
						message = message + "	" + mw.msg("tinymce-upload-alert-destination-filename-already-exists") + "\n";
						result = 'exists';
					} else if (warning == 'duplicate') {
						duplicate = warningDetails[0];
						message = message + "	" + mw.msg("tinymce-upload-alert-duplicate-file",destinationName) + "\n"
						result = 'duplicate';
					} else {
						message = message + "	" + mw.msg("tinymce-upload-alert-other-warning",warning) + "\n"
						result = false;
					}
				}
				ed.windowManager.alert(message);
			} else if (typeof uploadDetails.imageinfo != "undefined") {
				result = uploadDetails.imageinfo.url;
			}
			return result;
		}

		$dom = $( "<div id='tinywrapper'>" + text + "</div>" );

		// find image tags in the dom and upload the images
		$dom.find( "img" ).replaceWith( function() {
			var aLink,
				fileType, 
				uploadDetails, 
				uploadResult, 
				ignoreWarnings = true,
				fileSummary = '',
				wikiImageObject = [],
				htmlImageObject = this,
				attribute,
				attributes = this.attributes,
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
			
			// determine if this is a local image or external
			if ((protocol == 'https:') || (protocol == 'http:')) {
				fileType = 'URL';
			} else {
				fileType = 'File';
			}
			
			// upload the image (or use existing image on wiki if already uploaded
			// checking the response and process any errors or warning appropriately
			uploadDetails = doUpload(fileType, sourceURI, dstName, fileSummary, ignoreWarnings);
			uploadResult = checkUploadDetail(uploadDetails, ignoreWarnings, dstName);

			// build the wiki code for the image link
			// first process image tag attributes
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
			}

			// make sure image caption comes in the end
			if ( imageCaption ) {
				wikiText.push( imageCaption );
			}

			if (this.parentNode.tagName == "A") {
				dstName = dstName + "|link=" + this.parentNode.href;
				aLink = '[[' + _mwtFileNamespace + ':' + dstName + wikiText.join('|') + ']]';
				return _preserveLinks4Html(aLink);
			}	
		});

		// convert DOM back to html text
		text = $dom.html();

		//remove &; encoding
		text = text.replace(/(&[^\s]*?;)/gmi, function($0) {
			return tinymce.DOM.decode($0);
		});

		return _recoverTags2html(text);
	}
		
	/**
	 * inserts an sinle new line placeholder intop the text
	 *
	 * @param {String} text
	 * @returns {String}
	 */
	function insertSingleLinebreak() {
		var args,
		args = {format: 'raw'};
		ed.undoManager.transact(function(){
			ed.focus();
			ed.selection.setContent(_slb, args);
			ed.undoManager.add();
		});
	}

	/**
	 * form for inserting and editing wiki links
	 *
	 * @param {String} text
	 * @returns {String}
	 */
	function showWikiLinkDialog() {
		var ed = _ed,
			selectedNode = ed.selection.getNode(),
			data = {},
			dataType = '',
			isWikiLink = '',
			linkParts = [],
			value = '',
			aLink = '',
			classListCtrl,
			linkCtrl,
			labelCtrl;

		/**
		 * builds the list of link types
		 *
		 * @param {String} text
		 * @returns {String}
		 */
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

		if (typeof(selectedNode.attributes["data-mwt-type"]) !== "undefined" ) {
			data.class = selectedNode.attributes["class"].value;
			dataType = selectedNode.attributes["data-mwt-type"].value;
			isWikiLink = 
				dataType == "internallink" || 
				dataType == "externallink" ;	
		}
		
		if (isWikiLink) {
			value = _htmlDecode(selectedNode.attributes["data-mwt-wikitext"].value);
			if (dataType == 'internallink') {
				value = value.substr(2, value.length - 4);
				linkParts = value.split("|");
				aLink = linkParts[0];
				if (linkParts.length > 1) {
					value = linkParts[1];
				} else {
					value = '';
				}
			} else if (dataType == 'externallink') {
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
			value = ed.selection.getContent({format : 'raw', convert2wiki : true});
		}
		data.href = aLink;
		data.text = value;
		
		if (ed.settings.link_class_list) {
			classListCtrl = {
				name: 'class',
				type: 'listbox',
				label: mw.msg("tinymce-link-type-label"),
				value: data.class,
				values: buildListItems(
					ed.settings.link_class_list,
					function(item) {
						if (item.value) {
							item.textStyle = function() {
								return ed.formatter.getCssText({inline: 'a', classes: [item.value]});
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

		ed.windowManager.open({
			title: mw.msg('tinymce-link-title'),
			data: data,
			body: [
				classListCtrl,
				linkCtrl,
				labelCtrl
			],
			onsubmit: function(e) {
				var href;
				data = tinymce.extend(data, e.data);
				href = data.href;

				// Delay confirm since onSubmit will move focus
				function delayedConfirm(message, callback) {
					var rng = ed.selection.getRng();

					tinymce.util.Delay.setEditorTimeout(_ed, function() {
						ed.windowManager.confirm(message, function(state) {
							ed.selection.setRng(rng);
							callback(state);
						});
					});
				}

				function insertLink() {
					//Trim left and right everything (including linebreaks) that is not a starting or ending link code
					//This is necessary to avoid the bswikicode parser from breaking the markup
					var href,
						aLink,
						aLabel,
						wikitext;
						
					href = data.href.replace(/(^.*?\[|\].*?$|\r\n|\r|\n)/gm, ''); //first layer of '[...]' //external-, file- and mailto- links
					href = href.replace(/(^.*?\[|\].*?$|\r\n|\r|\n)/gm, ''); //potential second layer of '[[...]]' //internal and interwiki links
					aLink = decodeURIComponent(href);
					aLabel = _htmlDecode(data.text).replace("_"," ");
					wikitext = "";
				
					if (data["class"].indexOf("mwt-internallink") > -1){ 
							aLink = aLink.replace("_"," ");
						if (aLabel) {
							wikitext = "[[" + aLink + "|" + aLabel + "]]";
						} else {
							wikitext = "[[" + aLink + "]]";			
						}
					} else if (data["class"].indexOf("mwt-externallink") > -1) {
						if (aLabel) {
							wikitext = "[" + aLink + " " + aLabel + "]";
						} else {
							wikitext = "[" + aLink + "]";
						}
					}
					
					var args = {format: 'wiki', load: 'true', convert2html: true};
					ed.undoManager.transact(function() {
						ed.focus();
						ed.selection.setContent(wikitext, args);
						ed.undoManager.add();
					});
					ed.selection.setCursorLocation();
					ed.nodeChanged();
				}

				if (!href) {
					ed.execCommand('unlink');
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
				
				if ((data["class"].indexOf("mwt-externallink") > -1) &&
					(ed.settings.link_assume_external_targets && !hasUrl)) {
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

	/**
	 * form for inserting and editing wiki code
	 *
	 * @param {String} text
	 * @returns {String}
	 */
	function showWikiMagicDialog() {
		var ed = _ed,
			selectedNode = ed.selection.getNode(),
			nodeType = '',
			isWikimagic = false,
			value = '',
			selectAll = false;

		if ( typeof selectedNode.className != "undefined" ) {
			if ( selectedNode.className.indexOf("mwt-wikiMagic") > -1 ) {
				if ( selectedNode.attributes["data-mwt-wikitext"] != "undefined" ) {
					isWikimagic = true ;
				}
			}
		}

		if (isWikimagic) {
			value = _htmlDecode(selectedNode.attributes["data-mwt-wikitext"].value);
		} else if ( ed.selection.isCollapsed() ) {
			// if nothing is selected then select everything
			value = ed.getContent({format : 'raw', convert2wiki : true});
			selectAll = true;
		} else if (ed.selection) {
			// else use the value selected
			value = ed.selection.getContent({format : 'raw', convert2wiki : true});
		}

		var win = ed.windowManager.open({
			title: mw.msg("tinymce-wikisourcecode"),
			body: {
				type: 'textbox', 
				name: 'code', 
				multiline: true,
				minWidth: Math.max(tinymce.DOM.getViewPort().w - 400, 600),
				minHeight: ed.getParam("code_dialog_height", 
					Math.min(tinymce.DOM.getViewPort().h - 200, 500)),
				spellcheck: true,
				style: 'direction: ltr; text-align: left',
				},
			onsubmit: function(e) {
				var args = {format: 'wiki', load: 'true', convert2html: true};
				
				// We get a lovely "Wrong document" error in IE 11 if we
				// don't move the focus to the editor before creating an undo
				// transation since it tries to make a bookmark for the current selection
				ed.undoManager.transact(function() {
					ed.focus();
					if (!selectAll) {
						ed.selection.setContent(e.data.code, args);
					} else {
						ed.setContent(e.data.code, args) ;
					}
					ed.undoManager.add();
				});

				ed.selection.setCursorLocation();
				ed.nodeChanged();

				return;
			}
		});

		// Gecko has a major performance issue with textarea
		// contents so we need to set it when all reflows are done
		win.find('#code').value(value);
	}
	
	/**
	 * Event handler for "beforeSetContent"
	 * This is used to process the wiki code into html.
	 * @param {tinymce.ContentEvent} e
	 */
	function _onBeforeSetContent(e) {
		// if raw format is requested, this is usually for internal issues like
		// undo/redo. So no additional processing should occur. Default is 'html'
		if (e.format == 'raw' ) {
			return;
		}

		// if this is the initial load of the editor
		// tell it to convert wiki text to html
		if (e.initial == true) {
			e.convert2html = true;
		}
		// set format to raw so that the Tiny parser won't rationalise the html
		e.format = 'raw';
		// if the content is wikitext thyen convert to html
		if (e.convert2html) {
			e.content = _convertWiki2Html(e.content);
		}
		return;
	}

	/**
	 * Event handler for "onSetContent".
	 * This is currently not used.
	 * @param {tinymce.SetContentEvent} e
	 */
	function _onSetContent(e) {
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
		e.format = 'raw';
		return;
	}

	/**
	 * Event handler for "getContent".
	 * This is used to process html into wiki code.
	 * @param {tinymce.ContentEvent} e
	 */
	function _onGetContent(e) {
		// if we are going to save the content then we need to convert it
		// back to wiki text
		if (e.save == true) {
			e.convert2wiki = true;
		}

		if (e.convert2wiki) {
			e.content = _convertHtml2Wiki(e);
			e.convert2wiki = false;
		} else {
			// if we are just retrieving the html, for example for CodeMirror,
			// we may have to tidy up some of the 'rationalisation' that
			// TinyMCE makes to the html, mainly as a result of forcing root blocks
			e.content = e.content.replace(/<br class="mwt-emptylineFirst"><\/p>/gm,"</p>");
		}
		return;
	}

	/**
	 * Event handler for "loadContent".
	 * This is currently not used.
	 * @param {tinymce.LoadContentEvent} e
	 */
	function _onLoadContent(e) {
		return;
	}

	/**
	 * Event handler for "drop"
	 * Add function for processing when drag/dropping items.
	 * @param {tinymce.DropEvent} e
	 */
	function _onDrop(e) {
		return;
	}
	
	/**
	 * Event handler for "onPastePreProcess"
	 * Add function for processing when drag/dropping items.
	 * @param {tinymce.DropEvent} e
	 */
	function _onPastePreProcess(e) {
		// check if this is the content of a drag/drop event
		// if it is then no need to convert wiki to html
		
		// Show progress for the active editor
		_ed.setProgressState(true);

		// upload any images in the dropped content before continuing with paste
		e.content = _uploadImages(_ed,e.content);

		// Hide progress for the active editor
		_ed.setProgressState(false);
		return;
	}

	/**
	 * Event handler for "dblclick"
	 * Add function for processing when double clicking items.
	 * @param {tinymce.DblclickEvent} e
	 */
	function _onDblclick(e) {
		var ed = _ed,
		selectedNode,
		targetFound = false;
		
		selectedNode = e.target;
		while (selectedNode.parentNode != null) {
			if (typeof selectedNode.className != "undefined") {
				if (selectedNode.className.indexOf("mwt-image") > -1) {
					ed.selection.select(selectedNode);
					e.target = selectedNode;
					ed.execCommand('mceImage');
					targetFound = true;
					break;
				} else if (selectedNode.className.indexOf("mwt-internallink") > -1 ||
					selectedNode.className.indexOf("mwt-externallink") > -1) {
					ed.selection.select(selectedNode);
					e.target = selectedNode;
					ed.execCommand('mceLink');
					targetFound = true;
					break;
				} else if (selectedNode.className.indexOf("mwt-wikiMagic") > -1) {
					ed.selection.select(selectedNode);
					e.target = selectedNode;
					ed.execCommand('mceWikimagic');
					targetFound = true;
					break;
				}
			}
			selectedNode = selectedNode.parentNode;
		}
		// if no node found with a wiki class then edit the original node as wiki code
		if (!targetFound) ed.execCommand('mceWikimagic');

		return;
	}

	/**
	 * Initialiseses editor function
	 * Defines event handlers.
	 *
	 * @param {array} ed = the instance of the editor
	 * @param {string} url = the url of this tinyMCE plugin
	 * @returns {String}
	 */
	this.init = function(ed, url) {
		//
		// set up markup placeholders
		//
		_slb = (ed.getParam("wiki_non_rendering_newline_character")) ?
			_markupFormat.format( 
				"mwt-singleLinebreak", 
				mw.msg( 'tinymce-wikicode-non-rendering-single-linebreak' ),
				ed.getParam("wiki_non_rendering_newline_character") ) 
				: null;

		//
		// set up functions that respond to events
		//
		ed.on('loadContent', _onLoadContent);
		ed.on('beforeSetContent', _onBeforeSetContent);
		ed.on('setContent', _onSetContent);
		ed.on('beforeGetContent', _onBeforeGetContent);
		ed.on('getContent', _onGetContent);
		ed.on('drop', _onDrop);
		ed.on('pastePreProcess', _onPastePreProcess);
		ed.on('dblclick', _onDblclick);

		//
		// add in wikilink functionality
		//
		ed.addCommand('mceLink', showWikiLinkDialog);
		ed.addShortcut('Meta+K', '', showWikiLinkDialog);
		ed.addButton('wikilink', {
			icon: 'link',
			tooltip: mw.msg("tinymce-link-link-button-tooltip"),
			shortcut: 'Meta+K',
			onclick: showWikiLinkDialog,
			stateSelector: '.mwt-internallink,.mwt-externallink'
		});
		ed.addButton('unlink', {
			icon: 'unlink',
			tooltip: mw.msg("tinymce-link-link-remove-button-tooltip"),
			cmd: 'unlink',
			stateSelector: '.mwt-internallink,.mwt-externallink'
		});
		ed.addMenuItem('wikilink', {
			icon: 'link',
			text: mw.msg('tinymce-link'),
			shortcut: 'Meta+K',
			onclick: showWikiLinkDialog,
			stateSelector: '.mwt-internallink,.mwt-externallink',
			context: 'insert',
			prependToContext: true
		});

		//
		// add in wikimagic functionality
		//
		ed.addCommand('mceWikimagic', showWikiMagicDialog);  
		ed.addButton('wikimagic', {
			icon: 'wikicode',
			stateSelector: '.wikimagic',
			tooltip: mw.msg( 'tinymce-wikimagic' ),
			onclick: showWikiMagicDialog
		});
		ed.addMenuItem('wikimagic', {
			icon: 'wikicode',
			text: 'Wikimagic',
			tooltip: mw.msg( 'tinymce-wikimagic' ),
			context: 'insert',
			onclick: showWikiMagicDialog
		});

		//
		// add processing for non rendered new line functionality
		//
		if (_slb) {
			ed.addButton('singlelinebreak', {
				icon: 'visualchars',
				tooltip: mw.msg("tinymce-insert-linebreak"),
				onclick:  insertSingleLinebreak
			});
	
			ed.addMenuItem('singlelinebreak', {
				icon: 'visualchars',
				text: 'Single linebreak',
				tooltip: mw.msg("tinymce-insert-linebreak"),
				context: 'insert',
				onclick: insertSingleLinebreak
			});
		}

		//
		// add processing for browser context menu 
		//
		ed.addButton('browsercontextmenu', {
			icon: 'info',
			tooltip: mw.msg( 'tinymce-browsercontextmenu' ),
			onclick: showWikiMagicDialog
			});
		ed.addMenuItem('browsercontextmenu', {
			icon: 'info',
			text: mw.msg('tinymce-browsercontextmenu-title'),
			tooltip: mw.msg( 'tinymce-browsercontextmenu' ),
			context: 'insert',
			onclick: function(e) {
				ed.focus();
				ed.windowManager.confirm(mw.msg( 'tinymce-browsercontextmenu' ), function(state) {
					if (state) {
						ed.off('contextmenu');
					}				
				});
			}
		});
	  
		//
		// setup MW TinyMCE macros - these are defined in localSettings.php
		//
		var macros = ed.getParam("tinyMCEMacros");
		var numMacros = macros.length;
		for ( var i = 0; i < numMacros; i++ ) {
			var curMacro = macros[i];
			ed.addMenuItem('macro' + i, {
				text: curMacro['name'],
				image: curMacro['image'],
				context: 'insert',
				wikitext: curMacro['text'],
				onclick: function () {

					// Insert the user-selected text into
					// the macro text, if the macro text
					// has a section to be replaced.
					// (Demarcated by '!...!'.)
					// @TODO - handle actual ! marks.
					var selectedContent = ed.selection.getContent();
					var insertText = tinymce.DOM.decode(this.settings.wikitext);
					var replacementStart = insertText.indexOf('!');
					var replacementEnd = insertText.indexOf('!', replacementStart + 1);
					if ( selectedContent == '' ) {
						insertText = insertText.replace( /!/g, '' );
					} else if ( replacementStart > 0 && replacementEnd > 0 ) {
						insertText = insertText.substr( 0, replacementStart ) + selectedContent + insertText.substr( replacementEnd + 1 );
					}

					var args = {format: 'wiki', load: 'true'};
					ed.undoManager.transact(function() {
						ed.focus();
						ed.selection.setContent(insertText, args);
						ed.undoManager.add();
					});

					ed.selection.setCursorLocation();
					ed.nodeChanged();

					return;
				}
			});
		}
		
		//
		// setup minimising menubar when field not selected in pageforms
		//
		
		var minimizeOnBlur = $(ed.getElement()).hasClass( 'mceMinimizeOnBlur' );
		if ( minimizeOnBlur ) {
			ed.on('focus', function(e) {
				var mcePane = $("textarea#" + e.target.id).prev();
				mcePane.find(".mce-toolbar-grp").css("height", "");
				mcePane.find(".mce-toolbar-grp .mce-flow-layout").show("medium");
			});
			ed.on('blur', function(e) {
				var mcePane = $("textarea#" + e.target.id).prev();
				// Keep a little sliver of the toolbar so that users see it.
				mcePane.find(".mce-toolbar-grp").css("height", "10px");
				mcePane.find(".mce-toolbar-grp .mce-flow-layout").hide("medium");
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

tinymce.PluginManager.add('wikicode', MwWikiCode);
