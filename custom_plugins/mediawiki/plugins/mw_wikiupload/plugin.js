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

tinymce.PluginManager.add('wikiupload', function(editor) {
	var utility = editor.getParam("wiki_utility");
	
	var setSelection = utility.setSelection;
	
	var me = this,
		_srccontent,
		_userThumbsize = 3,
		_thumbsizes = ['120', '150', '180', '200', '250', '300'],
		_imageFileExtensions = ['apng', 'bmp', 'gif', 'ico', 'cur', 'jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'png', 'svg', 'tif', 'tiff', 'webp'],
		_lastChanged;

	var _mwtWikiApi = editor.getParam("wiki_api_path"),
		_mwtPageTitle = editor.getParam("wiki_page_mwtPageTitle"),
		_mwtNamespaces = editor.getParam("wiki_namespaces"),
		_mwtFileNamespace = editor.getParam("wiki_fileNamespace"),
		/**
		 *
		 * Function for checking this user wiki upoload permissions this wiki
		 * @type String
		 */
//		_mwtCheckUploadPermissions = editor.getParam("check_upload_permissions");
_mwtCheckUploadPermissions = function( editor ) {
		// function to check what upload permissions this user has
		// it will provide an alert if certain permissions aren't granted
		// and returns a value saying what permiossions the user has
		var permissions = [];
			
		// start by assuming nothing is allowed
		permissions['userMayUpload'] = false;
		permissions['userMayUploadFromURL'] = false;
		permissions['uploadsAllowed'] =  false;

		if (mw.config.get( 'wgTinyMCEUserMayUpload' )) {
			permissions['userMayUpload'] = true;
			permissions['uploadsAllowed'] =  true;
		}

		if (mw.config.get( 'wgTinyMCEUserMayUploadFromURL' )) {
			permissions['userMayUploadFromURL'] = true;
			permissions['uploadsAllowed'] =  true;
		}

		if (mw.config.get( 'wgReadOnly' )) {
			editor.windowManager.alert(mw.config.get( 'wgReadOnly' ));
			permissions['uploadsAllowed'] = false;
		}

		if (!mw.config.get( 'wgEnableUploads' )) {
			editor.windowManager.alert(mw.msg("tinymce-upload-alert-uploads-not-enabled"));
			permissions['uploadsAllowed'] = false;
		}

		if (mw.config.get( 'wgTinyMCEUserIsBlocked' )) {
			editor.windowManager.alert(mw.msg("tinymce-upload-alert-uploads-not-allowed"));
			permissions['uploadsAllowed'] = false;
		}
		return permissions;
	}

		// abort if permissions not Ok
//		if (!checkPermisionsOk()) return;
/*		uploadPersmissions = _mwtCheckUploadPermissions(editor);
		if ( !uploadPersmissions.uploadsAllowed ) return;*/


	_userThumbsize = _thumbsizes[ mw.user ? mw.user.options.get('thumbsize') : 3 ];
	
	function showWikiUploadDialog(dialogData) {
		var format, 
			pclass, 
			win, 
			data = {}, 
			dom = editor.dom, 
			imgElm, 
			figureElm, 
			srcType = 'File',
			width, 
			height, 
			link, 
			typelist = [],
			imageDimensions = editor.settings.image_dimensions !== false,
			uploadPersmissions = [];


		/**
		 * display upload dialog
		 *
		 * @param {String} text
		 * @returns {String}
		 */
		function displayUploadForm(dialogData, imgElm) {
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

			var typeListCtrl = {
					name: 'type',
					type: 'selectbox',
					label: mw.msg("tinymce-upload-type-label"),
					tooltip: mw.msg("tinymce-upload-type-tooltip"),
					autofocus: true,
					items: typelist,
				},
				fileSrcCtrl = {
					name: 'fileSrc',
		  			type: 'urlinput',
					label: mw.msg("tinymce-upload-source-label"),
					tooltip: mw.msg("tinymce-upload-source-tooltip"),
					filetype: 'image',
					disabled: !uploadPersmissions.userMayUpload
				},
				urlSrcCtrl = {
					name: 'urlSrc',
					type: 'input',
					label: mw.msg("tinymce-upload-source-label"),
					tooltip: mw.msg("tinymce-upload-source-tooltip"),
					disabled: !uploadPersmissions.userMayUpload
				},
				wikiSrcCtrl = {
					name: 'wikiSrc',
					type: 'input',
					label: mw.msg("tinymce-upload-source-label"),
					tooltip: mw.msg("tinymce-upload-source-tooltip"),
				},
				displaySrcCtrl = {
					name: 'displaySrc',
					type: 'input',
					label: mw.msg("tinymce-upload-source-label"),
					tooltip: mw.msg("tinymce-upload-source-tooltip"),
					disabled: true
				},
				srcTextDisplay = {
					name: 'srcText',
					type: 'input',
					label: mw.msg("tinymce-upload-source-label"),
					disabled: true,
				},
				destTextCtrl = {
					name: 'dest',
					type: 'input',
					label: mw.msg("tinymce-upload-destination-label"),
					tooltip: mw.msg("tinymce-upload-destination-tooltip"),
				},
				titleTextCtrl = {
					name: 'title',
					type: 'input',
					label: mw.msg("tinymce-upload-title-label"),
					tooltip: mw.msg("tinymce-upload-title-tooltip"),
				},
				dummySummary = {
					name: 'dummySummary',
					type: 'textarea',
					label: mw.msg("tinymce-upload-summary-label"),
					disabled: true,
				},
				summaryTextCtrl = {
					name: 'summary',
					type: 'textarea',
					label: mw.msg("tinymce-upload-summary-label"),
					tooltip: mw.msg("tinymce-upload-summary-tooltip"),
				},
				linkTextCtrl = {
					name: 'link',
					type: 'input',
					label: mw.msg("tinymce-upload-link-label"),
					tooltip: mw.msg("tinymce-upload-link-tooltip")
				},
				altTextCtrl = {
					name: 'alt',
					type: 'input',
					label: mw.msg("tinymce-upload-alttext-label"),
					tooltip: mw.msg("tinymce-upload-alttext-tooltip"),
				},
				imageDimensionsCtrl = {
					name: 'dimensions',
					type: 'sizeinput',
					label: mw.msg("tinymce-upload-dimensions-constrain-text"),
					tooltip: mw.msg("tinymce-upload-dimensions-tooltip"),
				},
				verticalAlignListCtrl = {
					name   : 'verticalalignment',
					type   : 'selectbox',
					label  : mw.msg("tinymce-upload-vertalign-label"),
					tooltip: mw.msg("tinymce-upload-vertalign-tooltip"),
					items :
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
				},
				horizontalAlignListCtrl = {
					name   : 'horizontalalignment',
					type   : 'selectbox',
					label  : mw.msg("tinymce-upload-horizontalalign-label"),
					tooltip: mw.msg("tinymce-upload-horizontalalign-tooltip"),
					items :
						[
							{ text: mw.msg("tinymce-upload-horizontalalign-left-text"), value: 'left' },
							{ text: mw.msg("tinymce-upload-horizontalalign-centre-text"), value: 'center' },
							{ text: mw.msg("tinymce-upload-horizontalalign-right-text"), value: 'right' },
							{ text: mw.msg("tinymce-upload-horizontalalign-none-text"), value: 'none'}
						]
				},
				formatListCtrl = {
					name   : 'format',
					type   : 'selectbox',
					label  : mw.msg("tinymce-upload-format-label"),
					tooltip: mw.msg("tinymce-upload-format-tooltip"),
					items :
						[
							{ text: mw.msg("tinymce-upload-format-thumb-text"), value: 'thumb' },
							{ text: mw.msg("tinymce-upload-format-border-text"), value: 'border' },
							{ text: mw.msg("tinymce-upload-format-frame-text"), value: 'frame' },
							{ text: mw.msg("tinymce-upload-format-frameless-text"), value: 'frameless'},
							{ text: mw.msg("tinymce-upload-format-none-text"), value: '' }
						]
				},
				fileDialogItems = [
					typeListCtrl,
					fileSrcCtrl,
					destTextCtrl,
					titleTextCtrl,
					summaryTextCtrl,
				],
				urlDialogItems = [
					typeListCtrl,
					urlSrcCtrl,
					destTextCtrl,
					titleTextCtrl,
					summaryTextCtrl,
				],
				wikiDialogItems = [
						typeListCtrl,
						wikiSrcCtrl,
						destTextCtrl,
						titleTextCtrl,
						dummySummary,
					],
				displayDialogItems = [
						typeListCtrl,
						displaySrcCtrl,
						destTextCtrl,
						titleTextCtrl,
						summaryTextCtrl,
					],
				imageDialogItems = [
					displaySrcCtrl,
					titleTextCtrl,
					linkTextCtrl,
					altTextCtrl,
					imageDimensionsCtrl,
					verticalAlignListCtrl,
					horizontalAlignListCtrl,
					formatListCtrl
				],
				dialogButtons = [
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
				],
				imageDialogBody = {
					type: 'panel', 
					items: imageDialogItems
				},	
				newImageDialogBody = function( dialogTypeItems ){
					return {
					type: 'tabpanel', 
					tabs: [
						{
							name: 'general',
							title: mw.msg("tinymce-upload-title-general"),
							items: dialogTypeItems
						},
						{
							name: 'image',
							title: mw.msg("tinymce-upload-title-image"),
							pack: 'start',
							items: imageDialogItems
						}
					]
				}};

			/**
			 * check if files of with given extension are allowed to be uploaded
			 *
			 * @param {String} text
			 * @returns {String}
			 */
			function checkFileExtensionIsAllowed(extension) {
				var checkFileExtensions = (mw.config.get( 'wgCheckFileExtensions' )),
					strictFileExtensions = (mw.config.get( 'wgStrictFileExtensions' )),
					allowedsFileExtensions = (mw.config.get( 'wgFileExtensions' )),
					disallowedsFileExtensions = (mw.config.get( 'wgFileBlacklist' )),
					extensionAllowed;
	  
				if (disallowedsFileExtensions) {
					if ( disallowedsFileExtensions.indexOf( extension.toLowerCase() ) > -1 ){
						return false;
					}
				}
	  
				extensionAllowed = true;
				if (checkFileExtensions) {
					if (strictFileExtensions) {
						extensionAllowed = false;
						if ( allowedsFileExtensions.indexOf( extension.toLowerCase() ) > -1){
							extensionAllowed = true;
						}
					}
				}
				
				return extensionAllowed;
			}
	  
			/**
			 * cleans submitted data to ensure all datatypes are valid
			 *
			 * @param {String} text
			 * @returns {String}
			 */
			function cleanSubmittedData(submittedData) {
				if (!submittedData.type) submittedData.type = '';
				if (!submittedData.fileSrc) submittedData.fileSrc = {meta:{},value:''};
				if (!submittedData.urlSrc) submittedData.urlSrc = '';
				if (!submittedData.wikiSrc) submittedData.wikiSrc = '';
				if (!submittedData.displaySrc) submittedData.displaySrc = '';
				if (!submittedData.dest) {
					if (submittedData.type == 'File' ) {
						submittedData.dest = submittedData.displaySrc;
					} else if (submittedData.type == 'URL' ) {
						submittedData.dest = submittedData.urlSrc;
					} else if (submittedData.type == 'Wiki' ) {
						submittedData.dest = submittedData.wikiSrc;
					} else{
						submittedData.dest = submittedData.displaySrc;
					};
				};
				if (!submittedData.title) submittedData.title = '';
				if (!submittedData.summary) submittedData.summary = '';
				if (!submittedData.alt) submittedData.alt = '';
				if (!submittedData.link) submittedData.link = '';
//				if (submittedData.dimensions.width == 0) submittedData.dimensions.width = 0;
//				if (submittedData.dimensions.height == 0) submittedData.dimensions.height = 0;
//				if (submittedData.dimensions.height == "NaN") submittedData.dimensions.height = 0;
				if (!submittedData.horizontalalignment) submittedData.horizontalalignment = '';
				if (!submittedData.verticalalignment) submittedData.verticalalignment = '';
				if (!submittedData.format) submittedData.format = '';
				return submittedData;
			}
	  
			/**
			 * get details of file already uploaded to wiki including url
			 *
			 * @param {String} text
			 * @returns {String}
			 */
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
				$.ajax( { 
					url: _mwtWikiApi,
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
									// check file name of found page matches
									if (pageTitle.replace(/_/g," ").toLowerCase().split(':').pop() == 
										fileName.replace(/_/g," ").toLowerCase().split(':').pop()) {
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
	  
			/**
			 * callback for dialog type change
			 *
			 * @param {String} text
			 * @returns {String}
			 */
			function typeChange( api ) {
				var dialogData = api.getData(),
					type = dialogData.type;

				// initialise the dialog datat
				dialogData = initialiseDialogData( '' );
				dialogData.type = type;
				
				// display dialog fields appropriate for type
				if (type == 'File') { 
					// local Fle upload
					api.redial( makeDialog( newImageDialogBody( fileDialogItems ), dialogData ) );
				} else if (type == 'URL') { 
					// URL upload
					if (!uploadPersmissions.userMayUploadFromURL) {
						dialogData.type = 'File';
						editor.windowManager.alert(mw.msg("tinymce-upload-alert-uploads-not-allowed"));
						api.redial( makeDialog( newImageDialogBody( fileDialogItems ), dialogData ));
					} else {
						api.redial( makeDialog( newImageDialogBody( urlDialogItems ), dialogData  ));
					}
				} else if (type == 'Wiki') { 
				// file already uploaded to wiki
					api.redial( makeDialog( newImageDialogBody( wikiDialogItems ), dialogData ));
				}
				return;
			}
	  
			/**
			 * callback for when dialog file source has changed
			 *
			 * @param {String} text
			 * @returns {String}
			 */
			function fileSrcChange( api ) {
				var dialogData = api.getData(),
					data = dialogData,
					meta = dialogData.fileSrc.meta,
					fileType;

				var srcURL,
					prependURL,
					absoluteURLPattern,
					file,
					extension;

				if (meta.src) {
					srcURL = meta.src;
				} else {
					srcURL = dialogData.fileSrc.value
					editor.windowManager.alert('"' + srcURL + '" is not a valid input, Please use the file picker to select the file you wish to upload' );
					data.fileSrc = {meta:{},value:''};
					api.redial( makeDialog( newImageDialogBody( fileDialogItems ), data ));
					return;
				}

				srcURL = editor.convertURL( srcURL );
				// Pattern test the src url and make sure we haven't already prepended the url
				prependURL = editor.settings.image_prepend_url;
				absoluteURLPattern = new RegExp('^(?:[a-z]+:)?//', 'i');
				if (prependURL && !absoluteURLPattern.test(srcURL) && 
					srcURL.substring(0, prependURL.length) !== prependURL) {
					srcURL = prependURL + srcURL;
				}

				file = srcURL.split('/').pop().split('#')[0].split('?')[0].split('!')[0];
				extension = file.split('.').pop();

				if (!checkFileExtensionIsAllowed(extension)) {
					editor.windowManager.alert(mw.msg("tinymce-upload-alert-file-type-not-allowed"));
					data.fileSrc = {meta:{},value:''};
					api.redial( makeDialog( newImageDialogBody( fileDialogItems ), data ));
					return;
				}

				// if this is an inage to upload then set the source content global
				if ( meta.srccontent ) {
					_srccontent = meta.srccontent;
				}
				if ( meta.srccontent.type ) {
					fileType = meta.srccontent.type;
				}

				//reset the value of this field to the propper src name which is striped of its path
				data.displaySrc = srcURL;

 				 //reset the value of destination field to the propper src name which is striped of its path
				data.dest = srcURL;
				
				api.redial( makeDialog( newImageDialogBody( displayDialogItems ), data ));
			}

			/**
			 * callback for when dialog url source has changed
			 *
			 * @param {String} text
			 * @returns {String}
			 */
			function urlSrcChange( api ) {
				var dialogData = api.getData(),
					srcURL = dialogData.urlSrc,
					file;

				file = srcURL.split('/').pop().split('#')[0].split('?')[0].split('!')[0];

 				 //reset the value of destination field to the propper src name which is striped of its path
				dialogData.dest = srcURL;
				dialogData.displaySrc = srcURL;
				
				api.redial( makeDialog( newImageDialogBody( urlDialogItems ), dialogData ));
				api.focus( 'urlSrc' );
			}

			/**
			 * callback for when dialog wiki source has changed
			 *
			 * @param {String} text
			 * @returns {String}
			 */
			function wikiSrcChange( api ) {
				var dialogData = api.getData(),
					srcURL = dialogData.wikiSrc,
					file;

				file = srcURL.split('/').pop().split('#')[0].split('?')[0].split('!')[0];

 				 //reset the value of destination field to the propper src name which is striped of its path
				dialogData.dest = srcURL;
				dialogData.displaySrc = srcURL;
				
				api.redial( makeDialog( newImageDialogBody( wikiDialogItems ), dialogData ));
				api.focus( 'wikiSrc' );
			}

			/**
			 * callback for to check source and destination for upload
			 *
			 * @param {String} text
			 * @returns {String}
			 */
			function uploadCheck( api ) {
				var dialogData = api.getData(),
					type = dialogData.type,
					srcURL = dialogData.urlSrc
					destURL = dialogData.dest;
					destinationFile = _mwtFileNamespace + ':' + destURL,
					destinationFileDetails = getFileDetailsFromWiki(destinationFile);

				var file,
					extension,
					dialogItems;

				if ( type == 'File' ) {
					srcURL = dialogData.displaySrc;
					dialogItems = fileDialogItems;
				} else if ( type == 'URL' ) {
					srcURL = dialogData.urlSrc;
					dialogItems = urlDialogItems;
				} else if ( type == 'Wiki' ) {
					srcURL = dialogData.wikiSrc;
					dialogItems = wikiDialogItems;
				} else {
					srcURL = dialogData.displaySrc;
					dialogItems = wikiDialogItems;
				};

				if (srcURL) {
					file = srcURL.split('/').pop().split('#')[0].split('?')[0].split('!')[0];
					extension = file.split('.').pop();
				} else {
					editor.windowManager.alert(mw.msg("tinymce-upload-alert-file-source-empty"));
					dialogData = initialiseDialogData( '' );
					dialogData.type = type;
					api.redial( makeDialog( newImageDialogBody( dialogItems ), dialogData ));
					return false;				
				}

				if (!checkFileExtensionIsAllowed(extension)) {
					editor.windowManager.alert(mw.msg("tinymce-upload-alert-file-type-not-allowed"));
					dialogData = initialiseDialogData( '' );
					dialogData.type = type;
					api.redial( makeDialog( newImageDialogBody( dialogItems ), dialogData ));
					return false;
				}

				// encountered an error trying to access the api
				if (typeof destinationFileDetails.error != "undefined") {
						editor.windowManager.alert(mw.msg("tinymce-upload-alert-error-uploading-to-wiki"));
						dialogData = initialiseDialogData( '' );
						dialogData.type = type;
						api.redial( makeDialog( newImageDialogBody( dialogItems ), dialogData ));
					return false;
				}
	  
				if (type == 'File' || type == 'URL') { 
					// file is to be uploaded
					if (destinationFileDetails) { 
						// file of this name already exists on this wiki
						editor.windowManager.confirm(mw.msg("tinymce-upload-confirm-file-already-exists"),
							function(ok) {
								if (ok) {
									dialogData.type = 'Wiki';
									dialogData.wikiSrc = destinationFile.split('/').pop().split(':').pop().split('#')[0].split('?')[0];
									dialogData.dest = dialogData.wikiSrc;
									api.redial( makeDialog( newImageDialogBody( wikiDialogItems ), dialogData ));
								} else {
									dialogData = initialiseDialogData( '' );
									dialogData.type = type;
									api.redial( makeDialog( newImageDialogBody( dialogItems ), dialogData ));
								}
							});
						return false;
					}
				} else if (type == 'Wiki') {
					if (!destinationFileDetails) {
						editor.windowManager.confirm(mw.msg("tinymce-upload-confirm-file-not-on-wiki"),
							function(ok) {
								if (ok) {
									dialogData = initialiseDialogData( '' );
									dialogData.type = type;
									api.redial( makeDialog( newImageDialogBody( dialogItems ), dialogData ));
									return false;
								} else {
									dialogData = initialiseDialogData( '' );
									dialogData.type = type;
									api.redial( makeDialog( newImageDialogBody( dialogItems ), dialogData ));
									return false;
								}
							});
					}
				}
				return true;
			}
	  
			/**
			 * initialise dialog data
			 *
			 * @param {String} text
			 * @returns {String}
			 */
			function initialiseDialogData( dialogData ) {
				// set up defaults using previously enterred data if any
				
				if (!Array.isArray( dialogData )) dialogData = [];
				if (!Array.isArray( dialogData["dimensions"] )) dialogData["dimensions"] = [];
				if (!dialogData.type) dialogData.type = 'File';
				if (!dialogData.fileSrc) dialogData.fileSrc = {meta:{},value:''};
				if (!dialogData.urlSrc) dialogData.urlSrc = '';
				if (!dialogData.wikiSrc) dialogData.wikiSrc = '';
				if (!dialogData.displaySrc) dialogData.displaySrc = '';
				if (!dialogData.dest) dialogData.dest = '';
				if (!dialogData.title) dialogData.title = '';
				if (!dialogData.summary) dialogData.summary = '';
				if (!dialogData.link) dialogData.link = '';
				if (!dialogData.alt) dialogData.alt = '';
//				if (!dialogData.dimensions["width"]) dialogData.dimensions["width"] = "0";
				if (!dialogData.dimensions["width"]) dialogData.dimensions["width"] = "";
//				if (!dialogData.dimensions["height"]) dialogData.dimensions["height"] = "0";
				if (!dialogData.dimensions["height"]) dialogData.dimensions["height"] = "";
				if (!dialogData.horizontalalignment) dialogData.horizontalalignment = 'right';
				if (!dialogData.verticalalignment) dialogData.verticalalignment = 'middle';
				if (!dialogData.format) dialogData.format = 'thumb';
				return dialogData;
			}

			dialogData = initialiseDialogData( dialogData );

			// populate form with details of existing upload if one selected
			if (imgElm) { 
				dialogData.type = 'Wiki';
				wikiImageObject.horizontalalignment = '';
				wikiImageObject.verticalalignment = '';
				wikiImageObject.format = '';
				aLink = dom.getAttrib(imgElm, 'data-mwt-wikitext');
				aLink = aLink.replace(/<@@bnl@@>/gmi,"");
				// remove brackets and split into patrts
				parts = aLink.substr(2, aLink.length - 4).split("|"); 
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

				dialogData.dimensions = [];
				dialogData.displaySrc = wikiImageObject.imagename;
				if (dialogData.displaySrc == undefined) dialogData.wikiSrc = '';
				dialogData.dest = dialogData.wikiSrc;
				dialogData.summary = '';
				dialogData.title = wikiImageObject.title;
				if ( dialogData.title == undefined) dialogData.title = '';
				dialogData.link = wikiImageObject.link;
				if (dialogData.link == undefined) dialogData.link = '';
				dialogData.alt = wikiImageObject.alt;
				if ( dialogData.alt == undefined) dialogData.alt = '';
				dialogData.dimensions["width"] = wikiImageObject.sizewidth;
//				if ( !dialogData.dimensions["width"]) dialogData.dimensions["width"] = "0";
				if ( !dialogData.dimensions["width"]) dialogData.dimensions["width"] = "";
				dialogData.dimensions["height"] = wikiImageObject.sizeheight;
//				if ( !dialogData.dimensions["height"]) dialogData.dimensions["height"] = "0";
				if ( !dialogData.dimensions["height"]) dialogData.dimensions["height"] = "";
				dialogData.horizontalalignment = wikiImageObject.horizontalalignment;
				if ( dialogData.horizontalalignment == undefined) dialogData.horizontalalignment = null;
				dialogData.verticalalignment = wikiImageObject.verticalalignment;
				if ( dialogData.verticalalignment == undefined) dialogData.verticalalignment = null;
				dialogData.format = wikiImageObject.format;
				if ( dialogData.format == undefined) dialogData.format = '';
				dialogData.style = editor.dom.serializeStyle(editor.dom.parseStyle(editor.dom.getAttrib(imgElm, 'style')));
			}

			// setup the list of upload types according to user permissions
			if (uploadPersmissions.userMayUpload) {
				typelist.push({text: mw.msg("tinymce-upload-type-label-file"), value: "File"});
				if (uploadPersmissions.userMayUploadFromURL) {
					typelist.push({text: mw.msg("tinymce-upload-type-label-url"), value: "URL"});
				}
			}
			typelist.push({text: mw.msg("tinymce-upload-type-label-wiki"), value: "Wiki"});
			if (!uploadPersmissions.userMayUpload) dialogData.type = "Wiki";

			var onDialogChange = function(api, changed) {
				switch(changed.name) {
					case 'type':
						// type of upload has changed
						typeChange( api );
						break;
					case 'fileSrc':
						// type of upload has changed
						fileSrcChange( api );
						break;
					case 'urlSrc':
						// type of upload has changed
						urlSrcChange( api );
						break;
					case 'wikiSrc':
						// type of upload has changed
						wikiSrcChange( api );
						break;
					}
			};

			var onDialogTabChange = function( api, changed ) {
				// this is triggered when redialing the dialog as well as
				// when the tab changes, so we test to see if we have 
				// moved from the general tab otherwise we ignore
				if ( changed.newTabName != "general" ) {
					if (!uploadCheck( api )) return;
				}
			};

			var onSubmitForm = function( api ) {
				var dialogData = api.getData(),
					srcURL = dialogData.wikiSrc,
					figureElm,
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
					
					api.block('Loading...');

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
							uploadDetails['responseText'] = xhr.responseText;
							console.log(error);
						}
					});

					api.unblock();

					return uploadDetails;
				}
	
				// check upload succesful or report errors and warnings
				function checkUploadDetail(uploadDetails, ignoreWarnings) {
					var message,
						result = [];
						
					if (typeof uploadDetails == "undefined") {
						editor.windowManager.alert(mw.msg("tinymce-upload-alert-unknown-error-uploading"));
						result = false;
					} else if (typeof uploadDetails.error != "undefined") {
						if (typeof uploadDetails.error.info != "undefined") {
							message = mw.msg("tinymce-upload-alert-error-uploading",uploadDetails.error.info);
						} else {
							message = mw.msg("tinymce-upload-alert-error-uploading");		
						}
						editor.windowManager.alert(message);
						result = false;
					} else if (typeof uploadDetails.upload.responseText != "undefined") {
						message = mw.msg("tinymce-upload-alert-error-uploading",uploadDetails.upload.responseText);
						editor.windowManager.alert(message);
						result = false;
					} else if (typeof uploadDetails.upload.error != "undefined") {
						message = mw.msg("tinymce-upload-alert-error-uploading",uploadDetails.upload.error.info);
						editor.windowManager.alert(message);
						result = false;
					} else if (typeof uploadDetails.upload.warnings != "undefined" && (!ignoreWarnings)) {
						message = mw.msg("tinymce-upload-alert-warnings-encountered") + "\n\n" ;  
						result = 'warning';
						for (warning in uploadDetails.upload.warnings) {
							warningDetails = uploadDetails.upload.warnings[warning];
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
					} else if (typeof uploadDetails.upload.imageinfo != "undefined") {
						result["url"] = uploadDetails.upload.imageinfo.url;
						result["page"] = uploadDetails.upload.imageinfo.canonicaltitle;
					}
					return result;
				}
	
				// first check source and destination details are valid
				if (!uploadCheck( api )) return;
	
				dialogData = cleanSubmittedData( dialogData );
				uploadDetails = [];
				result = [];
				uploadResult = '';
				uploadPage = '';
				ignoreWarnings = false;
				// have to have a destination name unless editing previous upload
				if (!dialogData.dest && !imgElm) {
					// user may have clicked submit without exiting source field
					editor.windowManager.alert(mw.msg("tinymce-upload-alert-destination-filename-needed"));
					return;
				}
	
				if (imgElm) { // Editing image node so skip upload
					uploadPage = dialogData.displaySrc;
				} else {
					if ((dialogData.type == 'File') || (dialogData.type == 'URL')) {
						if (dialogData.type == 'File') {
							fileContent = _srccontent;
						} else {
							fileContent = dialogData.urlSrc;
						}
						fileType = dialogData.type;
						fileName = dialogData.dest.split('/').pop().split('#')[0].split('?')[0].split('!')[0].replace(/\s/gmi,'_');
						fileSummary = dialogData.summary;
						if ((fileContent) && (fileName)) {
							do {
								uploadDetails = doUpload(fileType, fileContent, fileName, fileSummary, ignoreWarnings);
								result = checkUploadDetail(uploadDetails, ignoreWarnings);
								if (result) {
									if ( Array.isArray( result ) ) {
										uploadResult = result["url"];
										uploadPage = result["page"];
									} else if (result == 'ignore_warning') {
										ignoreWarnings = true;
									} else {
										ignoreWarnings = false;								
									}
								}
							} while (ignoreWarnings)
							if (result === false) {
								return;
							}
						} else {
							editor.windowManager.alert(mw.msg("tinymce-upload-alert-source-or-destination-undefined"));
							return;
						}
					} else if (dialogData.type == 'Wiki') {
						fileName = dialogData.dest;
						uploadPage = _mwtFileNamespace + ":" + fileName;
					}
				}

				// close the dialog window
				api.close();

				//set up wiki text for inserting or updating in editor window
				wikitext += "[[" + uploadPage;
				if (dialogData.dimensions.width > 0) {
					wikitext += "|" + dialogData.dimensions.width;
					if (dialogData.dimensions.height > 0 ) {
						wikitext += "x" + dialogData.dimensions.height + "px";
					} else {
					wikitext += "px"
					}
				} else if (dialogData.dimensions.height > 0) {
					wikitext += "|x" + dialogData.dimensions.height + "px";
				}
				if (dialogData.link) {
					wikitext += "|link=" + dialogData.link;
				}
				if (dialogData.alt) {
					wikitext += "|alt=" + dialogData.alt;
				}
				if (dialogData.horizontalalignment) {
					wikitext += "|" + dialogData.horizontalalignment;
				}
				if (dialogData.verticalalignment) {
					wikitext += "|" + dialogData.verticalalignment;
				}
				if (dialogData.format) {
					wikitext += "|" + dialogData.format;
				}
				if (dialogData.title) {
					wikitext += "|" + dialogData.title;
				}
				wikitext += "]]";
	
				editor.focus();
/*				var rng = editor.selection.getRng();
				editor.undoManager.transact( function () {
					editor.selection.setContent( wikitext, {format: 'wiki', convert2html: 'true'} );
				});
//				editor.selection.setRng(rng);
				editor.selection.setCursorLocation();
				editor.selection.collapse();
				editor.nodeChanged();*/
				setSelection ( editor, wikitext, {format: 'wiki', convert2html: 'true'} );
		
				return;
			}

			var makeDialog = function ( uploadDialogBody, initialData ) {
				return {
					title: mw.msg( "tinymce-upload-title" ),
					size: 'normal',
					body: uploadDialogBody,
					buttons: dialogButtons,
					initialData: initialData,
					onChange: onDialogChange,
					onTabChange: onDialogTabChange,
					onSubmit: onSubmitForm,
				};
			};

			var uploadDialogTitle,
				uploadDialogBody;

			if ( imgElm ) { // edit existing image display
				uploadDialogBody = imageDialogBody;
			} else { // new upload
				uploadDialogBody = newImageDialogBody( fileDialogItems );
			}

			var uploadDialog = editor.windowManager.open( makeDialog( uploadDialogBody, dialogData ));
		}

		// abort if permissions not Ok
		uploadPersmissions = _mwtCheckUploadPermissions(editor);
		if ( !uploadPersmissions.uploadsAllowed ) return;
		
		imgElm = editor.selection.getNode();
		figureElm = dom.getParent(imgElm, 'figure.image');

		// if node is a link to an image then get the image
		if (figureElm) {
			imgElm = dom.select('img', figureElm)[0];
		}

		// test if we are modifying an existing upload else set to null
		if (imgElm && (imgElm.className.indexOf("mwt-image") < 0 
			|| imgElm.getAttribute('data-mce-object') 
			|| imgElm.getAttribute('data-mce-placeholder'))) {
			imgElm = null;
		}

		//display and process upload form
		displayUploadForm(dialogData, imgElm);

		return;
	}

	editor.ui.registry.addButton('wikiupload', {
		icon: 'image',
		tooltip: mw.msg("tinymce-upload-menu-item-text"),
		onAction: showWikiUploadDialog,
		stateSelector: '.mwt-image'
	});

	editor.ui.registry.addMenuItem('wikiupload', {
		icon: 'image',
		text: mw.msg("tinymce-upload-menu-item-text"),
		onAction: showWikiUploadDialog,
		context: 'upload',
		prependToContext: true
	});

	editor.addCommand('wikiupload', showWikiUploadDialog);
	
});
