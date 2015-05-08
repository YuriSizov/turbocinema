platform.ready(function(){
  TCMPage.upload = {
    tabId: null,

    send: function(){
      platform.env.getCookies("auth_tk", { domain: "tfsearch.ru", path: "/" }, function(cookies){
        var token = cookies[0].value;
        if (typeof token != "undefined" && token != "govno" && token != "") {
          var file_input = platform.dom.findFirst("#upload_file");

          if (file_input.files.length) {
            var progress = platform.dom.findFirst(".upload_progress");
            progress.style.display = "inline-block";

            var data = new FormData();
            data.append('subfile', file_input.files[0]);

            platform.service.request("http://tfsearch.ru/sub/upload?json", {
              method: "post",
              dataType: "json",
              data: data,
              upload_progress: function(e){
                progress.setAttribute("value", e.loaded);
                progress.setAttribute("max", e.total);
              },
              success: function(xhr, data){
                progress.style.display = "none";
                progress.setAttribute("value", "0");

                if (typeof data.page.content.file_ok_notice != "undefined") {
                  var link = data.page.content.file_ok_notice.link;
                  TCMPage.setActionStatus("Загрузка завершена", 4000);
                  platform.messaging.send({ action: "subtitles", func: "take_upload", link: link }, TCMPage.upload.tabId, function(){ });
                } else {
                  TCMPage.setActionStatus("Загрузить файл не удалось", 4000);
                }
              },
              error: function(){
                progress.style.display = "none";
                progress.setAttribute("value", "0");
                TCMPage.setActionStatus("Загрузить файл не удалось", 4000);
              }
            });
          } else {
            TCMPage.setActionStatus("Не выбран файл");
          }
        } else {
          TCMPage.setActionStatus("Авторизация не пройдена", 4000);
        }
      });

    },
    init: function(){
      TCMPage.initPage(platform.language.getString('upload_title'), platform.language.getString('extension_name'));

      var self = this;
      var actions = platform.dom.find('.action');
      for (var i = 0; i < actions.length; i++) {
        actions[i].innerText = platform.language.getString('upload_' + actions[i].id );

        (function(){
          var act = actions[i].id.substr(7);
          if (typeof self[act] === "function") {
            actions[i].onclick = function(){ self[act](); };
          }
        })();
      }

      this.tabId = window.location.hash.substr(5);
    }
  };

  TCMPage.upload.init();
});
