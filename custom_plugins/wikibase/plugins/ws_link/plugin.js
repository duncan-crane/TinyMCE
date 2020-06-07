var
    /**
     * Array of object settings, defined in LocalSettings.php
     * object:
     * @example {
     *     name: Test,
     *     template: Template:Edit_Test_Form
     *     text: Insert test
     * }
     */
    wsTinyMCEModals = mw.config.get('wgWsTinyMCEModals'),
	scriptPath = mw.config.get( 'wgScriptPath' );
debugger;

var Ws_Link = function(editor) {
    "use strict";
    var
        /**
         * created menu items with the config from LocalSettings
         * @type {any[]}
         */
        menuItems = new Array(),
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
         * string for inserting a placeholder in editor text for
         * various non-vivble codes in the wiki text.
         * @type String
         */
        _markupFormat = '<span class="mceNonEditablePlaceHolder {0}" title="{1}" dragable="true" contenteditable="false">{2}</span>',
        _slb = null,
        _mwtWikiApi = editor.getParam("wiki_api_path"),
        /**
         *
         * Points to the title of the mediawiki page to be accessed by API
         * @type String
         */
        _mwtPageTitle = editor.getParam("wiki_page_mwtPageTitle"),
        /**
         *
         * allowable tags that form html blocks, defined in MW_tinymce.js
         * @type Array
         */
        _mwtBlockTagsList = editor.getParam("wiki_block_tags"),
        /**
         *
         * string for inserting a placeholder in editor text for
         * non-rendering mediawiki parser output in the wiki code.
         * The character displayed is defined in MW_tinymce.js
         * @type String
         */
        _nrw = (editor.getParam("wiki_non_rendering_parser_output_character")) ?
            editor.getParam("wiki_non_rendering_parser_output_character") : null,
        /**
         * MediaWiki Api, used to parse wiki pages
         * @type {mw.Api}
         */
        api = new mw.Api(),
        /**
         * The iframe name
         * @type {string}
         */
        iframeName = 'ws_link_form',
        /**
         * all the html tags
         * @type {any[]}
         * @private
         */
        _tags4Html = new Array(),
        /**
         * all the wiki tags
         * @type {any[]}
         * @private
         */
        _tags4Wiki = new Array();
    // make sure api.parse is loaded
    if ( typeof api.parse !== "function" ) {
        $.getScript(scriptPath + '/resources/src/mediawiki/api/parse.js').done(function () {
            createMCEMenuItems(wsTinyMCEModals);
        });
    } else {
        createMCEMenuItems(wsTinyMCEModals);
    }


    /**
     *
     * definition of functions used
     * globally in this plugin
     *
     * look for this.init to find the start of the main routine
     */

    var setContent = function ( editor, content, args ) {
        editor.focus();
        editor.undoManager.transact( function () {
            editor.setContent( content, args );
//DC not sure we need next line?
//			editor.undoManager.add();
        });
        editor.selection.setCursorLocation();
        editor.nodeChanged();
    };

    var setSelection = function ( editor, content, args ) {
        editor.focus();
        editor.undoManager.transact( function () {
            editor.selection.setContent( content, args );
//DC not sure we need next line?
//			editor.undoManager.add();
        });
        editor.selection.setCursorLocation();
        editor.nodeChanged();
    };

    var getContent = function ( editor, args ) {
//		return editor.getContent({ source_view: true });
//		return editor.getContent(args);
        /*		if ( editor.selection.isCollapsed() ) {
                    // if nothing is selected then select everything*/
        return editor.getContent( args );
        /*		} else if (editor.selection) {
                    // else get the content selected
                    return editor.selection.getContent( args );
                }*/
    };

    var getSelection = function ( editor, args ) {
//		return editor.getContent({ source_view: true });
//		return editor.getContent(args);
        /*		if ( editor.selection.isCollapsed() ) {
                    // if nothing is selected then select everything
                    return editor.getContent( args );
                } else if (editor.selection) {
                    // else get the content selected*/
        return editor.selection.getContent( args );
//		}
    };

    var Content = {
        setContent: setContent,
        setSelection: setSelection,
        getContent: getContent,
        getSelection: getSelection
    };


    /**
     * open dialog
     * @param name
     * @param template
     * @param text
     */
    var openDialog = function(name, template, text, editParams = false) {
        var templateCall = `{{${name}}}`;
        // if the editParams are filled is an edit action
        if ( editParams) {
            templateCall = `{{${name}|${editParams}}}`;
        }

        var editTemplate = name.slice(name.indexOf(':') + 1);
        // render the template
        var dialogApi = editor.windowManager.open(buildDialogSpec(`${text} invoegen`,[], {
            ws_link_form: ''
        }, template, editTemplate));
        dialogApi.block('Loading...');

        api.parse(templateCall, {}).done(function(data) {
            var content = getPreviewContent(data);
            var bodyItems = [
                /*{
                    type: 'htmlpanel', // component type
                    html: data
                },*/
                {
                    label: iframeName,
                    type: 'iframe',
                    name: iframeName,
                    sandboxed: false
                }
            ];
            var initialData = {
                ws_link_form: content
            }
            dialogApi.unblock();
            dialogApi.redial(buildDialogSpec(`${text} invoegen`, bodyItems, initialData, template, editTemplate));
            dialogApi.focus(iframeName);


            // make sure that the select2 library is implemented, and rendered
            // attachTokens();
            $(`iframe[title="${iframeName}"]`).load(function () {
                var iframe = $(`iframe[title="${iframeName}"]`);
                $(iframe).css({
                    'min-height': '400px',
                    'min-width': '400px',
                    'width': 'auto',
                    'overflow': 'hidden'
                });
                setUpTokenFunction(iframe);
                if ( typeof WsShowOnSelect !== 'function') {
                    $.getScript(scriptPath + '/wikis/modules/wsbasics/WSShowOnSelect.js').done(function () {
                        setUpIFrameWssos(iframe);
                    })
                } else {
                    setUpIFrameWssos(iframe);
                }
            })
        });

    };

    // Add a button that opens a window
    editor.ui.registry.addMenuButton('wslink', {
        text: 'Insert',
        fetch: function(callback) {
            callback(menuItems);
        }
    });

    // Adds a menu item, which can then be included in any menu via the menu/menubar configuration
    editor.ui.registry.addMenuItem('wslink', {
        text: 'Link',
        onAction: function() {
            // Open window
            openDialog();
        }
    });

    // editor.on('beforeSetContent', _onBeforeSetContent);
    /*editor.on('pastePreProcess', _onPastePreProcess);
    editor.on('dblclick', _onDblclick);*/

    /**
     * convert to wiki link
     * @param data
     * @param template
     * @returns {string}
     */
    function convert2wikiLink(data, template, editTemplate) {
        var wikitxt = `{{${template}`;
        $.each(data, function(k, v) {
            if ( !v || v === '' || v === ' ' ) {

            } else {
                wikitxt += `|${k}=${v}`;
            }
        });
        wikitxt += '}}__--__' + editTemplate;
        return wikitxt;
    }

    /**
     * create all the menu items
     * @param options
     */
    function createMCEMenuItems(options) {
        $.each(options, function(index, opt) {
            if ( opt.type === 'nested' ) {
                menuItems.push({
                    type: 'nestedmenuitem',
                    text: opt.text,
                    getSubmenuItems: function () {
                        return createNestedMenuItems(opt.items);
                    }
                });
            } else {
                menuItems.push({
                    type: 'menuitem',
                    text: opt.text,
                    onAction: function () {
                        openDialog(opt.template, opt.templateName, opt.text);
                    }
                });
            }
        });
    }

    /**
     * creates the nested menu items
     * @param options
     * @returns {[]}
     */
    function createNestedMenuItems(options) {
        var nested = [];
        $.each(options, function(index, opt) {
            nested.push({
                type: 'menuitem',
                text: opt.text,
                onAction: function () {
                    openDialog(opt.template, opt.templateName, opt.text);
                }
            });
        });
        return nested;
    }

    /**
     * builds dialog
     * @param title
     * @param bodyItems
     * @param initialData
     * @param template
     * @returns {{initialData: *, buttons: [{name: string, text: string, type: string}, {name: string, text: string, type: string, primary: boolean}], size: string, onSubmit: onSubmit, title: *, body: {id: string, type: string, items: *}}}
     */
    function buildDialogSpec(title, bodyItems, initialData, template, editTemplate) {
        return {
            title: title,
            size: 'medium',
            body: {
                id: 'testbody',
                type: 'panel',
                items: bodyItems
            },
            buttons: [{
                type: 'cancel',
                name: 'closeButton',
                text: 'Cancel'
            },
                {
                    type: 'submit',
                    name: 'submitButton',
                    text: 'OK',
                    primary: true
                }],
            initialData: initialData,
            onSubmit: function(dialog) {
                var data = {};
                $(`iframe[title="${iframeName}"]`).contents().find('body').find('input, select, textarea').each(function (i, el) {
                    if ( !$(el).is('[type="hidden"]') ) {
                        if ( el.name.slice(-2) === '[]' ) {
                            el.name = el.name.slice(0, el.name.length - 2);
                        }
                        if ( (el.name !== '' && el.name !== ' ') && $(el).val() !== '' ) {
                            data[el.name] = $(el).val();
                        }

                    }
                });

                var wikitxt = convert2wikiLink(data, template, editTemplate);

                // methods of the mw_wikicode plugin ..
                var args = {
                    format: 'wiki',
                    load: 'true',
                    handleWsLink: true
                };

                editor.undoManager.transact(function() {
                    editor.focus();
                    editor.selection.setContent(wikitxt, args);
                    editor.undoManager.add();
                });
                editor.selection.setCursorLocation();
                editor.nodeChanged();

                //Content.setContent(editor, wikitxt, args);

                dialog.close();
            }
        }
    }

    /**
     * create iframe content with the loaded template
     * @param html
     * @returns {string}
     */
    function getPreviewContent(html) {
        if (html.indexOf('<html>') === -1) {
            var contentCssLinks_1 = '';
            $.each(editor.contentCSS, function (i, url) {
                if ( url.includes("bootstrap") || url.includes('select2')) {
                    contentCssLinks_1 += '<link type="text/css" rel="stylesheet" href="' + editor.documentBaseURI.toAbsolute(url) + '">';
                }
            });
            var bodyClass = editor.settings.body_class || '';
            if (bodyClass.indexOf('=') !== -1) {
                bodyClass = editor.getParam('body_class', '', 'hash');
                bodyClass = bodyClass[editor.id] || '';
            }

            var encode = editor.dom.encode;
            var directionality = editor.getBody().dir;
            var dirAttr = directionality ? ' dir="' + encode(directionality) + '"' : '';
            html = '<!DOCTYPE html>' + '<html>' + '<head>' + contentCssLinks_1 + getScripts() + '</head>' + '<body class="' + encode(bodyClass) + '"' + dirAttr + '>' +
                html + '</body>' + '</html>';
        }
        return html;
    }

    /**
     * set up token function
     * @param iframe
     */
    function setUpTokenFunction(iframe) {
        if ( typeof $.fn.select2 !== 'function' ) {
            $.getScript(scriptPath + '/extensions/WSForm/select2.min.js').done(function() {
               attachTokensIframe(iframe);
            });
        } else {
            attachTokensIframe(iframe);
        }
    }

    /**
     * add script which setups the token
     * @param iframeBody
     */
    function attachTokensIframe(iframeBody) {
        iframeBody = $(iframeBody).contents().find('body');
        $(iframeBody).append(
            `<script>attachIframeTokens();</script>`
        );
    }

    /**
     * get the needed js files for inside the iframe of the dialog
     * @returns {string}
     */
    function getScripts() {
        return `
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.0/jquery.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.4.0/js/bootstrap.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/select2@4.0.13/dist/js/select2.min.js"></script>
            <script src="/extensions/WSForm/WSForm.general.js"></script>
    `;
    }


    function _getPlaceHolder4Html(tagWikiText, tagHTML, tagClass, protection, tagEditTemplate = '') {
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

        id = "<@@@" + tagClass.toUpperCase() + "__--__" + tagEditTemplate + ":" + _createUniqueNumber() + "@@@>";

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
            element.addClass("mceNonEditable mwt-" + tagClass);
            element.attr({
                'id': id,
                'title': titleWikiText ,
                'data-mwt-type': tagClass,
                'data-mwt-wikitext': titleWikiText,
                'draggable': "true",
                'contenteditable': "false"
            });


            tagOuterHTML = element.prop("outerHTML");
            /*		} else if (protection != 'nonEditable') {
                        // the wiki text contains editable html
                        tagOuterHTML = tagHTML.replace(/( class=)/i," id=" + id + "$1");*/
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
                console.log("_tags4wiki: ", _tags4Wiki, "$1: ", $1);
                return _tags4Wiki[$1].replace(/&amp;amp;/gmi,'&amp;');
            });
        }
        return tagHTML
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

    function _preserveLinks4Html(text) {
        var linkPlaceholder,
            regex,
            matcher,
            linkType,
            tempLink,
            editTemplate,
            params;

        params = text.split('__--__');
        tempLink = params[0];
        text = tempLink;
        linkType = text.slice(2, text.indexOf("|"));
        editTemplate = params[1];
        linkPlaceholder = _getPlaceHolder4Html(tempLink, 'toParse', linkType, 'nonEditable', editTemplate);

        // replace the link with the placeholder
        regex = tempLink.replace(/[^A-Za-z0-9_]/g, '\\$&');
        matcher = new RegExp(regex, '');
        text = text.replace(matcher, linkPlaceholder);
        return text;
    }
    
    function _preserveTemplates4Html() {

    }
    
    function _convertWiki2Html(text) {
        var textObject;
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

        // convert and preserve links and images
        text = _preserveLinks4Html(text);

        //Write back content of preserved code to placeholders.
        text = _recoverTags2html(text);

        textObject = {text: text};
        $(document).trigger('TinyMCEAfterWikiToHtml', [textObject]);
        text = textObject.text;
        return text;
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
        /*if (e.format == 'raw' ) {
            return;
        }*/
        // if this is the initial load of the editor
        // tell it to convert wiki text to html
        if (e.initial === true && e.format !== 'raw') {
            e.handleWsLink = true;
        }
        // set format to raw so that the Tiny parser won't rationalise the html
        e.format = 'raw';
        // if the content is wikitext thyen convert to html
        if (e.handleWsLink) {
            e.content = _convertWiki2Html(e.content);
        } else {
//		e.preventDefault();
//		e.stopPropagation();
//		e.stopImmediatePropagation();
        }
        return;
    }

    /**
     *
     * @param e {tinymce.ContentEvent}
     * @private
     */
    function _onGetContent(e) {
        // console.log('Getting content..', e);
        var text = e.content;

        if (e.save == true) {
            e.convert2wiki = true;
        }

        if (e.convert2wiki) {
            // _convertHtml2Wiki is a recursive function

            text = _convertHtml2Wiki(text, false);

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
    
    function onSubmitForm() {

    }

    function _recoverTags4Html() {

    }

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
                if ((_tags4Html[match] === 'toParse') && (_tags4Wiki[match])) {
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
                        var tagClassArray = tag.replace(/<@@@(.*):\d+?@@@>/gm, '$1').split('__--__'),
                            tagClass = tagClassArray[0].toLowerCase(),
                            editTemplate = tagClassArray[1],
                            wikiText,
                            html,
                            element,
                            regex,
                            matcher,
                            editParams;

                        html = parserTable[count];
                        elementTitle = _tags4Wiki[tag];
                        editParams = elementTitle.slice(elementTitle.indexOf('|') + 1, elementTitle.indexOf('}}'));
                        if ( html.match(blockMatcher) ) {
                            // if parser result contains a block tag. wrap in a <div>
                            // and add a new line to the wiki text
                            if (html.match(/<img/gmi)) {
                                // images should are given a placeholder for the editor window
                                // as the actual code may appear elsewhere in the text to where
                                // the image is displayed
                                html = html + _img ;
                            }
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
                        element.addClass("mceNonEditable mwt-ws-link-" + tagClass);
                        element.attr({
                            'title': elementTitle,
                            'id': tag,
                            'data-mwt-type': tagClass,
                            'data-mwt-wikitext': elementTitle,
                            'data-mwt-edittemplate': editTemplate,
                            'data-mwt-editparams': editParams,
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
            var message = mw.msg("tinymce-wikicode-alert-mw-parser-fail", wikiCode);
            alert( message );
            parserResult.parsedHtml = wikiCode;
        }

        return parserResult;
    }

    function _convertHtml2Wiki(text, recursed) {
        var textObject;
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

            // process blocks containing parsed wiki text
            $dom.find( "*[class*='mwt-htmlEntity']" ).replaceWith( function(a) {
//				return _htmlEncode(this.getAttribute("data-mwt-wikiText"));
                return this.id;
            });

            // process blocks containing parsed wiki text
            $dom.find( "*[class*='mwt-wikiMagic']" ).replaceWith( function(a) {
                return this.id;
            });

            $dom.find("*[class*='mwt-ws-link']").replaceWith(function (a) {
                console.log("Going to replace a element..", this);
                return this.id;
            });
//debugger;
            // convert DOM back to html text
            text = _htmlDecode($dom[0].innerHTML);

            // now process preserved html in text

            // convert html text to DOM
            $dom = $( "<div id='tinywrapper'>" + text + "</div>", "text/xml" );

            // process blocks containing preserved html text
            $dom.find( "*[class*='mwt-preserveHtml']" ).replaceWith( function(a) {
                var newLine,
                    elm = $(this),
                    innerHtml = this.innerHTML,
                    outerHtml = this.outerHTML,
                    id = "<@@@" + this.tagName.toUpperCase() + ":" + _createUniqueNumber() + "@@@>",
                    regex = "<" + _mwtBlockTagsList.split('|').join('[\\s>]|<') + "[\\s>]",
                    blockMatcher = new RegExp(regex, 'gmi');

                elm.removeClass('mwt-preserveHtml');
                if ( elm.children() ) innerHtml = _convertHtml2Wiki( innerHtml, true );
                this.innerHTML = innerHtml;

                // remove empty class attributes
                outerHtml = this.outerHTML.replace(/ class=(["|'])\1/,"");

                /*				// recover any wiki text from placeholders
                                html = _recoverPlaceholders2Wiki( html )*/

                // start block tags on new lines to make wiki text more readable
                outerHtml = outerHtml.replace(blockMatcher, function (match) {
                    return '<@@bnl@@>' + match;
                });

                // tidy up end of lists
                outerHtml = outerHtml.replace(/(<\/li>)(<\/[uo]l>)/gmi, "$1<@@bnl@@>$2");

                // assume as its html in wiki text there aren't any </li> needed
                outerHtml = outerHtml.replace(/<\/li>/gmi, "");

                // add a final block new line if this is a block tag
                if (_mwtBlockTagsList.split('|').indexOf(this.tagName.toLowerCase()) >= 0) {
                    outerHtml = outerHtml + '<@@bnl@@>';
                }

                _tags4Wiki[id] = outerHtml;
                return id;
////				return html;
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
         * replaces placeholders with their wiki code equivalent
         *
         * @param {String} text
         * @returns {String}
         */
        function recoverTags2Wiki(text) {
            debugger;
            if (_tags4Wiki){
                while (text.match(/\<@@@.*?:\d*@@@>/)) {
                    text = text.replace(/(\<@@@.*?:\d*@@@>)/gi, function(match, $1, offset, string) {
                        // replace '&amp;amp;' with '&amp;' as we double escaped these when they were converted
                        debugger;
//						return _tags4Wiki[$1].replace(/&amp;amp;/gmi,'&amp;');
                        // '&amp;' is processed by the wiki don and turned into '&'
                        // so we subsitue it with a placeholder which will be replaced later
                        return _tags4Wiki[$1].replace(/&amp;/gmi,'<@@@@>');
                    });
                }
            }

            return text;
        }

        // save some work
        if ( text === '' ) return text;


        if (!recursed) {
            // wrap the text in an object to send it to event listeners
            textObject = {text: text};
            $(document).trigger('TinyMCEBeforeHtmlToWiki', [textObject]);
            text = textObject.text;
        }

        //Remove any '\n' as they are not part of html formatting
        text = text.replace(/\n/gi, "");

        // preprocess tags in html using placeholders where needed
        text = preprocessHtml2Wiki(text);

        //recover special tags to wiki code from placeholders
        text = recoverTags2Wiki(text);

        // finally substitute | with {{!}} if text is part of template
        if ( _pipeText == '{{!}}' ) {
            text = text.replace(/\|/gmi, "{{!}}");
        }

        if (!recursed) {
            // wrap the text in an object to send it to event listeners
            textObject = {text: text};
            $(document).trigger('TinyMCEAfterHtmlToWiki', [textObject]);
            text = textObject.text;

            // because _ is called recusrsively we get a problem that
            // html entities of form &xxx; get over converted so we used a
            // placeholder to prevent this.  The next line reverse this
            text = text.replace(/&lt;/gmi,'<').replace(/&gt;/gmi,'>').replace(/<@@@@>/gmi,"&");
        }

        return text;
    }

    /**
     *
     */
    function showWsLinkDialog() {
        var selectNode = editor.selection.getNode(),
            editTemplate = 'Template:' + $(selectNode).data('mwt-edittemplate'),
            title = $(selectNode).data('mwt-type');

        openDialog(editTemplate, title, title, $(selectNode).data('mwt-editparams'));
    }

    /**
     * Event handler for "dblclick"
     * Add function for processing when double clicking items.
     * @param {tinymce.DblclickEvent} e
     */
    function _onDblclick(e) {
        var ed = editor,
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
                } else if (selectedNode.className.indexOf("mwt-ws-link") > -1) {
                    ed.selection.select(selectedNode);
                    e.target = selectedNode;
                    ed.execCommand('mceWsLink');
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
//		if (!targetFound) ed.execCommand('mceWikimagic');

        return;
    }

    this.init = function (ed, url) {
/*        _slb = (ed.getParam("wiki_non_rendering_newline_character")) ?
            _markupFormat.format(
                "mwt-singleLinebreak",
                mw.msg( 'tinymce-wikicode-non-rendering-single-linebreak' ),
                ed.getParam("wiki_non_rendering_newline_character") )
            : null;*/
		_slb = 
			'<span class="mwt-nonEditablePlaceHolder mwt-singleLinebreak mwt-slb' 
			+ (editor.getParam("directionality")) + '" title="' + 
			mw.msg('tinymce-wikicode-non-rendering-single-linebreak' ) +
			'" dragable="true" contenteditable="false">' + 
			'</span>';
        ed.on('beforeSetContent', _onBeforeSetContent);
        ed.on('getContent', _onGetContent);
        ed.on('dblclick', _onDblclick);
        ed.addCommand('mceWsLink', showWsLinkDialog);
    }

    return;
}

tinymce.PluginManager.add('wslink', Ws_Link);
