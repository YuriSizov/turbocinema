platform.ready(function(){
  TCMPage.lists = {
    items: {},
    addItem: function(id, list){
      this.items[id] = list;
    },

    draw: function() {
      var domlist = platform.dom.findFirst('#listslist');

      var
        drawItem = function(item, id_list) {
          var ep_block = platform.dom.create("div", null, "playlist_episode_block");
          var ep_link = platform.dom.create("a", null, "playlist_episode_link", "", { href: TCMPage.index + "/Watch/" + item.id_series + "/Season" + item.season_num + "/Episode" + item.num + "#pl-" + id_list, target: "_blank" });
          ep_block.appendChild(ep_link);

          var ep_img_wrap = platform.dom.create("div", null, "playlist_episode_image");
          ep_img_wrap.appendChild(platform.dom.createImg(null, "", "https://img.turbik.tv/" + item.id_series + "/" + item.img + "b.jpg" ));
          ep_link.appendChild(ep_img_wrap);

          var ep_title = platform.dom.create("div", null, "playlist_episode_block_overtext playlist_episode_block_top");
          ep_title.appendChild(platform.dom.create("div", null, "playlist_episode_title_en", item.title_en));
          ep_title.appendChild(platform.dom.create("div", null, "playlist_episode_title_ru", item.title_ru));
          ep_link.appendChild(ep_title);

          var ep_bottom = platform.dom.create("div", null, "playlist_episode_block_overtext playlist_episode_block_bottom");
          ep_bottom.appendChild(platform.dom.create("span", null, "playlist_episode_text", "Сезон: " + item.season_num));
          ep_bottom.appendChild(platform.dom.create("span", null, "playlist_episode_text", "Эпизод: " + item.num));
          if (item.hq) {
            ep_bottom.appendChild(platform.dom.create("span", null, "playlist_episode_infoicon infoicon_hq"));
          }
          if (item.sound_en) {
            ep_bottom.appendChild(platform.dom.create("span", null, "playlist_episode_infoicon infoicon_esound"));
          }
          if (item.sound_ru) {
            ep_bottom.appendChild(platform.dom.create("span", null, "playlist_episode_infoicon infoicon_rsound"));
          }
          if (item.sub_en) {
            ep_bottom.appendChild(platform.dom.create("span", null, "playlist_episode_infoicon infoicon_esub"));
          }
          if (item.sub_ru) {
            ep_bottom.appendChild(platform.dom.create("span", null, "playlist_episode_infoicon infoicon_rsub"));
          }
          ep_link.appendChild(ep_bottom);

          var but = platform.dom.create("div", null, "playlist_button playlist_button_remove playlist_button_lists");
          but.onclick = (function(a){
            return function(e){
              if (e.button == 0) {
                TCMPage.lists.removeFromList(id_list, a);
              }
            };
          })(item);

          TCMPage.lists.appendContext(item, but);
          ep_block.appendChild(but);

          return ep_block;
        },
        drawList = function(id, list) {
          var series = platform.dom.create("div", "playlist_" + id, "playlist_block");

          var img_src = platform.env.getUrl("imgs/imageset/list-icon.any.png");
          if (id == "favorites") {
            img_src = platform.env.getUrl("imgs/imageset/list-icon.favorites.png")
          }
          else if (id == "watch-later") {
            img_src = platform.env.getUrl("imgs/imageset/list-icon.watch-later.png")
          }

          var series_top = platform.dom.create("div", null, "playlist_block_top");
          series_top.appendChild(platform.dom.createImg(null, "playlist_ico", img_src, 30, 30, list.name));
          series_top.appendChild(platform.dom.create("span", null, "playlist_title", list.name));

          var series_eps = platform.dom.create("div", null, "playlist_eps");
          if (list.eps.length) {
            for (var i in list.eps) {
              series_eps.appendChild(drawItem(list.eps[i], id));
            }
          } else {
            series_eps.appendChild(platform.dom.create("div", null, "playlist_empty", platform.language.getString("lists_playlist_empty")));
          }

          var series_acts = platform.dom.create("div", null, "playlist_actions");
          if (list.eps.length) {
            var act_emptify = platform.dom.create("span", null, "playlist_action", platform.language.getString("lists_playlist_action_emptify"));
            act_emptify.onclick = function(){
              if (confirm(platform.language.getString("lists_playlist_action_emptify_confirm"))) {
                TCMPage.lists.clearList(id);
              }
            };
            series_acts.appendChild(act_emptify);
          }
          if (id != "favorites" && id != "watch-later") {
            var act_destroy = platform.dom.create("span", null, "playlist_action", platform.language.getString("lists_playlist_action_destroy"));
            act_destroy.onclick = function(){
              if (confirm(platform.language.getString("lists_playlist_action_destroy_confirm"))) {
                TCMPage.lists.destroyList(id);
              }
            };
            series_acts.appendChild(act_destroy);
          }

          series.appendChild(series_top);
          series.appendChild(series_eps);
          series.appendChild(series_acts);

          domlist.appendChild(series);
        };

      domlist.innerHTML = "";
      for (var i in this.items) {
        drawList(i, this.items[i]);
      }
    },

    appendContext: function(data, button){
      var menus = [];
      for (var k in TCMPage.lists.items) {
        if (typeof TCMPage.lists.items[k].map[data.hash] != "undefined") {
          menus.push({
            id: 'pl-' + k,
            text: TCMPage.lists.items[k].name,
            title: platform.language.getString("inj_watch_playlists_remove_from", [TCMPage.lists.items[k].name]),
            icon: platform.env.getUrl("imgs/imageset/ico.checked.png"),
            action: (function(k, data){ return function(){ TCMPage.lists.removeFromList(k, data, button); }; })(k, data)
          });
        } else {
          if (TCMPage.lists.items[k].eps.length < 10) {
            menus.push({
              id: 'pl-' + k,
              text: TCMPage.lists.items[k].name,
              title: platform.language.getString("inj_watch_playlists_append_to", [TCMPage.lists.items[k].name]),
              icon: platform.env.getUrl("imgs/imageset/ico.unchecked.png"),
              action: (function(k, data){ return function(){ TCMPage.lists.addToList(k, data, button); }; })(k, data)
            });
          }
        }
      }
      menus.push({
        id: 'create-new',
        text: platform.language.getString("lists_context_create"),
        title: platform.language.getString("lists_context_create_title"),
        action: (function(data){ return function(){ TCMPage.lists.create(data); }; })(data)
      });

      (function(button, menus){
        platform.contextMenu.append(button, menus);
      })(button, menus);
    },
    addToList: function(list, data, from){
      platform.messaging.send({ action: "playlist", func: "add", playlist: list, episode: data }, null, function(response){
        if (response.result != "error") {
          TCMPage.lists.items[list] = response.playlist;
          TCMPage.lists.draw();
          TCMPage.setActionStatus(platform.language.getString('lists_update_success_status'));
        } else {
          TCMPage.setActionStatus(platform.language.getString('lists_update_failure_status') + (typeof response.code != "undefined" ? " " + platform.language.getString("lists_failure_reason_" + response.code) : ""));
        }
      });
    },
    removeFromList: function(list, data, from){
      platform.messaging.send({ action: "playlist", func: "remove", playlist: list, episode: data }, null, function(response){
        if (response.result != "error") {
          TCMPage.lists.items[list] = response.playlist;
          TCMPage.lists.draw();
          TCMPage.setActionStatus(platform.language.getString('lists_update_success_status'));
        } else {
          TCMPage.setActionStatus(platform.language.getString('lists_update_failure_status') + (typeof response.code != "undefined" ? " " + platform.language.getString("lists_failure_reason_" + response.code) : ""));
        }
      });
    },
    clearList: function(list){
      platform.messaging.send({ action: "playlist", func: "clear", playlist: list }, null, function(response){
        if (response.result != "error") {
          TCMPage.lists.items[list] = response.playlist;
          TCMPage.lists.draw();
          TCMPage.setActionStatus(platform.language.getString('lists_update_success_status'));
        } else {
          TCMPage.setActionStatus(platform.language.getString('lists_update_failure_status') + (typeof response.code != "undefined" ? " " + platform.language.getString("lists_failure_reason_" + response.code) : ""));
        }
      });
    },

    create: function(episode){
      var title = prompt(platform.language.getString('lists_action_create_prompt'));
      var id = platform.hash.md5(title);

      platform.messaging.send({ action: "playlist", func: "create", playlist: { id: id, title: title }, episode: episode }, null, function(response){
        if (response.result != "error") {
          TCMPage.lists.items[id] = response.playlist;
          TCMPage.lists.draw();
          TCMPage.setActionStatus(platform.language.getString('lists_action_create_success_status'));
        } else {
          TCMPage.setActionStatus(platform.language.getString('lists_action_create_failure_status') + (typeof response.code != "undefined" ? " " + platform.language.getString("lists_failure_reason_" + response.code) : ""));
        }
      });
    },
    destroyList: function(list){
      platform.messaging.send({ action: "playlist", func: "destroy", playlist: list }, null, function(response){
        if (response.result != "error") {
          delete TCMPage.lists.items[list];
          TCMPage.lists.draw();
          TCMPage.setActionStatus(platform.language.getString('lists_destroy_success_status'));
        } else {
          TCMPage.setActionStatus(platform.language.getString('lists_destroy_failure_status') + (typeof response.code != "undefined" ? " " + platform.language.getString("lists_failure_reason_" + response.code) : ""));
        }
      });
    },

    init: function(){
      TCMPage.initPage(platform.language.getString('lists_title'), platform.language.getString('extension_name'));

      var self = this;
      var actions = platform.dom.find('.action');
      for (var i = 0; i < actions.length; i++) {
        actions[i].innerText = platform.language.getString('lists_' + actions[i].id );

        (function(){
          var act = actions[i].id.substr(7);
          if (typeof self[act] === "function") {
            actions[i].onclick = function(){ self[act](); };
          }
        })();
      }

      this.draw();
    }
  };

  var pls = {};
  var pls_keys = platform.storage.get("playlists");
  for (var i in pls_keys) {
    pls[pls_keys[i]] = platform.storage.get("playlists-" + pls_keys[i]);
  }

  TCMPage.lists.addItem("favorites", pls["favorites"]);
  TCMPage.lists.addItem("watch-later", pls["watch-later"]);
  for (var i in pls) {
    TCMPage.lists.addItem(i, pls[i]);
  }
  TCMPage.lists.init();
});