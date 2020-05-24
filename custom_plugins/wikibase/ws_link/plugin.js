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
    wsTinyMCEModals = mw.config.get('wgWsTinyMCEModals');
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
         * MediaWiki Api, used to parse wiki pages
         * @type {mw.Api}
         */
        api = new mw.Api(),
        /**
         * The iframe name
         * @type {string}
         */
        iframeName = 'ws_link_form';
    // make sure api.parse is loaded
    if ( typeof api.parse !== "function" ) {
        $.getScript(scriptPath + '/resources/src/mediawiki/api/parse.js').done(function () {
            createMCEMenuItems(wsTinyMCEModals);
        });
    } else {
        createMCEMenuItems(wsTinyMCEModals);
    }

    var openDialog = function(name, template, text) {
debugger;
        var templateCall = `{{${name}}}`;
        // if something is selected add as param
        if ( editor.selection.getContent() ) {
            templateCall = `{{${name}|Tinymce selected text=${editor.selection.getContent()}}}`;
        }
        // render the template
        var dialogApi = editor.windowManager.open(buildDialogSpec(`${text} invoegen`,[], {
            ws_link_form: ''
        }, template));
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
            dialogApi.redial(buildDialogSpec(`${text} invoegen`, bodyItems, initialData, template));
            dialogApi.focus(iframeName);


            // make sure that the select2 library is implemented, and rendered
            // attachTokens();
            console.log("Going to activate wssos!!");
            $(`iframe[title="${iframeName}"]`).load(function () {
                var iframe = $(`iframe[title="${iframeName}"]`);
                $(iframe).css({
                    'min-height': '200px',
                    'min-width': '200px',
                    'width': 'auto',
                    'overflow': 'hidden'
                });
                setUpTokenFunction(iframe);
                if ( typeof WsShowOnSelect !== 'function') {
                    $.getScript(scriptPath  + '/wikis/modules/wsbasics/WSShowOnSelect.js').done(function () {
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
            console.log("menuitems: ", menuItems);
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

    /**
     * convert to wiki link
     * @param data
     * @param template
     * @returns {string}
     */
//    function convert2wikiLink(data, template) {
    function convert2wikiLink(data, template) {
        var wikitxt = `{{${'Template:T5307 test'}`;
        $.each(data, function(k, v) {
            if ( !v || v === '' || v === ' ' ) {

            } else {
                wikitxt += `|${k}=${v}`;
            }
        });
        wikitxt += '}}';
        return wikitxt;
    }

    /**
     * create all the menu items
     * @param options
     */
    function createMCEMenuItems(options) {
        console.log("options: ", options);
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
                        openDialog(opt.template, opt.name, opt.text);
                    }
                });
            }
        });
    }

    function createNestedMenuItems(options) {
        var nested = [];
        $.each(options, function(index, opt) {
            console.log(opt);
            nested.push({
                type: 'menuitem',
                text: opt.text,
                onAction: function () {
                    openDialog(opt.template, opt.name, opt.text);
                }
            });
        });
        return nested;
    }

    function buildDialogSpec(title, bodyItems, initialData, template) {
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
debugger;
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

                var wikitxt = convert2wikiLink(data, template);

                // methods of the mw_wikicode plugin ..
                var args = {
                    format: 'wiki',
                    load: 'true',
                    convert2html: true
                };

                editor.undoManager.transact(function() {
                    editor.focus();
                    editor.selection.setContent(wikitxt, args);
                    editor.undoManager.add();
                });
                editor.selection.setCursorLocation();
                editor.nodeChanged();

                dialog.close();
            }
        }
    }

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

    function setUpTokenFunction(iframe) {
        if ( typeof $.fn.select2 !== 'function' ) {
            $.getScript('/extensions/WSForm/select2.min.js').done(function() {
               attachTokensIframe(iframe);
            });
        } else {
            attachTokensIframe(iframe);
        }
    }

    function attachTokensIframe(iframeBody) {
        iframeBody = $(iframeBody).contents().find('body');
        $(iframeBody).append(
            `<script>attachIframeTokens();</script>`
        );
    }

    function getScripts() {
        return `
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.0/jquery.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.4.0/js/bootstrap.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/select2@4.0.13/dist/js/select2.min.js"></script>
            <script src="/extensions/WSForm/WSForm.general.js"></script>
    `;
    }

    return;
}

tinymce.PluginManager.add('wslink', Ws_Link);
