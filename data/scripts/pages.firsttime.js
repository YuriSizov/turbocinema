platform.ready(function(){
  var TCMFirstTime = {
    items: {},

    addItem: function(id, bp_num){
      if (id) {
        if (typeof bp_num == "undefined" || bp_num <= 0) {
          bp_num = 1;
        }
        var item = {
          id: id,
          title: platform.language.getString("firsttime_preset_" + id + "_title"),
          bulletpoints: []
        };
        for (var i = 0; i < bp_num; i++) {
          item.bulletpoints.push(platform.language.getString("firsttime_preset_" + id + "_bp" + (i + 1)));
        }
        this.items[id] = item;
      }
    },

    drawItem: function(item){
      var
        block = platform.dom.create("div", null, "preset_block"),
        block_texts = platform.dom.create("div", null, "preset_texts"),
        block_imgs = platform.dom.create("div", null, "preset_imgs"),
        block_checker = platform.dom.create("div", null, "preset_checker");

      block_texts.appendChild(platform.dom.create("h2", null, "preset_title", item.title));
      var block_texts_bulletpoints = platform.dom.create("ul", null, "preset_bulletpoints");
      for (var i in item.bulletpoints) {
        block_texts_bulletpoints.appendChild(platform.dom.create("li", null, "", "• " + item.bulletpoints[i]));
      }
      block_texts.appendChild(block_texts_bulletpoints);

      block_imgs.appendChild(platform.dom.createImg(null, "preset_img", "../imgs/firsttime/" + item.id + "-preview.png"));

      block.appendChild(block_texts);
      block.appendChild(block_imgs);
      block.appendChild(block_checker);

      block.dataset["preset"] = item.id;
      block.onclick = function(){
        if (this.classList.contains("preset_added")) {
          this.classList.remove("preset_added");
        } else {
          this.classList.add("preset_added");
        }
      };

      return block;
    },
    drawList: function(){
      var content_main = platform.dom.findFirst(".content_main");
      for (var i in this.items) {
        content_main.appendChild(this.drawItem(this.items[i]));
      }
    },

    suggestRestore: function(){
      var restore_block = platform.dom.create("div", null, "firsttime_restore");
      restore_block.textContent = platform.language.getString("firsttime_restore");
      restore_block.onclick = function(){
        var data = {};

        if (typeof localStorage["TCM-Settings"] != "undefined" && localStorage["TCM-Settings"] != "") {
          data["popup_enabled"] = true;

          var restored_settings = JSON.parse(localStorage["TCM-Settings"]);

          if (typeof restored_settings["disableMainFunctions"] != "undefined") {
            data["inj_watch_enhanced"] = (restored_settings["disableMainFunctions"] == 0);
            data["inj_watch_enhanced_hide_description"] = (restored_settings["disableMainFunctions"] == 0);
            data["inj_watch_enhanced_hide_comments"] = (restored_settings["disableMainFunctions"] == 0);
            data["inj_watch_enhanced_hide_eplist"] = (restored_settings["disableMainFunctions"] == 0);
            data["inj_watch_enhanced_topping"] = (restored_settings["disableMainFunctions"] == 0);
            data["inj_watch_enhanced_sidebuttons"] = (restored_settings["disableMainFunctions"] == 0);
            data["inj_watch_enhanced_resize"] = (restored_settings["disableMainFunctions"] == 0);
          }
          if (typeof restored_settings["enableEpisodeLists"] != "undefined") {
            data["inj_watch_playlists"] = (restored_settings["enableEpisodeLists"] == 1);
          }
          if (typeof restored_settings["enableEpisodeChecker"] != "undefined") {
            data["checker_enabled"] = (restored_settings["enableEpisodeChecker"] == 1);
          }
          if (typeof restored_settings["setEpisodeCheckerInterval"] != "undefined") {
            data["checker_updateInterval"] = parseInt(restored_settings["setEpisodeCheckerInterval"], 10);
          }
          if (typeof restored_settings["enableEpisodeCheckerNotifications"] != "undefined") {
            data["checker_showNotification_unseen"] = (restored_settings["enableEpisodeCheckerNotifications"] == 1);
          }
          if (typeof restored_settings["enableMessagesCheckerNotifications"] != "undefined") {
            data["checker_showNotification_messages"] = (restored_settings["enableMessagesCheckerNotifications"] == 1);
          }
          if (typeof restored_settings["enableBlogEnhancer"] != "undefined") {
            data["inj_blog_enhanced"] = (restored_settings["enableBlogEnhancer"] == 1);
            data["inj_blog_enhanced_navigation"] = (restored_settings["enableBlogEnhancer"] == 1);
            data["inj_blog_enhanced_formatting"] = (restored_settings["enableBlogEnhancer"] == 1);
            data["inj_blog_enhanced_editor"] = (restored_settings["enableBlogEnhancer"] == 1);
          }
          if (typeof restored_settings["enableTurboSearch"] != "undefined") {
            data["inj_global_turbosearch"] = (restored_settings["enableTurboSearch"] == 1);
          }
          if (typeof restored_settings["setTurboSearchLogin"] != "undefined") {
            data["inj_global_turbosearch_login"] = restored_settings["setTurboSearchLogin"];
          }
          if (typeof restored_settings["setTurboSearchPass"] != "undefined") {
            data["inj_global_turbosearch_password"] = restored_settings["setTurboSearchPass"];
          }
          if (typeof restored_settings["enableWatchPrecaution"] != "undefined") {
            data["inj_watch_beforeclose"] = (restored_settings["enableWatchPrecaution"] == 1);
          }
          if (typeof restored_settings["enableCalendarFilter"] != "undefined") {
            data["inj_index_hideUnfavorable"] = (restored_settings["enableCalendarFilter"] == 1);
          }
          if (typeof restored_settings["enableMyFutureReleases"] != "undefined") {
            data["inj_myseries_futureReleases"] = (restored_settings["enableMyFutureReleases"] == 1);
            data["inj_myseries_futureReleasesOrder"] = (localStorage["TCM-FRSortOrder"] ? localStorage["TCM-FRSortOrder"] : "empty-last");
          }
        }

        this.update_settings(data);
      };

      platform.dom.findFirst(".content_topper").appendChild(restore_block);
    },

    choose: function(){
      var data = {};

      var presets = {};
      var blocks_added = platform.dom.find(".preset_block.preset_added");
      for (var i = 0; i < blocks_added.length; i++) {
        var preset_id = blocks_added[i].dataset["preset"];
        presets[preset_id] = true;
      }

      if (typeof presets["watch"] != "undefined") {
        data["inj_watch_enhanced"] = true;
        data["inj_watch_enhanced_hide_description"] = true;
        data["inj_watch_enhanced_hide_comments"] = true;
        data["inj_watch_enhanced_hide_eplist"] = true;
        data["inj_watch_enhanced_topping"] = true;
        data["inj_watch_enhanced_sidebuttons"] = true;
        data["inj_watch_enhanced_resize"] = true;
        data["inj_watch_beforeclose"] = true;
        data["inj_watch_playlists"] = true;
        data["inj_allseries_info"] = true;
      }
      if (typeof presets["blogs"] != "undefined") {
        data["inj_blog_enhanced"] = true;
        data["inj_blog_enhanced_navigation"] = true;
        data["inj_blog_enhanced_formatting"] = true;
        data["inj_blog_enhanced_editor"] = true;
      }
      if (typeof presets["turbosearch"] != "undefined") {
        data["inj_global_turbosearch"] = true;
        data["inj_global_turbosearch_login"] = "";
        data["inj_global_turbosearch_password"] = "";
      }
      if (typeof presets["all"] != "undefined") {
        data["inj_watch_enhanced"] = true;
        data["inj_watch_enhanced_hide_description"] = true;
        data["inj_watch_enhanced_hide_comments"] = true;
        data["inj_watch_enhanced_hide_eplist"] = true;
        data["inj_watch_enhanced_topping"] = true;
        data["inj_watch_enhanced_sidebuttons"] = true;
        data["inj_watch_enhanced_resize"] = true;
        data["inj_watch_beforeclose"] = true;
        data["inj_watch_playlists"] = true;
        data["inj_allseries_info"] = true;

        data["inj_blog_enhanced"] = true;
        data["inj_blog_enhanced_navigation"] = true;
        data["inj_blog_enhanced_formatting"] = true;
        data["inj_blog_enhanced_editor"] = true;

        data["inj_global_turbosearch"] = true;
        data["inj_global_turbosearch_login"] = "";
        data["inj_global_turbosearch_password"] = "";

        data["checker_enabled"] = true;
        data["checker_updateInterval"] = 15;
        data["checker_showCounter_unseen"] = true;
        data["checker_showCounter_messages"] = true;
        data["checker_showCounter_days"] = true;
        data["checker_showNotification_unseen"] = true;
        data["checker_showNotification_messages"] = true;
        data["checker_showNotification_days"] = true;
        data["checker_daysThreshold"] = 3;

        data["inj_index_hideUnfavorable"] = true;

        data["inj_myseries_futureReleases"] = true;
        data["inj_myseries_futureReleasesOrder"] = "empty-last";
      }
      
      this.update_settings(data);
    },
    gomanual: function(){
      platform.tabs.open(platform.env.getUrl("pages/settings.html"));
      this.close_window();
    },

    update_settings: function(data){
      for (var i in data) {
        platform.preferences.set(i, data[i]);
      }
      platform.events.on("preferences-updated", function(){
        TCMFirstTime.close_window();
      });
      platform.preferences.sync();

    },

    close_window: function(){
      var win = window.open('','_self');
      win.close();
    },

    init: function(){
      document.title = platform.language.getString("firsttime_title");
      platform.dom.findFirst(".content_title").textContent = platform.language.getString("firsttime_title");
      platform.dom.findFirst(".firsttime_guidence_message").textContent = platform.language.getString("firsttime_subtitle");

      if (typeof localStorage["TCM-Settings"] != "undefined") {
        this.suggestRestore();
      }

      this.drawList();

      var self = this;
      var actions = platform.dom.find(".action");
      for (var i = 0; i < actions.length; i++) {
        actions[i].innerText = platform.language.getString("firsttime_" + actions[i].id );

        (function(){
          var act = actions[i].id.substr(7);
          if (typeof self[act] === "function") {
            actions[i].onclick = function(){ self[act](); };
          }
        })();
      }

      localStorage["tcm2_setup"] = 1;
    }
  };

  TCMFirstTime.addItem("watch", 3);
  TCMFirstTime.addItem("blogs", 3);
  TCMFirstTime.addItem("turbosearch", 2);
  TCMFirstTime.addItem("all", 2);
  TCMFirstTime.init();
});