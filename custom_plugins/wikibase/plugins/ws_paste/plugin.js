var Ws_Paste = function (editor) {
    "use strict";

    function _pastePostProcess(e) {
        var html = e.content;
        console.log({
            e: e,
            html: html
        });
        $(html).find('span[data-wiki]').each(function (i, el) {
            var newHt = $(el).attr('data-wiki');
            $(el).replaceWith(newHt);
        });
    }


    this.init = function (ed, url) {
        console.log("init ws_paste");
        ed.on('pastePreProcess', _pastePostProcess);
    }


    return;
}


tinymce.PluginManager.add('wspaste', Ws_Paste);