platform.ready(function(){
  TCMPage.settings = (function(){
    var toggle = function(refid, enabled){
      var c = platform.dom.find('[refid="' + refid + '"]');
      for (var j in c) {
        c[j].disabled = !enabled;
      }
    };

    var
      createInput = function(id, type, parent){
        var input = platform.dom.create('input', null, 'list-item-input');
        input.id = 's_' + id;
        if (parent) {
          input.setAttribute('refid', parent);
        }
        input.type = type;

        return input;
      },
      createLabel = function(id, input){
        var label = platform.dom.create('label');
        label.for = 's_' + id;
        label.appendChild(input);

        return label;
      };

    platform.events.create('Event', 'settings-drawn');

    return {
      items: {},
      addItem: function(id, type, params, parent){
        if (typeof(parent) === "undefined" || typeof(this.items[parent]) === "undefined" ) {
          this.items[id] = { i: id, t: type, p: params, c: {}, _parent: null };
        } else {
          this.items[parent]["c"][id] = { i: id, t: type, p: params, c: {}, _parent: parent };
        }
      },
      addGroup: function(id, params) {
        this.items[id] = { i: id, t: "group", p: params, c: {}, _parent: null };
      },

      draw: function() {
        var domlist = platform.dom.findFirst("#settingslist");

        var drawItem = function(item, lvl) {
          if (item.t != "group") {
            lvl = lvl | 0;
            var domitem = platform.dom.create('div', 'settings_item_' + item.i, 'list-item' + (lvl > 0 ? ' sub' + lvl : ''));
            var domitem_title = platform.dom.create('span', null, 'list-item-title', platform.language.getString('settings_item_' + item.i + '_title'));
            var domitem_desc = platform.dom.create('p', null, 'list-item-desc');
            domitem_desc.innerHTML = platform.language.getString('settings_item_' + item.i + '_description');

            var domitem_header, domitem_body,
              input, label, handler;
            switch (item.t) {
              default: break;

              case 'checkbox':
              {
                input = createInput(item.i, "checkbox", item._parent);
                input.checked = platform.preferences.get(item.i);
                handler = function(){ toggle(item.i, input.checked); };
                input.onchange = handler;
                platform.events.on('settings-drawn', handler);

                label = createLabel(item.i, input);
                label.appendChild(domitem_title);

                domitem_header = label;
                domitem_body = domitem_desc;
              }
                break;

              case 'text':
              {
                input = createInput(item.i, (item.p.password ? "password" : "text"), item._parent);
                if (typeof item.p.max != "undefined" && item.p.max > 0) {
                  input.maxLength = item.p.max;
                }
                input.value = platform.preferences.get(item.i);
                handler = function(){ toggle(item.i, (input.value != "")); };
                input.onchange = handler;
                platform.events.on('settings-drawn', handler);

                label = createLabel(item.i, input);
                label.appendChild(domitem_title);

                domitem_header = label;
                domitem_body = domitem_desc;
              }
                break;

              case 'numeric':
              {
                input = createInput(item.i, "number", item._parent);
                input.min = item.p.min;
                input.max = item.p.max;
                input.value = platform.preferences.get(item.i);
                handler = function(){ toggle(item.i, (parseInt(input.value) != 0)); };
                input.onchange = handler;
                platform.events.on('settings-drawn', handler);

                label = createLabel(item.i, input);
                label.appendChild(domitem_title);

                domitem_header = label;
                domitem_body = domitem_desc;
              }
                break;

              case 'checkbox_set':
              {
                for (var i in item.p.values) {
                  var id = item.i + '_' + item.p.values[i];

                  input = createInput(id, "checkbox", item._parent);
                  input.checked = platform.preferences.get(id);

                  label = createLabel(id, input);
                  label.appendChild(platform.dom.create('span', null, null, platform.language.getString('settings_item_' + id + '_title')));

                  domitem_desc.appendChild(platform.dom.create('br'));
                  domitem_desc.appendChild(label);
                }

                domitem_header = domitem_title;
                domitem_body = domitem_desc;
              }
                break;
            }

            domitem.appendChild(domitem_header);
            domitem.appendChild(domitem_body);

            domlist.appendChild(domitem);

            for (var j in item.c) {
              drawItem(item.c[j], lvl + 1);
            }
          } else {
            domlist.appendChild(platform.dom.create("h3", "settings_group_" + item.i, "", platform.language.getString("settings_group_" + item.i + "_title")));
          }
        };

        for (var i in this.items) {
          drawItem(this.items[i]);
        }

        platform.events.fire('settings-drawn');
      },

      save: function(){
        var data = {};

        var getItem = function(item){
          var type = platform.dom.find('#s_' + item.i)[0];

          switch (item.t) {
            default:
              break;

            case 'checkbox':
              data[item.i] = type.checked;
              break;

            case 'text':
              data[item.i] = type.value;
              break;

            case 'numeric':
              data[item.i] = parseInt(type.value);
              break;

            case 'checkbox_set':
              for (var i in item.p.values) {
                var v = item.p.values[i];
                data[item.i + '_' + v] = platform.dom.find('#s_' + item.i + '_' + v)[0].checked;
              }
              break;
          }

          for (var j in item.c) {
            getItem(item.c[j]);
          }
        };

        for (var i in this.items) {
          getItem(this.items[i]);
        }

        for (var i in data) {
          platform.preferences.set(i, data[i]);
        }
        var onupdate = function(){
          TCMPage.setActionStatus(platform.language.getString('settings_action_save_status'));
          platform.events.off("preferences-updated", onupdate);
        };
        platform.events.on("preferences-updated", onupdate);
        platform.preferences.sync();
      },

      restore: function(){
        var restoreItem = function(item){
          var type = platform.dom.find('#s_' + item.i)[0];

          switch (item.t) {
            default:
              break;

            case 'checkbox':
              type.checked = platform.preferences.get(item.i);
              type.onchange();
              break;

            case 'text':
              type.value = platform.preferences.get(item.i);
              type.onchange();
              break;

            case 'numeric':
              type.value = platform.preferences.get(item.i);
              type.onchange();
              break;

            case 'checkbox_set':
              for (var i in item.p.values) {
                var v = item.p.values[i];
                var subtype = platform.dom.find('#s_' + item.i + '_' + v)[0];
                subtype.checked = platform.preferences.get(item.i + '_' + v);
              }
              break;
          }

          for (var j in item.c) {
            restoreItem(item.c[j]);
          }
        };

        var onupdate = function(){
          for (var i in TCMPage.settings.items) {

            restoreItem(TCMPage.settings.items[i]);
          }

          TCMPage.setActionStatus(platform.language.getString('settings_action_restore_status'));
          platform.events.off("preferences-updated", onupdate);
        };
        platform.events.on("preferences-updated", onupdate);

        platform.preferences.restore();
      },

      init: function(){
        TCMPage.initPage(platform.language.getString('settings_title'), platform.language.getString('extension_name'));

        var self = this;
        var actions = platform.dom.find('.action');
        for (var i = 0; i < actions.length; i++) {
          actions[i].innerText = platform.language.getString('settings_' + actions[i].id );

          (function(){
            var act = actions[i].id.substr(7);
            if (typeof self[act] === "function") {
              actions[i].onclick = function(){ self[act](); };
            }
          })();
        }

        this.draw();
      }
    }
  })();

  TCMPage.settings.addGroup('extension');
  TCMPage.settings.addItem('popup_enabled', 'checkbox');
  TCMPage.settings.addItem('checker_enabled', 'checkbox');
  TCMPage.settings.addItem('checker_updateInterval', 'numeric', { min: 1, max: 3600 }, 'checker_enabled');
  TCMPage.settings.addItem('checker_showCounter', 'checkbox_set', { values: ["unseen", "messages", "days"] }, 'checker_enabled');
  TCMPage.settings.addItem('checker_showNotification', 'checkbox_set', { values: ["unseen", "messages", "days"] }, 'checker_enabled');
  TCMPage.settings.addItem('checker_daysThreshold', 'numeric', { min: 1, max: 365 }, 'checker_enabled');

  TCMPage.settings.addGroup('watch');
  TCMPage.settings.addItem('inj_watch_enhanced', 'checkbox');
  TCMPage.settings.addItem('inj_watch_enhanced_hide_description', 'checkbox', {}, 'inj_watch_enhanced');
  TCMPage.settings.addItem('inj_watch_enhanced_hide_comments', 'checkbox', {}, 'inj_watch_enhanced');
  TCMPage.settings.addItem('inj_watch_enhanced_hide_eplist', 'checkbox', {}, 'inj_watch_enhanced');
  TCMPage.settings.addItem('inj_watch_enhanced_topping', 'checkbox', {}, 'inj_watch_enhanced');
  TCMPage.settings.addItem('inj_watch_enhanced_sidebuttons', 'checkbox', {}, 'inj_watch_enhanced');
  TCMPage.settings.addItem('inj_watch_enhanced_resize', 'checkbox', {}, 'inj_watch_enhanced');
  TCMPage.settings.addItem('inj_watch_playlists', 'checkbox');
  TCMPage.settings.addItem('inj_watch_beforeclose', 'checkbox');

  TCMPage.settings.addGroup('blog');
  TCMPage.settings.addItem('inj_blog_enhanced', 'checkbox');
  TCMPage.settings.addItem('inj_blog_enhanced_navigation', 'checkbox', {}, 'inj_blog_enhanced');
  TCMPage.settings.addItem('inj_blog_enhanced_formatting', 'checkbox', {}, 'inj_blog_enhanced');
  TCMPage.settings.addItem('inj_blog_enhanced_editor', 'checkbox', {}, 'inj_blog_enhanced');

  TCMPage.settings.addGroup('turbosearch');
  TCMPage.settings.addItem('inj_global_turbosearch', 'checkbox');
  TCMPage.settings.addItem('inj_global_turbosearch_login', 'text', {}, 'inj_global_turbosearch');
  TCMPage.settings.addItem('inj_global_turbosearch_password', 'text', { password: true }, 'inj_global_turbosearch');

  TCMPage.settings.addGroup('utils');
  TCMPage.settings.addItem('inj_index_hideUnfavorable', 'checkbox');
  TCMPage.settings.addItem('inj_myseries_futureReleases', 'checkbox');
  TCMPage.settings.addItem('inj_allseries_info', 'checkbox');
  TCMPage.settings.addItem('inj_global_inviteless', 'checkbox');

  TCMPage.settings.init();
});