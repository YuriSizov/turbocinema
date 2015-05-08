platform.ready(function(){
  var TCM = {
    index: 'https://turbik.tv',

    init: function(){
      TCM.settings.init();
      TCM.popup.init();
      TCM.checker.init();
      TCM.playlists.init();
      TCM.injected.init();
      TCM.turbosearch.init();

      platform.env.onInstalled(function(){
        platform.tabs.open(platform.env.getUrl("pages/firsttime.html"));
      });
      platform.env.onUpdated(function(){
        if (typeof localStorage["tcm2_setup"] == "undefined" || localStorage["tcm2_setup"] != "1") {
          platform.tabs.open(platform.env.getUrl("pages/firsttime.html"));
        }
      });

      //platform.analytics.setup("analytics code");
      platform.analytics.track("pageview", [{ name: "Extension Version", value: chrome.runtime.getManifest().version }, { name: "Current Locale", value: chrome.runtime.getManifest().current_locale }]);
    }
  };

  TCM.settings = (function(){
    // Default settings
    var a = {
      settings_inited: true,

      checker_enabled: false,
      checker_updateInterval: 15,
      checker_showCounter_unseen: true,
      checker_showCounter_messages: true,
      checker_showCounter_days: true,
      checker_showNotification_unseen: false,
      checker_showNotification_messages: true,
      checker_showNotification_days: false,
      checker_daysThreshold: 3,

      popup_enabled: true,

      inj_index_hideUnfavorable: false,

      inj_myseries_futureReleases: false,
      inj_myseries_futureReleasesOrder: "empty-last",

      inj_allseries_info: false,

      inj_blog_enhanced: false,
      inj_blog_enhanced_navigation: false,
      inj_blog_enhanced_formatting: false,
      inj_blog_enhanced_editor: false,

      inj_watch_enhanced: false,
      inj_watch_enhanced_hide_description: false,
      inj_watch_enhanced_hide_comments: false,
      inj_watch_enhanced_hide_eplist: false,
      inj_watch_enhanced_topping: false,
      inj_watch_enhanced_sidebuttons: false,
      inj_watch_enhanced_resize: false,
      inj_watch_beforeclose: true,
      inj_watch_playlists: false,

      inj_global_inviteless: false,
      inj_global_turbosearch: false,
      inj_global_turbosearch_login: "",
      inj_global_turbosearch_password: ""
    };

    return {
      init: function(){
        for (var i in a) {
          if (typeof platform.preferences.get(i) === "undefined") {
            platform.preferences.set(i, a[i]);
          }
        }
        platform.preferences.sync();

        platform.events.on("preferences-restored", function(){
          if (!platform.preferences.get("settings_inited")) {
            TCM.settings.restore();
          }
        });
      },
      restore: function(){
        for (var i in a) {
          platform.preferences.set(i, a[i]);
        }
        platform.preferences.sync();
      }
    };
  })();

  TCM.popup = (function(){
    var popup_page = "pages/popup.html";

    chrome.browserAction.onClicked.addListener(function(tab){
      platform.tabs.open(TCM.index);
    });

    platform.events.on("preferences-updated", function(){
      if (platform.preferences.get("popup_enabled") === false) {
        platform.toolbar.setPopup("");
      } else {
        platform.toolbar.setPopup(popup_page);
      }
    });

    return {
      init: function(){
        var popup = (platform.preferences.get("popup_enabled") ? popup_page : "");
        platform.toolbar.createItem(platform.language.getString('extensionName'), "imgs/imageset/bar-button.png", popup);
        platform.toolbar.setBadgeText("");
      }
    };
  })();

  TCM.checker = (function(){
    var
      _re_dig = /\d+/i,
      _doc = platform.dom.createDoc(),
      _intervals = { refresh: null, update: null },

      _counters = {
        unseen: { value: 0, oldValue: 0, color: [71, 157, 24, 255], text: platform.language.getString("badge_unseen") },
        messages: { value: 0, oldValue: 0, color: [224, 165, 5, 255], text: platform.language.getString("badge_messages") },
        days: { value: 0, oldValue: 0, color: [203, 50, 20, 255], text: platform.language.getString("badge_days") },
        _error: { value: "???", oldValue: "???", color: [140, 150, 130, 255], text: platform.language.getString('extension_name') }
      },
      _counters_show = [],
      _show_index = 0,

      _buttons = {
        unseen: function(){ platform.tabs.open( TCM.index + "/My/Series" ); },
        messages: function(){ platform.tabs.open( TCM.index + "/My/Messages" ); },
        days: function(){ platform.tabs.open( TCM.index + "/My#balance" ); }
      };

    var _trymatch = function(counter, selector) {
      _counters[counter].oldValue = _counters[counter].value;
      try {
        var _match = platform.dom.find(selector, _doc)[0].innerText.match(_re_dig);
        _counters[counter].value = _match ? parseInt(_match[0]) : 0;
        return true;
      } catch (e) {
        _counters[counter].value = 0;
        return false;
      }
    };

    platform.events.on("preferences-updated", function(){
      if (platform.preferences.get("checker_enabled") === false) {
        TCM.checker.stopEvents();
      } else {
        TCM.checker.startEvents();
      }
    });

    return {
      init: function(){
        if (platform.preferences.get('checker_enabled') && platform.preferences.get('checker_updateInterval') >= 1) {
          TCM.checker.startEvents();
        }
      },

      startEvents: function(){
        if (_intervals.update) {
          TCM.checker.stopEvents();
        }

        if (platform.preferences.get('checker_updateInterval') >= 1) {
          TCM.checker.request();
          _intervals.update = setInterval(function(){ TCM.checker.request(); }, platform.preferences.get('checker_updateInterval') * 60 * 1000);
          _intervals.refresh = setInterval(function(){ TCM.checker.show(); }, 12 * 1000);
        }
      },
      stopEvents: function(){
        for (var i in _intervals) {
          clearInterval(_intervals[i]);
          _intervals[i] = null;
        }
        _counters_show = [];
        _show_index = 0;
        TCM.checker.show();
      },

      request: function(){
        platform.service.get(TCM.index, function(xhr){
          TCM.checker.parse(xhr.responseText);
        });
      },

      parse: function(html){
        platform.dom.pasteHTML(html, _doc);

        _counters_show = [];
        _show_index = 0;

        var _is_login = (typeof platform.dom.find('#login', _doc)[0] !== "undefined");
        if (_is_login) {
          _counters_show.push("_error");
        } else {
          if (_trymatch("unseen", "#epcounthead")) {
            if (platform.preferences.get("checker_showCounter_unseen") && _counters["unseen"].value > 0) {
              _counters_show.push("unseen");
            }

            if (platform.preferences.get("checker_showNotification_unseen") && _counters["unseen"].value > 0 && _counters["unseen"].value != _counters["unseen"].oldValue) {
              TCM.checker.notify("unseen");
            }
          }
          if (_trymatch("messages", ".msgcount")) {
            if (platform.preferences.get("checker_showCounter_messages") && _counters["messages"].value > 0) {
              _counters_show.push("messages");
            }

            if (platform.preferences.get("checker_showNotification_messages") && _counters["messages"].value > 0 && _counters["messages"].value != _counters["messages"].oldValue) {
              TCM.checker.notify("messages");
            }
          }
          if (_trymatch("days", ".lowbalance, .balancecount > a")) {
            if (platform.preferences.get("checker_showCounter_days") && _counters["days"].value <= platform.preferences.get("checker_daysThreshold")) {
              _counters_show.push("days");
            }

            if (platform.preferences.get("checker_showNotification_days") && _counters["days"].value <= platform.preferences.get("checker_daysThreshold") && _counters["days"].value != _counters["days"].oldValue) {
              TCM.checker.notify("days");
            }
          }

          TCM.checker.show();
        }
      },

      show: function() {
        if (_counters_show.length) {
          var cn = _counters_show[_show_index];
          if (typeof _counters[cn] !== "undefined") {
            if (cn != "_errors") {
              var value = (_counters[cn].value < 1000) ? '' + _counters[cn].value : '' + Math.floor(_counters[cn].value / 1000) + 'k+';

              platform.toolbar.setBadgeText("" + value, "#ffffff", _counters[cn].color);
              platform.toolbar.setTitle( _counters[cn].text + ": " + _counters[cn].value );

              _show_index++;
              if (_show_index >= _counters_show.length) {
                _show_index = 0;
              }
            } else {
              platform.toolbar.setBadgeText("" + _counters[cn].value, "#ffffff", _counters[cn].color);
              platform.toolbar.setTitle( platform.language.getString('extension_name') );
            }
          } else {
            _show_index = 0;
          }
        } else {
          platform.toolbar.setBadgeText("");
          platform.toolbar.setTitle( platform.language.getString('extension_name') );
        }
      },
      notify: (function(){
        var
          pending = [],
          inProgress = null,
          send = function(){
            if (pending.length > 0) {
              var key;
              if (pending.length == 1) {
                key = pending[0];
                platform.notifications.send(
                  platform.language.getString("notification_title"),
                  platform.language.getString("notification_" + key, [ _counters[key].value, platform.language.getPlural("notification_" + key + "_words", _counters[key].value) ]),
                  "imgs/notification-icon.png",
                  [{ title: platform.language.getString("notification_" + key + "_button"), callback: _buttons[key] }]
                );
              } else {
                var
                  items = [],
                  buttons = [];

                for (var i in pending) {
                  key = pending[i];
                  items.push({ title: "", text: platform.language.getString("notification_" + key, [ _counters[key].value, platform.language.getPlural("notification_" + key + "_words", _counters[key].value) ]) });
                  buttons.push({ title: platform.language.getString("notification_" + key + "_button"), callback: _buttons[key] });
                }
                platform.notifications.send( platform.language.getString("notification_title"), "", "imgs/notification-icon.png", buttons, items );
              }
            }
            pending = [];
            inProgress = null;
          };
        return function(key) {
          pending.push(key);
          if (!inProgress) {
            inProgress = setTimeout(function(){ send(); }, 1000);
          }
        };
      })(),

      getCount: function(key) {
        if (typeof _counters[key] !== "undefined") {
          return _counters[key].value;
        }
        return 0;
      }
    };
  })();

  TCM.playlists = (function(){
    var pls = {
      'favorites': { name: platform.language.getString("inj_watch_playlists_group_favorites"), eps: [], map: {} },
      'watch-later': { name: platform.language.getString("inj_watch_playlists_group_watch_later"), eps: [], map: {} }
    };

    var
      pls_add = function(list, episode){
        pls[list].eps.push(episode);
        pls[list].map[episode.hash] = (pls[list].eps.length - 1).toString();
      },
      pls_remove = function(list, hash){
        var i = pls[list].map[hash];
        pls[list].eps.splice(i, 1);
        pls_recalc(list);
      },
      pls_clear = function(list){
        pls[list].eps = [];
        pls[list].map = {};
      },
      pls_recalc = function(list){
        pls[list].map = {};
        for (var i in pls[list].eps) {
          pls[list].map[pls[list].eps[i].hash] = i.toString();
        }
      },
      pls_create = function(list, name, episode){
        var pl = { name: name, eps: [], map: {} };
        if (typeof episode != "undefined") {
          pl.eps.push(episode);
          pl.map[episode.hash] = (pl.eps.length - 1).toString();
        }

        pls[list] = pl;
      },
      pls_destroy = function(list){
        delete pls[list];
        platform.storage.remove("playlists-" + list);
      },
      pls_sync = function(){
        var pls_keys = [];
        for (var i in pls) {
          pls_keys.push(i);
          platform.storage.set("playlists-" + i, pls[i]);
        }
        platform.storage.set("playlists", pls_keys);
      };

    return {
      init: function(){
        var stored_pls = {};
        var pls_keys = platform.storage.get("playlists");
        for (var i in pls_keys) {
          stored_pls[pls_keys[i]] = platform.storage.get("playlists-" + pls_keys[i]);
        }

        if (!stored_pls) {
          pls_sync();
        } else {
          for (var i in stored_pls) {
            if (typeof pls[i] == "undefined") {
              pls[i] = { name: "", eps: [], map: {} };
            }
            pls[i].name = stored_pls[i].name;
            pls[i].eps = stored_pls[i].eps;
            pls[i].map = stored_pls[i].map;
          }
          pls_sync();
        }

        platform.messaging.on("playlist", function(request, sender){
          switch (request.func) {
            default:
              return { result: "error", error: "unknown action" };
              break;

            case "add":
              if (typeof request.playlist == "undefined" || typeof request.episode == "undefined") {
                return { result: "error", code: 101, error: "insufficient data" };
              }
              if (typeof pls[request.playlist] == "undefined") {
                return { result: "error", code: 102, error: "playlist does not exist" };
              }
              if (pls[request.playlist].eps.length >= 10) {
                return { result: "error", code: 108, error: "playlist is full (10 max)" };
              }
              if (typeof request.episode.hash == "undefined" || request.episode.hash == "") {
                return { result: "error", code: 104, error: "malformed episode data" };
              }
              if (typeof pls[request.playlist].map[request.episode.hash] != "undefined") {
                return { result: "error", code: 106, error: "already in playlist" };
              }

              pls_add(request.playlist, request.episode);
              pls_sync();
              return { result: "success", success: true, playlist: pls[request.playlist] };
              break;

            case "remove":
              if (typeof request.playlist == "undefined" || typeof request.episode == "undefined") {
                return { result: "error", code: 101, error: "insufficient data" };
              }
              if (typeof pls[request.playlist] == "undefined") {
                return { result: "error", code: 102, error: "playlist does not exist" };
              }
              if (typeof request.episode.hash == "undefined" || request.episode.hash == "") {
                return { result: "error", code: 104, error: "malformed episode data" };
              }
              if (typeof pls[request.playlist].map[request.episode.hash] == "undefined") {
                return { result: "error", code: 107, error: "not in playlist" };
              }

              pls_remove(request.playlist, request.episode.hash);
              pls_sync();
              return { result: "success", success: true, playlist: pls[request.playlist] };
              break;

            case "clear":
              if (typeof request.playlist == "undefined") {
                return { result: "error", code: 101, error: "insufficient data" };
              }
              if (typeof pls[request.playlist] == "undefined") {
                return { result: "error", code: 102, error: "playlist does not exist" };
              }

              pls_clear(request.playlist);
              pls_sync();
              return { result: "success", success: true, playlist: pls[request.playlist] };
              break;

            case "create":
              if (typeof request.playlist == "undefined" || typeof request.playlist.id == "undefined" || typeof request.playlist.title == "undefined") {
                return { result: "error", code: 101, error: "insufficient data" };
              }
              if (typeof pls[request.playlist] != "undefined") {
                return { result: "error", code: 103, error: "playlist already exists" };
              }

              if (typeof request.episode != "undefined") {
                pls_create(request.playlist.id, request.playlist.title);

                if (typeof request.episode.hash == "undefined" || request.episode.hash == "") {
                  return { result: "error", code: 104, error: "malformed episode data" };
                }

                pls_add(request.playlist.id, request.episode);
              } else {
                pls_create(request.playlist.id, request.playlist.title);
              }

              pls_sync();
              return { result: "success", success: true, playlist: pls[request.playlist.id] };
              break;

            case "destroy":
              if (typeof request.playlist == "undefined") {
                return { result: "error", code: 101, error: "insufficient data" };
              }
              if (typeof pls[request.playlist] == "undefined") {
                return { result: "error", code: 102, error: "playlist does not exist" };
              }
              if (request.playlist == "favorites" || request.playlist == "watch-later") {
                return { result: "error", code: 105, error: "cannot destroy basic playlists" };
              }

              pls_destroy(request.playlist);
              pls_sync();
              return { result: "success", success: true };
              break;
          }
        });
      }
    };
  })();

  TCM.injected = (function(){

    return {
      init: function(){
        platform.service.interfere([TCM.index + "/services/epcomm"], function(d){
          if (typeof d.tabId != "undefined") {
            platform.messaging.send({ action: "comments", func: "onload" }, d.tabId, function(){ });
          }
        });
      }
    };
  })();

  TCM.turbosearch = (function(){
    var
      root = "http://tfsearch.ru",
      token = "";

    platform.events.on("preferences-updated", function(){
      if (platform.preferences.get("inj_global_turbosearch") === false) {
        TCM.turbosearch.deauth();
      } else {
        TCM.turbosearch.auth();
      }
    });

    return {
      init: function(){
        window.TCM_Search = TCM.turbosearch;
        this.auth();

        platform.messaging.onManual("turbosearch", function(request, sender, send){
          if (token != "") {
            switch (request.func) {
              default:
                send({ result: "error", error: "unknown action" });
                break;

              case "search":
                if (typeof request.query == "undefined" || request.query.length <= 0) {
                  send({ result: "error", error: "insufficient data" });
                }

                TCM.turbosearch.search(request.query, function(results){
                  send({ result: "success", success: true, matches: results });
                });
                break;

              case "upload_window":
                platform.tabs.popup( platform.env.getUrl("pages/upload.html#tab-" + sender.tab.id), 555, 190 );
                send({ result: "success", success: true });
                break;

              case "get_subs":
                TCM.turbosearch.getSubs(function(results){
                  send({ result: "success", success: true, files: results });
                });
                break;
            }
          } else {
            send({ result: "error", error: "not authorized" });
          }
        });
      },
      set token(value) {
        if (typeof value != "undefined" && value != "govno") {
          token = value;
        } else {
          token = "";
        }
      },
      auth: function(){
        if (token != "") {
          this.deauth();
        }

        if (platform.preferences.get("inj_global_turbosearch") && platform.preferences.get("inj_global_turbosearch_login") && platform.preferences.get("inj_global_turbosearch_password"))
        platform.service.request(root + "/login?json", {
          method : "post",
          dataType : "json",
          data : {
            login: platform.preferences.get("inj_global_turbosearch_login"),
            password: platform.preferences.get("inj_global_turbosearch_password")
          },
          success : function(xhr, data){
            if (data.page.login.accepted == "true") {
              platform.env.getCookies("auth_tk", { domain: "tfsearch.ru", path: "/" }, function(cookies){
                TCM.turbosearch.token = cookies[0].value;
              });
            }
          }
        });
      },
      deauth: function(){
        platform.service.request(root + "/logoff?json", {
          method : "post",
          dataType : "json",
          success : function(xhr, data){
            platform.env.getCookies("auth_tk", { domain: "tfsearch.ru", path: "/" }, function(cookies){
              TCM.turbosearch.token = cookies[0].value;
            });
          }
        });
      },
      search: function(string, callback){
        if (token != "") {
          if (typeof string != "undefined" && string.length > 0 && typeof callback == "function") {
            platform.service.request(root + "/search?json&q=" + encodeURIComponent(string) + "&p=0", {
              method : "get",
              dataType : "json",
              timeout : 60 * 1000,
              complete : function(xhr, data){
                var
                  results = { total: 0, data: [] },
                  response = data.page.content.search_results.groups;

                results.total = data.page.content.search_results.doccount;

                for (var i = 0; i < response.length; i++) {
                  results.data.push({ text: response[i].documents[0].title, link: response[i].documents[0].url });
                }
                callback(results);
              }
            });
          }
        }
      },
      getSubs: function(callback){
        if (token != "") {
          if (typeof callback == "function") {
            platform.service.request(root + "/subs?json", {
              method : "get",
              dataType : "json",
              complete : function(xhr, data){
                var
                  files = [],
                  response = data.page.content.sub_list.files;

                for (var i = 0; i < response.length; i++) {
                  files.push({ title: response[i].title, link: response[i].link });
                }
                callback(files);
              }
            });
          }
        }
      }

    };
  })();

  TCM.init();
});