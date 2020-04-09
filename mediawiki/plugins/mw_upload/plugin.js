/**
 * plugin.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2015 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 *
 * Modified to work with Mediawiki
 * Duncan Crane duncan.crane@aoxomoxoa.co.uk
 */

/*global tinymce:true */
/*global mw:true */

//TODO: DC 22/04/2018 retrieves image html from wiki parser so remove processing to create image html

tinymce.PluginManager.add('wikiupload', function(editor) {
	var me = this,
		_srccontent,
		_userThumbsize = 3,
		_thumbsizes = ['120', '150', '180', '200', '250', '300'];

	var _mwtWikiApi = editor.getParam("wiki_api_path"),
		_mwtPageTitle = editor.getParam("wiki_page_mwtPageTitle"),
		_mwtNamespaces = editor.getParam("wiki_namespaces"),
		_mwtFileNamespace = editor.getParam("wiki_fileNamespace");		

	_userThumbsize = _thumbsizes[ mw.user ? mw.user.options.get('thumbsize') : 3 ];
	
//DC always have the advtab leave for now incase want to repurpose?
/*	if (!editor.settings.image_advtab) {
		return;
	}*/

	// display and process upload form
	function showDialog(dialogData) {
		var format, pclass, win, data = {}, dom = editor.dom, imgElm, figureElm, srcType = 'File';
		var width, height, link, imageListCtrl, classListCtrl, dialogData = {};
		var imageDimensions = editor.settings.image_dimensions !== false;
		var userMayUpload = true;
		var userMayUploadFromURL = false;

		//Check and process upload permissions
		function checkPermisionsOk() {
			if (mw.config.get( 'wgReadOnly' )) {
				editor.windowManager.alert(mw.config.get( 'wgReadOnly' ));
				return false;
			}

			if (!mw.config.get( 'wgEnableUploads' )) {
				editor.windowManager.alert(mw.msg("tinymce-upload-alert-uploads-not-enabled"));
				return false;
			}

			if (mw.config.get( 'wgTinyMCEUserIsBlocked' )) {
				editor.windowManager.alert(mw.msg("tinymce-upload-alert-uploads-not-allowed"));
				return false;
			}

			if (!mw.config.get( 'wgTinyMCEUserMayUpload' )) {
				userMayUpload = false;
				return true;
			}

			if (mw.config.get( 'wgTinyMCEUserMayUploadFromURL' )) {
				userMayUploadFromURL = true;;
				return true;
			}

			return true;
		}

		// check if files of with given extension are allowed to be uploaded
		function checkFileExtensionIsAllowed(extension) {
			var checkFileExtensions = (mw.config.get( 'wgCheckFileExtensions' )),
				strictFileExtensions = (mw.config.get( 'wgStrictFileExtensions' )),
				allowedsFileExtensions = (mw.config.get( 'wgFileExtensions' )),
				disallowedsFileExtensions = (mw.config.get( 'wgFileBlacklist' )),
				extensionAllowed;

			if (disallowedsFileExtensions) {
				for (fileExtension in disallowedsFileExtensions) {
					if (disallowedsFileExtensions[fileExtension].toLowerCase() == extension.toLowerCase()) {
						return false;
					}
				}
			}

			extensionAllowed = true;
			if (checkFileExtensions) {
				if (strictFileExtensions) {
					extensionAllowed = false;
					for (fileExtension in allowedsFileExtensions) {
						if (allowedsFileExtensions[fileExtension].toLowerCase() == extension.toLowerCase()) {
							extensionAllowed = true;
						}
					}
				}
			}
			return extensionAllowed;
		}

		// cleans submitted data to ensure all datatypes are valid
		function cleanSubmittedData(submittedData) {
			if (!submittedData.type) submittedData.type = '';
			if (!submittedData.src) submittedData.src = '';
			if (!submittedData.alternatesrc) submittedData.alternatesrc = '';
			if (!submittedData.title) submittedData.alt = '';
			if (!submittedData.summary) submittedData.summary = '';
			if (!submittedData.alt) submittedData.alt = '';
			if (!submittedData.link) submittedData.link = '';
			if (submittedData.width === '') submittedData.width = null;
			if (submittedData.height === '') submittedData.height = null;
			if (!submittedData.horizontalalignment) submittedData.horizontalalignment = '';
			if (!submittedData.verticalalignment) submittedData.verticalalignment = '';
			if (!submittedData.format) submittedData.format = '';
			return submittedData;
		}

		// get details of file already uploaded to wiki including url
		function getFileDetailsFromWiki(fileName) {
			var fileDetails = false;
			
			queryData = new FormData();
			queryData.append("action", "query");
			queryData.append("prop", "imageinfo");
			queryData.append("iiprop", "url");
			queryData.append("iiurlwidth", _userThumbsize);
			queryData.append("titles", fileName);
			queryData.append("format", "json");
			
			//as we now have created the data to send, we send it...
			$.ajax( { //http://stackoverflow.com/questions/6974684/how-to-send-formdata-objects-with-ajax-requests-in-jquery
				url: _mwtWikiApi, //url to api.php
				contentType:false,
				processData:false,
				type:'POST',
				data: queryData,//the queryData object we created above
				async: false,
				success:function(data){
					if (typeof data.query == "undefined") {
						fileDetails = JSON.parse(data)
					} else if (typeof data.query.pages != "undefined") {
						var pages = data.query.pages;
						for( var page in pages ) {
							if ((typeof pages[page].missing == "undefined") && (typeof pages[page].invalid == "undefined") ) {
								var pageTitle = pages[page].title
								if (typeof pages[page].imageinfo == "undefined") {
									imageURL = title;
								} else {
									var imageInfo = pages[page].imageinfo;
									if (typeof imageInfo[0].thumburl == "undefined") {
										imageURL = imageInfo[0].url;
									} else {
										imageURL = imageInfo[0].thumburl;							
									}
								}
								if (pageTitle.replace(/_/g," ").toLowerCase() == fileName.replace(/_/g," ").toLowerCase()) {
									fileDetails = imageURL;
								}
							}
						}
					}
				},
				error:function(xhr,status, error){
				}
			});
			return fileDetails;
		}

		function onBeforeCall(e) {
			e.meta = win.toJSON();
		}

		// called when the type of the file upload is changed
		function typeChange(e) {
			var typeCtrl = win.find('#type')[0],
				srcCtrl = win.find('#src')[0],
				alternateSrcCtrl = win.find('#alternatesrc')[0],
				destCtrl = win.find('#dest')[0]
				summaryCtrl = win.find('#summary')[0],
				dummySummaryCtrl = win.find('#dummySummary')[0],
				sourceType = typeCtrl.value();

			if (sourceType == 'File') { // local Fle upload
				// enable filepicker and summary input
				alternateSrcCtrl.visible(false);
				srcCtrl.visible(true);
				dummySummaryCtrl.visible(false);
				summaryCtrl.visible(true);
			} else if (sourceType == 'URL') { // URL upload
				if (!userMayUploadFromURL) {
					editor.windowManager.alert(mw.msg("tinymce-upload-alert-uploads-not-allowed"));
					typeCtrl.value('File');
					return;
				}
				// disable filepicker and enable summary inpt
				srcCtrl.visible(false);
				alternateSrcCtrl.visible(true);
				dummySummaryCtrl.visible(false);
				summaryCtrl.visible(true);
			} else if (sourceType == 'Wiki') { // file already uploaded to wiki
				// disable filepicker and summary inpt
				srcCtrl.visible(false);
				alternateSrcCtrl.visible(true);
				summaryCtrl.visible(false);
				dummySummaryCtrl.visible(true);
			}
			return;
		}

		// called when the source for the upload changes
		function srcChange(e) {
			var typeCtrl = win.find('#type')[0],
				srcCtrl = win.find('#src')[0],
				alternateSrcCtrl = win.find('#alternatesrc')[0],
				destCtrl = win.find('#dest')[0]
				summaryCtrl = win.find('#summary')[0],
				dummySummaryCtrl = win.find('#dummySummary')[0];

			var sourceType = typeCtrl.value(),
				srcURL,
				prependURL,
				absoluteURLPattern,
				meta = e.meta || {};

			if ((sourceType == 'File') || (sourceType == 'URL')) {	//Pre process local file upload
				if (sourceType == 'File') {
					tinymce.each(meta, function(value, key) {
						win.find('#' + key).value(value);
					});
					if (meta.srccontent) {
						_srccontent = meta.srccontent;
					}
					srcURL = editor.convertURL(this.value(), 'src');
					// Pattern test the src url and make sure we haven't already prepended the url
					prependURL = editor.settings.image_prepend_url;
					absoluteURLPattern = new RegExp('^(?:[a-z]+:)?//', 'i');
					if (prependURL && !absoluteURLPattern.test(srcURL) && srcURL.substring(0, prependURL.length) !== prependURL) {
						srcURL = prependURL + srcURL;
					}
					this.value(srcURL); //reset the value of this field to the propper src name which is striped of its path
				} else { // type is URL
					srcURL = alternateSrcCtrl.value();
					srcURL = srcURL.split('/').pop().split('#')[0].split('?')[0];
				}
			} else if (sourceType == 'Wiki') {	//Pre process display file already uploaded to wiki
				srcURL = alternateSrcCtrl.value();

				// strip off any prefixes like 'File:'
				while (srcURL.match(/\:/gmi)) {
					srcURL = srcURL.replace(/.*?\:(.*$)/, '$1');
				}
			}

			destCtrl.value(srcURL); // initially set the valueof the dest field to be the same as the src field
			destCtrl.fire('change'); // initially set the valueof the dest field to be the same as the src field
		}

		// called when the destination for the upload changes
		function destChange(e) {

			var typeCtrl = win.find('#type')[0],
				srcCtrl = win.find('#src')[0],
				alternateSrcCtrl = win.find('#alternatesrc')[0],
				destCtrl = win.find('#dest')[0]
				summaryCtrl = win.find('#summary')[0],
				dummySummaryCtrl = win.find('#dummySummary')[0],
				sourceType = typeCtrl.value(),
				destinationFile = _mwtFileNamespace + ':' + destCtrl.value();

			var destinationFileDetails,
				file,
				extension,
				extensionAllowed;

			// see if file already on wiki and return details if it is
			destinationFileDetails = getFileDetailsFromWiki(destinationFile);

// DC TODO want to avoid File: as not multilingual
/*			// strip off any prefixes the just add 'File:'
			while (destinationFileDetails.match(/\:/gmi)) {
				destinationFileDetails = destinationFileDetails.replace(/.*?\:(.*$)/, '$1');
			}
			destinationFileDetails = 'File:' + destinationFileDetails;*/

			// encountered an error trying to access the api
			if (typeof destinationFileDetails.error != "undefined") {
					editor.windowManager.alert(mw.msg("tinymce-upload-alert-error-uploading-to-wiki"));
					srcCtrl.focus();
					return;
			}

			if (sourceType == 'File' || sourceType == 'URL') { // file is to uploaded
				if (destinationFileDetails) { // file of this name already exists on this wiki
					editor.windowManager.confirm(mw.msg("tinymce-upload-confirm-file-already-exists"),
						function(ok) {
							if (ok) {
								file = destinationFile.split('/').pop().split('#')[0].split('?')[0];
								typeCtrl.value('Wiki');
								alternateSrcCtrl.value(file);
								// disable filepicker and summary inpt
								srcCtrl.visible(false);
								alternateSrcCtrl.visible(true);
								summaryCtrl.visible(false);
								dummySummaryCtrl.visible(true);
								destCtrl.focus();
							} else {
								destCtrl.value('');
								destCtrl.focus();
							}
						});

					destCtrl.focus();
					return;
				} else { // check if files of this type allowed to be uploaded?
					file = destinationFile.split('/').pop().split('#')[0].split('?')[0];
					extension = file.split('.').pop();
					extensionAllowed = checkFileExtensionIsAllowed(extension);
					if (!extensionAllowed) {
							editor.windowManager.alert(mw.msg("tinymce-upload-alert-file-type-not-allowed"));
							srcCtrl.focus();
							srcCtrl.value('');
							destCtrl.value('');
							return;
					}
				}
			} else if (sourceType == 'Wiki') {
				if (!destinationFileDetails) {
					editor.windowManager.confirm(mw.msg("tinymce-upload-confirm-file-not-on-wiki"),
						function(ok) {
							if (ok) {
								typeCtrl.value('File');
								srcCtrl.value('');
								// enable filpicker and summary input
								alternateSrcCtrl.visible(false);
								srcCtrl.visible(true);
								dummySummaryCtrl.visible(false);
								summaryCtrl.visible(true);
								destCtrl.value('');
							} else {
								srcCtrl.value('');
								destCtrl.value('');
							}
						});
					srcCtrl.focus();
				}
			}
			return;
		}

		// called when the constrain for dimensions changes
		function constrainChange() {
			//toggles height control on or off depending
			var heightCtrl = win.find('#height')[0],
				dummyHeightCtrl = win.find('#dummyheight')[0];

			if (win.find('#constrain')[0].checked() && heightCtrl) {
				dummyHeightCtrl.visible(true);
				heightCtrl.visible(false);
			} else {
				dummyHeightCtrl.visible(false);
				heightCtrl.visible(true);
			}
			return;
		}

		function displayForm(dialogData) {
			// set up defaults using previously enterred data if any
			if (!dialogData.type) dialogData.type = 'File';
			if (!dialogData.src) dialogData.src = '';
			if (!dialogData.dest) dialogData.dest = dialogData.src;
			if (!dialogData.title) dialogData.title = '';
			if (!dialogData.summary) dialogData.summary = '';
			if (!dialogData.link) dialogData.link = '';
			if (!dialogData.alt) dialogData.alt = '';
			if (dialogData.constrain != false) dialogData.constrain = true;
			if (!dialogData.width) dialogData.width = null;
			if (!dialogData.height) dialogData.height = null;
			if (!dialogData.horizontalalignment) dialogData.horizontalalignment = 'right';
			if (!dialogData.verticalalignment) dialogData.verticalalignment = 'middle';
			if (!dialogData.format) dialogData.format = 'thumb';

			if (imgElm) { //Populate form with details of existing upload

				dialogData.type = 'Wiki';
/*				dialogData.src = dom.getAttrib(imgElm, 'data-mwt-src').split('/').pop().split('#')[0].split('?')[0];
				if (dialogData.src == 'false') dialogData.src = '';
				dialogData.dest = dialogData.src;
				dialogData.summary = '';
				dialogData.title = dom.getAttrib(imgElm, 'data-mwt-title');
				if ( dialogData.title == 'false') dialogData.title = '';
				dialogData.link = dom.getAttrib(imgElm, 'data-mwt-link');
				if (dialogData.link == 'false') dialogData.link = '';
				dialogData.alt = dom.getAttrib(imgElm, 'data-mwt-alt');
				if ( dialogData.alt == 'false') dialogData.alt = '';
				if (dialogData.constrain != false) dialogData.constrain = true;
				dialogData.width = dom.getAttrib(imgElm, 'data-mwt-sizewidth');
				if ( dialogData.width == 'false') dialogData.width = null;
				dialogData.height = dom.getAttrib(imgElm, 'data-mwt-sizeheight');
				if ( dialogData.height == 'false') dialogData.height = null;
				dialogData.horizontalalignment = dom.getAttrib(imgElm, 'data-mwt-horizontalalign');
				if (( dialogData.width ) && ( dialogData.height )) dialogData.constrain = false;
				if ( dialogData.horizontalalignment == 'false') dialogData.horizontalalignment = null;
				dialogData.verticalalignment = dom.getAttrib(imgElm, 'data-mwt-verticalalign');
				if ( dialogData.verticalalignment == 'false') dialogData.verticalalignment = null;
				dialogData.format = dom.getAttrib(imgElm, 'data-mwt-format');
				if ( dialogData.format == 'false') dialogData.format = '';*/
//**************

				var wikiImageObject = [],
					aLink,
					parts,
					part = '',
					unsuffixedValue, 
					dimensions, 
					kvpair, 
					key, 
					value, 
					src,
					parserResult = [],
					imageText,
					imageHTML,
					imageWikiText,
					displayImageWikiText,
					t,
					id,
					el,
					codeAttrs;
		
				wikiImageObject.horizontalalignment = '';
				wikiImageObject.verticalalignment = '';
				wikiImageObject.format = '';
				aLink = dom.getAttrib(imgElm, 'data-mwt-wikitext');
				aLink = aLink.replace(/<@@bnl@@>/gmi,"");
				// remove brackets and split into patrts
				parts = aLink.substr(2, aLink.length - 4).split("|"); 
//				wikiImageObject.imagename = parts[0].split(':').pop();
				wikiImageObject.imagename = parts[0];
				for (var i = 1; i < parts.length; i++) {
					part = parts[i];
					if (part.substr(part.length - 2, 2) == 'px') {
						// Hint: frame ignores size but we want to keep this information
						// See: mediawiki.org/wiki/Help:Images#Size_and_frame
		
						// 100x200px -> 100x200
						unsuffixedValue = part.substr(0, part.length - 2);
						// 100x200 -> [100,200]
						dimensions = unsuffixedValue.split('x');
						if (dimensions.length === 2) {
							wikiImageObject.sizewidth = (dimensions[0] === '') ? false : dimensions[0];
							wikiImageObject.sizeheight = dimensions[1];
						} else {
							wikiImageObject.sizewidth = unsuffixedValue;
						}
		
						continue;
					}
		
					if ($.inArray(part, ['right']) !== -1) {
						wikiImageObject.horizontalalignment = 'right';
						continue;
					}
		
					if ($.inArray(part, ['left']) !== -1) {
						wikiImageObject.horizontalalignment = 'left';
						continue;
					}
		
					if ($.inArray(part, ['center']) !== -1) {
						wikiImageObject.horizontalalignment = 'center';
						continue;
					}
		
					if ($.inArray(part, ['none']) !== -1) {
						wikiImageObject.horizontalalignment = 'none';
						continue;
					}
		
					if ($.inArray(part, ['middle']) !== -1) {
						wikiImageObject.verticalalign = 'middle';
						continue;
					}
		
					if ($.inArray(part, ['top']) !== -1) {
						wikiImageObject.verticalalign = 'top';
						continue;
					}
		
					if ($.inArray(part, ['bottom']) !== -1) {
						wikiImageObject.verticalalign = 'bottom';
						continue;
					}
		
					if ($.inArray(part, ['baseline']) !== -1) {
						wikiImageObject.verticalalign = 'baseline';
						continue;
					}
		
					if ($.inArray(part, ['sub']) !== -1) {
						wikiImageObject.verticalalign = 'sub';
						continue;
					}
		
					if ($.inArray(part, ['super']) !== -1) {
						wikiImageObject.verticalalign = 'super';
						continue;
					}
		
					if ($.inArray(part, ['text-top']) !== -1) {
						wikiImageObject.verticalalign = 'text-top';
						continue;
					}
		
					if ($.inArray(part, ['text-bottom']) !== -1) {
						wikiImageObject.verticalalign = 'text-bottom';
						continue;
					}
		
					if ($.inArray(part, ['thumb']) !== -1) {
						wikiImageObject.format = 'thumb';
						continue;
					}
		
					if ($.inArray(part, ['frame']) !== -1) {
						wikiImageObject.format = 'frame';
						continue;
					}
		
					if ($.inArray(part, ['frameless']) !== -1) {
						wikiImageObject.format = 'frameless';
						continue;
					}
		
					if ($.inArray(part, ['border']) !== -1) {
						wikiImageObject.format = 'border';
						continue;
					}
		
					kvpair = part.split('=');
					if (kvpair.length === 1) {
						wikiImageObject.caption = part; //hopefully
						wikiImageObject.title = wikiImageObject.caption;
						continue;
					}
		
					key = kvpair[0];
					value = kvpair[1];
		
					if ($.inArray(key, ['link']) !== -1) {
						wikiImageObject.link = value;
						continue;
					}
		
					if ($.inArray(key, ['title']) !== -1) {
						wikiImageObject.caption = value;
						wikiImageObject.title = value;
						continue;
					}
		
					if ($.inArray(key, ['caption']) !== -1) {
						wikiImageObject.caption = value;
						wikiImageObject.title = value;
						continue;
					}
		
					if ($.inArray(key, ['upright']) !== -1) {
						wikiImageObject.upright = value;
						continue;
					}
		
					if (key === 'alt') {
						wikiImageObject.alt = value;
						continue;
					}
				}
		
//				dialogData.src = dom.getAttrib(imgElm, 'data-mwt-src').split('/').pop().split('#')[0].split('?')[0];
				dialogData.src = wikiImageObject.imagename;
				if (dialogData.src == 'false') dialogData.src = '';
				dialogData.dest = dialogData.src;
				dialogData.summary = '';
				dialogData.title = wikiImageObject.title;
				if ( dialogData.title == 'false') dialogData.title = '';
				dialogData.link = wikiImageObject.link;
				if (dialogData.link == 'false') dialogData.link = '';
				dialogData.alt = wikiImageObject.alt;
				if ( dialogData.alt == 'false') dialogData.alt = '';
				if (dialogData.constrain != false) dialogData.constrain = true;
				dialogData.width = wikiImageObject.sizewidth;
				if ( dialogData.width == 'false') dialogData.width = null;
				dialogData.height = wikiImageObject.sizeheight;
				if ( dialogData.height == 'false') dialogData.height = null;
				dialogData.horizontalalignment = wikiImageObject.horizontalalignment;
				if (( dialogData.width ) && ( dialogData.height )) dialogData.constrain = false;
				if ( dialogData.horizontalalignment == 'false') dialogData.horizontalalignment = null;
				dialogData.verticalalignment = wikiImageObject.verticalalignment;
				if ( dialogData.verticalalignment == 'false') dialogData.verticalalignment = null;
				dialogData.format = wikiImageObject.format;
				if ( dialogData.format == 'false') dialogData.format = '';
		

//**************
			}

			// setup the list of upload types according to user permissions
			var typelist = [];
			if (userMayUpload) {
				typelist.push({text: mw.msg("tinymce-upload-type-label-file"), value: "File"});
				if (userMayUploadFromURL) {
					typelist.push({text: mw.msg("tinymce-upload-type-label-url"), value: "URL"});
				}
			}
			typelist.push({text: mw.msg("tinymce-upload-type-label-wiki"), value: "Wiki"});
			if (!userMayUpload) dialogData.type = "Wiki";

			//setup the form controls
			typeListCtrl = {
				name: 'type',
				type: 'listbox',
				label: mw.msg("tinymce-upload-type-label"),
				tooltip: mw.msg("tinymce-upload-type-tooltip"),
				autofocus: true,
				value: dialogData.type,
				onselect: typeChange,
				values: typelist,
			};

			srcTextCtrl = {
				type: 'container',
				label: mw.msg("tinymce-upload-source-label"),
				tooltip: mw.msg("tinymce-upload-source-tooltip"),
				minHeight: 30,
				layout: 'fit',
				style: "position: realtive; width: 100%",
				align: 'center',
				items: [
					{name: 'alternatesrc',
						type: 'textbox',
						value: dialogData.src,
						style: "position: absolute; top: 0; left: 0",
						onchange: srcChange,
						onbeforecall: onBeforeCall,
						visible: !userMayUpload},
					{name: 'src',
						type: 'filepicker',
						filetype: 'image',
						style: "position: absolute; top: 0; right: 0",
						value: dialogData.src,
						onchange: srcChange,
						onbeforecall: onBeforeCall,
						visible: userMayUpload},
				]
			};

			srcTextDisplay = {
				name: 'src',
				type: 'textBox',
				label: mw.msg("tinymce-upload-source-label"),
				value: dialogData.src,
				disabled: true,
			};

			destTextCtrl = {
				name: 'dest',
				type: 'textbox',
				label: mw.msg("tinymce-upload-destination-label"),
				tooltip: mw.msg("tinymce-upload-destination-tooltip"),
				value: dialogData.dest,
				onchange: destChange,
			};

			titleTextCtrl = {
				name: 'title',
				label: mw.msg("tinymce-upload-title-label"),
				tooltip: mw.msg("tinymce-upload-title-tooltip"),
				type: 'textbox',
				value: dialogData.title,
			};

			summaryTextCtrl = {
				type: 'container',
				label: mw.msg("tinymce-upload-summary-label"),
				layout: 'fit',
				minHeight: 90,
				style: "position: realtive; width: 100%",
				align: 'center',
				items: [
					{name: 'dummySummary',
						type: 'textbox',
						multiline: 'true',
						style: "background: #f0f0f0; position: absolute; width: 100%; height: 100%; top: 0; left: 0",
						disabled: true,
						visible: false},
					{name: 'summary',
						tooltip: mw.msg("tinymce-upload-summary-tooltip"),
						type: 'textbox',
						multiline: 'true',
						value: dialogData.summary,
						style: "position: absolute; width: 100%; height: 100%; top: 0; right: 0",
						visible: true},
				]
			};

			linkTextCtrl = {
				name: 'link',
				label: mw.msg("tinymce-upload-link-label"),
				tooltip: mw.msg("tinymce-upload-link-tooltip"),
				type: 'textbox',
				value: dialogData.link,
			};

			altTextCtrl = {
				name: 'alt',
				label: mw.msg("tinymce-upload-alttext-label"),
				tooltip: mw.msg("tinymce-upload-alttext-tooltip"),
				type: 'textbox',
				value: dialogData.alt,
			};

			imageDimensionsCtrl = {
				type: 'container',
				label: mw.msg("tinymce-upload-dimensions-label"),
				tooltip: mw.msg("tinymce-upload-dimensions-tooltip"),
				layout: 'flex',
				direction: 'row',
				align: 'center',
				spacing: 5,
				items: [
					{name: 'constrain',
						type: 'checkbox',
						text: mw.msg("tinymce-upload-dimensions-constrain-text"),
						tooltip: mw.msg("tinymce-upload-dimensions-tooltip"),
						checked: dialogData.constrain,
						onchange: constrainChange
						},
					{name: 'width',
						type: 'textbox',
						label: mw.msg("tinymce-upload-dimensions-width-label"),
						tooltip: mw.msg("tinymce-upload-dimensions-tooltip"),
						value: dialogData.width,
						maxLength: 5,
						size: 3
						},
					{type: 'label',
						text: 'x'},
					{name: 'dummyheight',
						type: 'textbox',
						label: mw.msg("tinymce-upload-dimensions-height-label"),
						maxLength: 5,
						size: 3,
						style: "background: #f0f0f0",
						disabled: dialogData.constrain,
						visible: dialogData.constrain
					},
					{name: 'height',
						type: 'textbox',
						label: mw.msg("tinymce-upload-dimensions-height-label"),
						tooltip: mw.msg("tinymce-upload-dimensions-tooltip"),
						value: dialogData.height,
						maxLength: 5,
						size: 3,
						visible: !dialogData.constrain
					},
				]
			};

			verticalAlignListCtrl = {
				type   : 'listbox',
				name   : 'verticalalignment',
				label  : mw.msg("tinymce-upload-vertalign-label"),
				tooltip: mw.msg("tinymce-upload-vertalign-tooltip"),
				value  : dialogData.verticalalignment,
				values :
					[
						{ text: mw.msg("tinymce-upload-vertalign-middle-text"), value: 'middle' },
						{ text: mw.msg("tinymce-upload-vertalign-top-text"), value: 'top' },
						{ text: mw.msg("tinymce-upload-vertalign-bottom-text"), value: 'bottom' },
						{ text: mw.msg("tinymce-upload-vertalign-baseline-text"), value: 'baseline' },
						{ text: mw.msg("tinymce-upload-vertalign-sub-text"), value: 'sub' },
						{ text: mw.msg("tinymce-upload-vertalign-super-text"), value: 'super' },
						{ text: mw.msg("tinymce-upload-vertalign-texttop-text"), value: 'text-top' },
						{ text: mw.msg("tinymce-upload-vertalign-textbottom-text"), value: 'text-bottom'}
					]
			};

			horizontalAlignListCtrl = {
				type   : 'listbox',
				name   : 'horizontalalignment',
				label  : mw.msg("tinymce-upload-horizontalalign-label"),
				tooltip: mw.msg("tinymce-upload-horizontalalign-tooltip"),
				value  : dialogData.horizontalalignment,
				values :
					[
						{ text: mw.msg("tinymce-upload-horizontalalign-left-text"), value: 'left' },
						{ text: mw.msg("tinymce-upload-horizontalalign-centre-text"), value: 'center' },
						{ text: mw.msg("tinymce-upload-horizontalalign-right-text"), value: 'right' },
						{ text: mw.msg("tinymce-upload-horizontalalign-none-text"), value: 'none'}
					]
			};

			formatListCtrl = {
				type   : 'listbox',
				name   : 'format',
				label  : mw.msg("tinymce-upload-format-label"),
				tooltip: mw.msg("tinymce-upload-format-tooltip"),
				value  : dialogData.format,
				values :
					[
						{ text: mw.msg("tinymce-upload-format-thumb-text"), value: 'thumb' },
						{ text: mw.msg("tinymce-upload-format-border-text"), value: 'border' },
						{ text: mw.msg("tinymce-upload-format-frame-text"), value: 'frame' },
						{ text: mw.msg("tinymce-upload-format-frameless-text"), value: 'frameless'},
						{ text: mw.msg("tinymce-upload-format-none-text"), value: '' }
					]
			};

			if (imgElm) { // editing an existing image node

				var generalFormItems = [
					srcTextDisplay,
					titleTextCtrl,
					linkTextCtrl,
					altTextCtrl,
					imageDimensionsCtrl,
					verticalAlignListCtrl,
					horizontalAlignListCtrl,
					formatListCtrl
				];

			} else { // new upload from local file store or url
				var generalFormItems = [
					typeListCtrl,
					srcTextCtrl,
					destTextCtrl,
					titleTextCtrl,
					summaryTextCtrl,
				];

				var imageFormItems = [
					linkTextCtrl,
					altTextCtrl,
					imageDimensionsCtrl,
					verticalAlignListCtrl,
					horizontalAlignListCtrl,
					formatListCtrl
				];

			}

			if (imgElm) { // edit existing image display
				data.style = editor.dom.serializeStyle(editor.dom.parseStyle(editor.dom.getAttrib(imgElm, 'style')));
				win = editor.windowManager.open({
					title: 'Update image display properties',
					data: data,
					body: generalFormItems,
					onSubmit: onSubmitForm
				});
			} else { // new upload
				win = editor.windowManager.open({
					title: mw.msg("tinymce-upload-title"),
					data: data,
					bodyType: 'tabpanel',
					body: [
						{
							title: mw.msg("tinymce-upload-title-general"),
							type: 'form',
							items: generalFormItems
						},
						{
							title: mw.msg("tinymce-upload-title-image"),
							type: 'form',
							pack: 'start',
							items: imageFormItems
						}
					],
					onSubmit: onSubmitForm
				});
			}
		}

		function onSubmitForm(e) {
			var srcCtrl = win.find('#src')[0],
				alternateSrcCtrl = win.find('#alternatesrc')[0],
				destCtrl = win.find('#dest')[0];

			var submittedData = win.toJSON();

			var figureElm,
				uploadDetails,
				uploadResult,
				fileType,
				fileContent,
				fileName,
				fileSummary,
				ignoreWarnings,
				wikitext = '';

			// attempt upload of file to wiki
			function doUpload(fileType, fileToUpload, fileName, fileSummary, ignoreWarnings){
				var uploadDetails;
/*				uploadData = new FormData();
				uploadData.append("action", "upload");
				uploadData.append("filename", fileName);
				uploadData.append("text", fileSummary);
				uploadData.append("token", mw.user.tokens.get( 'csrfToken' ) );
				uploadData.append("ignorewarnings", ignoreWarnings );
				if (fileType == 'File') uploadData.append("file", fileToUpload);
				if (fileType == 'URL') uploadData.append("url", fileToUpload);
				uploadData.append("format", 'json');*/

			var uploadData = new FormData();
			uploadData.append("action", "upload");
			uploadData.append("filename", fileName);
			uploadData.append("text", fileSummary);
			uploadData.append("token", mw.user.tokens.get( 'csrfToken' ) );
			uploadData.append("ignorewarnings", ignoreWarnings );
			if (fileType == 'File') uploadData.append("file", fileToUpload);
			if (fileType == 'URL') uploadData.append("url", fileToUpload);
			uploadData.append("format", 'json');

			var wikiUpload = JSON.parse(
				$.ajax({
					url: mw.util.wikiScript('api'),
					contentType:false,
					processData:false,
					type:'POST',
					data: uploadData,
					async: false
				}))
				.responseText;

			editor.windowManager.alert(wikiUpload);
			uploadDetails = wikiUpload;
			
				//as we now have created the data to send, we send it...
				$.ajax( { //http://stackoverflow.com/questions/6974684/how-to-send-formdata-objects-with-ajax-requests-in-jquery
					url: _mwtWikiApi, //url to api.php
					contentType:false,
					processData:false,
					type:'POST',
					async: false,
//					data: uploadData,//the formdata object we created above
					data: upData,
					success:function(data){
						uploadDetails = data.upload;
					},
					error:function(xhr,status, error){
						uploadDetails['responseText'] = xhr.responseText;
						console.log(error);
					}
				});

				return uploadDetails;
			}

			// check upload succesful or report errors and warnings
			function checkUploadDetail(uploadDetails, ignoreWarnings) {
				var message,
					result = [];
					
				if (typeof uploadDetails == "undefined") {
					editor.windowManager.alert(mw.msg("tinymce-upload-alert-unknown-error-uploading"));
					result = false;
				} else if (typeof uploadDetails.responseText != "undefined") {
					message = mw.msg("tinymce-upload-alert-error-uploading",uploadDetails.responseText);
					editor.windowManager.alert(message);
					result = false;
				} else if (typeof uploadDetails.error != "undefined") {
					message = mw.msg("tinymce-upload-alert-error-uploading",uploadDetails.error.info);
					editor.windowManager.alert(message);
					result = false;
				} else if (typeof uploadDetails.warnings != "undefined" && (!ignoreWarnings)) {
					message = mw.msg("tinymce-upload-alert-warnings-encountered") + "\n\n" ;  
					result = 'warning';
					for (warning in uploadDetails.warnings) {
						warningDetails = uploadDetails.warnings[warning];
						if (warning == 'badfilename') {
							message = message + "	" + mw.msg("tinymce-upload-alert-destination-filename-not-allowed") + "\n";
							result = false;
						} else if (warning == 'exists') {
							// this warning will also be trapped by destchange so just return warning
							message = message + "	" + mw.msg("tinymce-upload-alert-destination-filename-already-exists") + "\n";
							result = false;
						} else if (warning == 'duplicate') {
							duplicate = warningDetails[0];
							message = message + "	" + mw.msg("tinymce-upload-alert-duplicate-file",duplicate) + "\n"
						} else {
							message = message + "	" + mw.msg("tinymce-upload-alert-other-warning",warning) + "\n"
							result = false;
						}
					}
					if (result == 'warning') {
						result = false;
						message = message + "\n" + mw.msg("tinymce-upload-confirm-ignore-warnings");
						editor.windowManager.confirm(message,
							function(ok) {
								if (ok) {
									result = 'ignore_warning';
								} else {
									result = false;
								}
							}
						);
					} else {
						message = message + "\n" + mw.msg("tinymce-upload-alert-correct-and-try-again");
						editor.windowManager.alert(message);		
						result = false;
					}
				} else if (typeof uploadDetails.imageinfo != "undefined") {
					result["url"] = uploadDetails.imageinfo.url;
					result["page"] = uploadDetails.imageinfo.canonicaltitle;
				}
				return result;
			}

			// prevent processing of submit in case warnings or errors need to be processed
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();

			submittedData = cleanSubmittedData(submittedData);
			uploadDetails = [];
			result = [];
			uploadResult = '';
			uploadPage = '';
			ignoreWarnings = false;

			// have to have a destination name unless editing previous upload
			if (!submittedData.dest && !imgElm) {
				// user may have clicked submit without exiting source field
				editor.windowManager.alert(mw.msg("tinymce-upload-alert-destination-filename-needed"));
				return;
			}

			if (imgElm) { // Editing image node so skip upload
//				uploadPage = dom.getAttrib(imgElm, 'data-mwt-src');
				uploadPage = submittedData.src;
			} else {
				if ((submittedData.type == 'File') || (submittedData.type == 'URL')) {
					if (submittedData.type == 'File') {
						fileContent = _srccontent;
					} else {
						fileContent = submittedData.alternatesrc;
					}
					fileType = submittedData.type;
					fileName = submittedData.dest;
					fileSummary = submittedData.summary;
					if ((fileContent) && (fileName)) {
						do {
							uploadDetails = doUpload(fileType, fileContent, fileName, fileSummary, ignoreWarnings);
							result = checkUploadDetail(uploadDetails, ignoreWarnings);
							uploadResult = result["url"];
							uploadPage = result["page"];
							if (uploadResult == 'ignore_warning') {
								ignoreWarnings = true;
							} else {
								ignoreWarnings = false;								
							}
						} while (ignoreWarnings)
						if (uploadResult == false) {
							return;
						}
				  	} else {
						editor.windowManager.alert(mw.msg("tinymce-upload-alert-source-or-destination-undefined"));
						return;
					}
				} else if (submittedData.type == 'Wiki') {
					fileName = submittedData.dest;
					uploadPage = _mwtFileNamespace + ":" + fileName;
				}
			}
			//set up wiki text for inserting or updating in editor window
			if (submittedData.constrain) {
				submittedData.height = false;
			}

			wikitext += "[[" + uploadPage;
			if (submittedData.width) {
				wikitext += "|" + submittedData.width;
				if (submittedData.height) {
					wikitext += "x" + submittedData.height + "px";
				} else {
				wikitext += "px"
				}
			} else if (submittedData.height) {
				wikitext += "|x" + submittedData.height + "px";
			}
			if (submittedData.link) {
				wikitext += "|link=" + submittedData.link;
			}
			if (submittedData.alt) {
				wikitext += "|alt=" + submittedData.alt;
			}
			if (submittedData.horizontalalignment) {
				wikitext += "|" + submittedData.horizontalalignment;
			}
			if (submittedData.verticalalignment) {
				wikitext += "|" + submittedData.verticalalignment;
			}
			if (submittedData.format) {
				wikitext += "|" + submittedData.format;
			}
			if (submittedData.title) {
				wikitext += "|" + submittedData.title;
			}
			wikitext += "]]";

			editor.undoManager.transact(function(){
				editor.focus();
				editor.selection.setContent(wikitext, {format: 'wiki', convert2html: 'true'});
				editor.undoManager.add();
			});

			// close the dialog window
			win.close()

			return;
		}

		// abort if permissions not Ok
		if (!checkPermisionsOk()) return;

		imgElm = editor.selection.getNode();
		figureElm = dom.getParent(imgElm, 'figure.image');

		// if node is a link to an image then get the image
		if (figureElm) {
			imgElm = dom.select('img', figureElm)[0];
		}

		// test if we are modifying an existing upload else set to null
		if (imgElm && (imgElm.className.indexOf("mwt-image") < 0 || imgElm.getAttribute('data-mce-object') || imgElm.getAttribute('data-mce-placeholder'))) {
			imgElm = null;
		}

		//display and process upload form
		displayForm(dialogData);

		return;
	}

	editor.on('preInit', function() {
		function hasImageClass(node) {
			var className = node.attr('class');
			return className && /\bimage\b/.test(className);
		}

		function toggleContentEditableState(state) {
			return function(nodes) {
				var i = nodes.length, node;

				function toggleContentEditable(node) {
					node.attr('contenteditable', state ? 'true' : null);
				}

				while (i--) {
					node = nodes[i];

					if (hasImageClass(node)) {
						node.attr('contenteditable', state ? 'false' : null);
						tinymce.each(node.getAll('figcaption'), toggleContentEditable);
					}
				}
			};
		}

		editor.parser.addNodeFilter('figure', toggleContentEditableState(true));
		editor.serializer.addNodeFilter('figure', toggleContentEditableState(false));
	});

	editor.addButton('wikiupload', {
		icon: 'image',
		tooltip: mw.msg("tinymce-upload-menu-item-text"),
		onclick: showDialog,
		stateSelector: '.mwt-image'
	});

	editor.addMenuItem('wikiupload', {
		icon: 'image',
		text: mw.msg("tinymce-upload-menu-item-text"),
		onclick: showDialog,
		context: 'upload',
		prependToContext: true
	});

	editor.addCommand('mceImage', showDialog);
	
	// Add option to double-click on file to get
	// "upload" popup.
	editor.on('dblclick', function(e) {
		if (e.target.className.indexOf("mwt-image") > -1 ) {
			tinyMCE.activeEditor.execCommand('mceImage');
		}
	});

});
