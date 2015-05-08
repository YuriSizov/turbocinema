platform.ready(function(){
  var TCMInjected = (function(){
    var _shared = {
      index: 'https://turbik.tv',
      page: '',
      series: {
        favorite: {},
        rest: {}
      },
      playlists: {}
    };

    _shared._f = {
      matchPage: function(){
        if (window.location.host != "turbik.tv") {
          platform.log("[TCM 2.0] Decided that this is not a content page");
          return 'other';
        }

        var path = window.location.pathname;
        var regs = {
          'index':            /^\/$/,
          'login':            /^\/Signin$/,
          'watch':            /^\/Watch\/([a-z0-9_]+)\/Season([0-9]+)\/Episode([0-9]+)/i,
          'series':           /^\/Series\/([a-z0-9_]+)\/Season([0-9]+)/i,
          'allseries':        /^\/Series$/i,
          'myseries':         /^\/My\/Series$/i,
          'blog':             /^\/Blog(?!\/Posts)/i,
          'blog_post':        /^\/Blog\/Posts\/([0-9]+)/i,
          'tlog':             /^\/Tlog(?!\/Posts)/i,
          'tlog_post':        /^\/Tlog\/Posts\/([0-9]+)/i,
          'mymessages':       /^\/My\/Messages$/i,
          'mymessages_post':  /^\/My\/Messages\/([0-9]+)/i,
          'mymessages_new':   /^\/My\/Messages\/New\/(.+)/i
        };

        for (var p in regs) {
          if (path.match(regs[p])) {
            _shared.page = p;
            platform.log("[TCM 2.0] Decided that this is '" + _shared.page + "' page");

            return _shared.page;
          }
        }

        return '';
      },
      afterInit: function(){
        platform.dom.findFirst("body").style.display = "block";

        platform.keystroke.enable();

        if (window.location.hash != "") {
          var scrollTo = platform.dom.findFirst(window.location.hash);
          if (typeof scrollTo != "undefined" && scrollTo) {
            scrollTo.scrollIntoView();
          }
        }
      },
      setActionStatus: (function(){
        var timeout;
        return function(text, ref_element){
          var status = platform.dom.findFirst(".action_status");
          if (!status) {
            status = platform.dom.create("div", null, "action_status");
            document.body.appendChild(status);
          }

          if (timeout) {
            clearTimeout(timeout);
          }

          status.textContent = text;
          var off = platform.dom.getOffset(ref_element);
          status.style.display = "block";

          var top = (off.top - status.offsetHeight - 5);
          if (top < 0) { top = 0; }
          status.style.top = top + "px";
          var left = (off.left - status.offsetWidth / 2 + ref_element.offsetWidth / 2);
          if (left < 0) { left = 0; }
          status.style.left = left + "px";

          timeout = setTimeout(function(){ status.style.display = "none"; }, 5400)
        }
      })(),

      getFavoriteSeries: function(context){
        var series_items = platform.dom.find('#topseries', context)[0].children;
        var block_index = 0;

        for (var i = 0; i < series_items.length && block_index < 2; i++) {
          var series_item = series_items[i];
          if (series_item.classList.contains('topmyseries')) {
            block_index++;
          }
          else if (series_item.tagName.toLowerCase() == "a") {
            _shared.series.favorite[series_item.href] = series_item;
          }
        }
      },

      getCommentsId: function(eid, callback){
        if (eid) {
          platform.service.post(_shared.index + "/services/eppid", "eid=" + eid, callback);
        }
      },
      loadComments: (function(){
        var num_comments = 0;
        var commarea, watchcomments_progress, watchcomments_block, watchcomments_refresh_status;
        var first_load = true, in_progress = false;

        return function(){
          if (typeof commarea == "undefined") {
            commarea = platform.dom.findFirst("#commarea");
          }
          if (first_load && platform.dom.findFirst("#watchcomments", commarea)) {
            first_load = false;
          }

          if (!first_load && !in_progress) {
            if (typeof watchcomments_block == "undefined") {
              watchcomments_block = platform.dom.create("div");
              commarea.appendChild(watchcomments_block);
              watchcomments_block.appendChild(platform.dom.findFirst("#watchcomments", commarea));
            }
            if (typeof watchcomments_progress == "undefined") {
              watchcomments_progress = platform.dom.create("div", null, "watchcomments_in_progress", "Комментарии загружаются...");
              commarea.appendChild(watchcomments_progress);
            }
            if (typeof watchcomments_refresh_status == "undefined") {
              watchcomments_refresh_status = platform.dom.create("div", null, "watchcomments_refresh_status");
              commarea.insertBefore(watchcomments_refresh_status, watchcomments_block);
            }

            var
              pid_input = platform.dom.findFirst('#pid'),
              pid = parseInt(pid_input.value, 10);

            var onload = function(id){
              in_progress = true;
              platform.service.request(_shared.index + "/services/epcomm", {
                method: "post",
                data: "pid=" + id,
                success: function(xhr){
                  watchcomments_block.innerHTML = xhr.responseText;
                  var num_comments_new = platform.dom.find(".watchcom", watchcomments_block).length - num_comments;
                  if (num_comments_new > 0) {
                    watchcomments_refresh_status.innerHTML = platform.env.getPlural(num_comments_new, [ "Появился ещё <span>один</span> комментарий", "Появилось ещё <span>" + num_comments_new + "</span> комментария", "Появилось ещё <span>" + num_comments_new + "</span> комментариев" ]);
                    num_comments = num_comments_new;
                  } else {
                    watchcomments_refresh_status.innerHTML = "Новых комментариев <span>нет</span>";
                  }
                },
                error: function(){
                  watchcomments_refresh_status.textContent = "Не удалось загрузить комментарии :(";
                },
                complete: function(){
                  watchcomments_progress.style.display = "none";
                  watchcomments_block.style.display = "block";
                  in_progress = false;
                }
              });
            };

            num_comments = platform.dom.find(".watchcom", watchcomments_block).length;
            watchcomments_block.style.display = "none";
            watchcomments_progress.style.display = "block";
            watchcomments_refresh_status.textContent = "";

            if (!pid) {
              _shared._f.getCommentsId(parseInt(platform.dom.findFirst("#eid").value, 10), function(xhr){
                pid = parseInt(xhr.responseText, 10) || 0;
                pid_input.value = pid;
                onload(pid);
              });
            } else {
              onload(pid);
            }
          }
        };
      })(),

      addBBCode: function(code, element){
        if ("selectionStart" in element) {
          element.focus();

          var
            s = element.selectionStart,
            e = element.selectionEnd,
            t = window.getSelection().toString();

          var
            tag_s = "[" + code.toLowerCase() + "]",
            tag_e = "[/" + code.toLowerCase() + "]";

          if ((e - s) > 0) {
            element.setRangeText(tag_s + t + tag_e);
            element.setSelectionRange(s + tag_s.length, s + tag_s.length + t.length);
          } else {
            element.setRangeText(tag_s + tag_e);
            element.setSelectionRange(s + tag_s.length, s + tag_s.length);
          }
        }
      },
      createBBCodeBar: function(textarea){
        var editor_format_buttons = platform.dom.create("div", null, "blogpost_editor_buttons");

        var editor_format_button_b = platform.dom.create("span", null, "blogpost_editor_button editor_button_bold", "Ж", { title: "Ужирнить" });
        editor_format_button_b.onclick = function(){ _shared._f.addBBCode("b", textarea); };
        editor_format_buttons.appendChild(editor_format_button_b);

        var editor_format_button_i = platform.dom.create("span", null, "blogpost_editor_button editor_button_italic", "К", { title: "Наклонить" });
        editor_format_button_i.onclick = function(){ _shared._f.addBBCode("i", textarea); };
        editor_format_buttons.appendChild(editor_format_button_i);

        var editor_format_button_u = platform.dom.create("span", null, "blogpost_editor_button editor_button_underline", "П", { title: "Подчеркнуть" });
        editor_format_button_u.onclick = function(){ _shared._f.addBBCode("u", textarea); };
        editor_format_buttons.appendChild(editor_format_button_u);

        var editor_format_button_s = platform.dom.create("span", null, "blogpost_editor_button editor_button_strike", "З", { title: "Зачеркнуть" });
        editor_format_button_s.onclick = function(){ _shared._f.addBBCode("s", textarea); };
        editor_format_buttons.appendChild(editor_format_button_s);

        var editor_format_button_irony = platform.dom.create("span", null, "blogpost_editor_button editor_button_irony", "Ирония", { title: "Поднять табличку «Сарказм»" });
        editor_format_button_irony.onclick = function(){ _shared._f.addBBCode("irony", textarea); };
        editor_format_buttons.appendChild(editor_format_button_irony);

        var editor_format_button_spoiler = platform.dom.create("span", null, "blogpost_editor_button editor_button_spoiler", "Спойлер", { title: "Пристыдиться" });
        editor_format_button_spoiler.onclick = function(){ _shared._f.addBBCode("spoiler", textarea); };
        editor_format_buttons.appendChild(editor_format_button_spoiler);

        /*
         '<span class="icotextmention" title="Упомянуть">@</span>'+
         */

        return editor_format_buttons;
      },

      createPostNavigation: function(){
        var blog_items = platform.dom.find('.blogcom');

        var grouped_items = {
          _new: [],
          _my: [],
          _god: []
        };
        var items_indecies = {
          _new: -1,
          _my: -1,
          _god: -1
        };

        for (var i = 0; i < blog_items.length; i++) {
          var blog_item = blog_items[i];
          if (blog_item.children.length) {
            var blog_combox = platform.dom.findFirst(".combox", blog_item);
            if (blog_combox.classList.contains('new')) {
              grouped_items["_new"].push(blog_item);
            }
            else if (blog_combox.classList.contains('my')) {
              grouped_items["_my"].push(blog_item);
            }
            else if (blog_combox.classList.contains('god')) {
              grouped_items["_god"].push(blog_item);
            }
          }
        }

        var drawGroupNav = function(name) {
          if (grouped_items["_" + name].length > 0) {
            var nav_counter = platform.dom.create('div', null, 'blogpost_nav_counter');
            var nav_counter_current = platform.dom.create('span', 'blogpost-' + name + '-current', 'blogpost_nav_counter_current', (items_indecies["_" + name] + 1).toString());

            nav_counter.appendChild(nav_counter_current);
            nav_counter.appendChild(platform.dom.text('/'));
            nav_counter.appendChild(platform.dom.create('span', null, 'blogpost_nav_counter_total', (grouped_items["_" + name].length).toString()));

            var nav_prev = platform.dom.create('div', 'blogpost-' + name + '-prev', 'blogpost_nav_arrows nav_arrow_up');
            nav_prev.onclick = function(){
              items_indecies["_" + name]--;
              if (items_indecies["_" + name] < 0) {
                items_indecies["_" + name] = 0;
              }
              grouped_items["_" + name][items_indecies["_" + name]].scrollIntoView();
              nav_counter_current.textContent = items_indecies["_" + name] + 1;
            };

            var nav_next = platform.dom.create('div', 'blogpost-' + name + '-next', 'blogpost_nav_arrows nav_arrow_down');
            nav_next.onclick = function(){
              items_indecies["_" + name]++;
              if (items_indecies["_" + name] >= grouped_items["_" + name].length) {
                items_indecies["_" + name] = grouped_items["_" + name].length - 1;
              }
              grouped_items["_" + name][items_indecies["_" + name]].scrollIntoView();
              nav_counter_current.textContent = items_indecies["_" + name] + 1;
            };

            var nav_title = platform.dom.create('div', null, 'blogpost_nav_title', platform.language.getString('inj_blogpost_nav_' + name + '_title'));

            nav_block.appendChild(nav_prev);
            nav_block.appendChild(nav_title);
            nav_block.appendChild(nav_counter);
            nav_block.appendChild(nav_next);
          }
        };

        var nav_block = platform.dom.create('div', 'blogpost_navigation');
        nav_block.style.top = (window.innerHeight / 3) + 'px';
        platform.events.on("resize", function(){
          nav_block.style.top = (window.innerHeight / 3) + 'px';
        });

        var nav_main_top = platform.dom.create('div', 'blogpost_top', 'blogpost_nav_arrows nav_arrow_up');
        nav_main_top.onclick = function(){ platform.dom.find('#header')[0].scrollIntoView(); };
        nav_block.appendChild(nav_main_top);

        nav_block.appendChild(platform.dom.create('div', null, 'blogpost_nav_title', platform.language.getString('inj_blogpost_nav_all_title')));
        nav_block.appendChild(platform.dom.create('div', null, 'blogpost_nav_counter', blog_items.length.toString()));

        drawGroupNav('my');
        drawGroupNav('new');
        drawGroupNav('god');

        var nav_main_bottom = platform.dom.create('div', 'blogpost_bottom', 'blogpost_nav_arrows nav_arrow_down');
        nav_main_bottom.onclick = function(){ platform.dom.find('#footer')[0].scrollIntoView(); };
        nav_block.appendChild(nav_main_bottom);

        platform.dom.find('.everything')[0].appendChild(nav_block);
      },
      enhancePosts: (function(){
        var special_links = {
          'https://turbofilm.tv': 'Турбофильм',
          'http://turbofilm.tv': 'Турбофильм',
          'https://turbik.tv': 'Турбофильм',
          'http://turbik.tv': 'Турбофильм',
          'http://tfsearch.ru': 'Турбопоиск',
          'http://tfsearch.ru/faq': 'Турбофильм: Часто задаваемые вопросы',
          'http://bit.ly/TurbofilmFAQ': 'Турбофильм: Часто задаваемые вопросы'
        };

        var
          editorOpened = null,
          editorInprogress = null;

        var
          parseContent = function(content_node){
            if (!content_node) {
              return;
            }

            var content = content_node.innerHTML;

            var
              func_img = function(match, p0, p1, p2){
                return p0 + '<a href="' + p1 + p2 + '" target="_blank" class="blogpost_link blogpost_link_img"><img src="' + platform.env.getUrl('imgs/imageset/ico.pics.png') + '" class="blogpost_link_ico">' + p1.replace('http://', '') + '/...<div class="blogpost_img"><img src="' + p1 + p2 + '" /></div></a>'
              },
              func_link = function(match, p0, p1, p2) {
                var post = '';
                if (p2.indexOf('/') != 0) {
                  post = p2;
                  p2 = '';
                }

                var
                  url = '',
                  url_text = '',
                  url_class = '';


                if (p2 == '' || p2 == '/') {
                  url = p1;

                  if (typeof special_links[url] != "undefined") {
                    url_text = special_links[url];
                  } else {
                    url_text = url.replace('http://', '');
                  }
                } else {
                  url = p1 + p2;

                  if (typeof special_links[url] != "undefined") {
                    url_text = special_links[url];
                  }
                  else if (p1 == 'https://turbofilm.tv' || p1 == 'http://turbofilm.tv' || p1 == 'https://turbik.tv' || p1 == 'http://turbik.tv') {
                    var r = p2;
                    r = r.replace(/\/Watch\//gi, '/Просмотр/');
                    r = r.replace(/\/Series\//gi, '/Сериалы/');
                    r = r.replace(/\/Season([0-9]+)/gi, '/Сезон $1');
                    r = r.replace(/\/Episode([0-9]+)/gi, '/Эпизод $1');
                    r = r.replace(/\/Blog\//gi, '/Блоги сериалов/');
                    r = r.replace(/\/Tlog\//gi, '/Турбоблог/');
                    r = r.replace(/\/Posts\//gi, '/Посты/');
                    r = r.replace(/#comm([0-9]+)/gi, '/комментарий №$1');
                    r = r.replace(/([\/#])/g, ' &gt; ');
                    url_text = 'Турбофильм' + r;
                  }
                  else if (p1 == 'http://tfsearch.ru') {
                    if (p2.match(/\/sub\//gi)) {
                      url_text = 'Турбопоиск: Субтитры к серии';
                      url_class = 'watch_subtitles_from_comments';
                    } else {
                      url_text = 'Турбопоиск ' + p2;
                    }
                  }
                  else if (p2 == '/webstore/detail/jbhpgmghgghpoobleomkefagoiihmmkn') {
                    url_text = 'Turbofilm Cinema Mode';
                  }
                  else {
                    var p2_decoded = '';
                    try {
                      p2_decoded = decodeURIComponent(p2);
                    } catch (ex) {
                      p2_decoded = p2;
                    }
                    url_text = p1.replace('http://', '') + (p2_decoded.length > 23 ? p2_decoded.substr(0, 10) + " ... " + p2_decoded.substr(-10) : p2_decoded);
                  }
                }
                url = url.replace('turbofilm.tv','turbik.tv');
                return p0 + '<a href="' + url + '" target="_blank" class="blogpost_link ' + url_class + '">' + url_text + '</a>' + post;
              }
              func_user = function(match, p0, p1) {
                if (p1.lastIndexOf('.') == (p1.length - 1)) {
                  p1 = p1.substr(0, (p1.length - 1));
                  return p0 + '<a href="https://turbik.tv/Users/' + p1 + '" target="_blank" class="blogpost_link blogpost_link_user">' + p1 + '</a>.';
                } else {
                  return p0 + '<a href="https://turbik.tv/Users/' + p1 + '" target="_blank" class="blogpost_link blogpost_link_user">' + p1 + '</a>';
                }
              };


            content = content
                        .replace(/(^|[^"'>])((?:https?):\/\/[a-z0-9.-]{2,256}\.[a-z]{2,12})([-a-zа-я0-9.,:;\/=_?!&%#+~]*\.(?:jpeg|jpg|png|gif))/gi, func_img)
                        .replace(/(^|[^"'>])((?:https?|ftp|chrome):\/\/[a-z0-9.-]{2,256}\.[a-z]{2,12})([-a-zа-я0-9.,:;\/=_?!&%#+~]*)/gi, func_link)
                        .replace(/(^|\s)@([a-z0-9@_.]+)/gi, func_user)
                        .replace(/\[(b|s|i|u)\]((.|\n)+?)\[\/\1\]/gi,'<$1>$2</$1>')
                        .replace(/\[(irony)\]((.|\n)+?)\[\/\1\]/gi, '<span class="text_ironic">$2</span>')
                        .replace(/\[(spoiler)\]((.|\n)+?)\[\/\1\]/gi, '<span class="text_spoiled" title="Спойлер! Выделите, чтобы прочесть">$2</span>');

            content_node.innerHTML = content;
          },
          enhanceSubmenu = function(post_node, id){
            platform.dom.findFirst('.funcoff', post_node).style.display = "none";

            var sidebar_block = platform.dom.create("div", null, "blogpost_comment_sidebar");
            sidebar_block.appendChild(platform.dom.create("a", null, "ithash", "", { title: "Пермалинк", href: "#" + post_node.id }));
            if (_shared.page != "mymessages_post") {
              sidebar_block.appendChild(platform.dom.create("span", "votespam" + id, "itspam", "", { title: "Это спам!" }));
              sidebar_block.appendChild(platform.dom.create("span", "votespoiler" + id, "itspoiler", "", { title: "Караул, спойлер!" }));
            }
            post_node.appendChild(sidebar_block);
          },
          enhanceInlineEditor = function(post_node, id){
            var tb = platform.dom.findFirst(".tb", post_node);

            var reply_block = platform.dom.findFirst(".replybox", post_node);
            reply_block.classList.add("blogpost_editor_inline");
            reply_block.textContent = "";
            var reply_switch = platform.dom.findFirst(".reply", post_node);
            reply_switch.id = "tcm-reply" + id;
            reply_switch.classList.add("blogpost_editor_inline");
            reply_switch.textContent = "Ответить";

            reply_switch.onclick = function(){
              if (editorInprogress) {
                return false;
              }

              if (reply_block.style.display == "block") {
                editorOpened = null;
                reply_block.style.display = "none";
                reply_switch.textContent = "Ответить";

                reply_block.innerHTML = "";
              }
              else {
                if (editorOpened) {
                  editorOpened.click();
                }

                var reply_block_area = platform.dom.create("div", null, "area");

                var reply_block_text = platform.dom.create("div", null, "replytext");
                var reply_block_textarea = platform.dom.create("textarea");
                reply_block_text.appendChild(reply_block_textarea);

                var reply_block_submit = platform.dom.create("span", null, "button");
                reply_block_submit.onclick = function(){
                  var value = reply_block_textarea.value.trim();
                  if (value !== "") {
                    editorInprogress = reply_switch;
                    tb.classList.add("blogpost_comment_progress");
                    reply_block.style.display = "none";
                    reply_switch.textContent = "Отправка";

                    var interval = setInterval(function(){
                      if (reply_switch.textContent.length < 11) {
                        reply_switch.textContent += ".";
                      } else {
                        reply_switch.textContent = "Отправка";
                      }
                    }, 350);

                    platform.service.request('/Blog/reply/' + id + '.comment', {
                      method: "post",
                      data: "text=" + value,
                      success: function(xhr){
                        editorOpened = null;
                        editorInprogress = null;
                        tb.classList.remove("blogpost_comment_progress");
                        clearInterval(interval);

                        if (xhr.responseText != "") {
                          var data = JSON.parse(xhr.responseText);
                          reply_switch.textContent = "Готово!";

                          if (_shared.page == "watch") {
                            _shared._f.loadComments();
                          } else {
                            window.location = '#comm' + data.commid;
                            window.location.reload();
                          }
                        } else {
                          reply_block.style.display = "block";
                          reply_switch.textContent = "Свернуть";
                          _shared._f.setActionStatus("Не удалось отправить", reply_block);
                        }
                      },
                      error: function(){
                        editorInprogress = null;
                        tb.classList.remove("blogpost_comment_progress");
                        clearInterval(interval);

                        reply_block.style.display = "block";
                        reply_switch.textContent = "Свернуть";
                        _shared._f.setActionStatus("Не удалось отправить", reply_block);
                      }
                    });
                  } else {
                    editorInprogress = null;
                    tb.classList.remove("blogpost_comment_progress");
                    clearInterval(interval);

                    reply_block.style.display = "block";
                    reply_switch.textContent = "Свернуть";
                    _shared._f.setActionStatus("Не удалось отправить: не введён комментарий", reply_block);
                  }
                };

                if (platform.preferences.get("inj_blog_enhanced_editor")) {
                  var reply_format_buttons = _shared._f.createBBCodeBar(reply_block_textarea);
                  reply_block_area.appendChild(reply_format_buttons);
                }
                reply_block_area.appendChild(reply_block_text);
                reply_block_area.appendChild(reply_block_submit);

                reply_block.appendChild(reply_block_area);

                reply_block.style.display = "block";
                reply_switch.textContent = "Свернуть";

                editorOpened = reply_switch;
                reply_block_textarea.focus();
              }

              return true;
            };
          },
          enhanceInfoblock = function(post_node){
            var username = platform.dom.findFirst(".name", post_node);
            if (username.textContent.length > 15) {
              username.title = username.textContent;
              username.textContent = username.textContent.substr(0, 13) + "...";
            }
          };

        return function(){
          parseContent(platform.dom.findFirst('.blogpostotext, .mymespostotext'));

          var posts = platform.dom.find('.blogcom, .watchcom');

          for (var i = 0; i < posts.length; i++) {
            var post = posts.item(i);
            var id = post.id.substr(4);
            if (!id) {
              id = platform.dom.findFirst('.tm2', post).id.substr(3);
              post.id = "comm" + id;
            }

            post.classList.add("blogpost_tcm");
            parseContent(platform.dom.findFirst('#commtext' + id, post));
            enhanceSubmenu(post, id);
            enhanceInlineEditor(post, id);
            enhanceInfoblock(post);
          }

          var img_links = platform.dom.find('.blogpost_link_img');
          for (var i = 0; i < img_links.length; i++) {
            var img_link = img_links.item(i);
            var img = platform.dom.findFirst('.blogpost_img', img_link);
            img_link.onmouseover = (function(img){ return function(){ img.style.display = "block"; }; })(img);
            img_link.onmouseout = (function(img){ return function(){ img.style.display = "none"; }; })(img);
          }
        }
      })(),
      enhanceEditor: (function(){
        var
          editorInprogress = false,
          interval = null;

        return function(){
          var reply_word = "Добавить комментарий";
          if (_shared.page == "mymessages_post") {
            reply_word = "Ответить";
          }

          var editor = platform.dom.findFirst("#newcomment");
          editor.classList.add("blogpost_editor");
          editor.innerHTML = "";

          var editor_progress = platform.dom.create("div", null, "blogpost_editor_progress");
          editor_progress.style.display = "none";
          editor.parentNode.insertBefore(editor_progress, editor);

          var editor_text = platform.dom.create("span", null, "addcomta");
          var editor_textarea = platform.dom.create("textarea");
          editor_text.appendChild(editor_textarea);
          var editor_format_buttons = _shared._f.createBBCodeBar(editor_textarea);
          var editor_submit = platform.dom.create("span", "newcommb", "addcombutton");

          editor.appendChild(editor_format_buttons);
          editor.appendChild(editor_text);
          editor.appendChild(editor_submit);

          var editor_switch = platform.dom.findFirst("#addcomment");
          var editor_switch_p = editor_switch.parentNode;
          editor_switch_p.removeChild(editor_switch);
          editor_switch = platform.dom.create("span", "addcomment", "txt blogpost_editor", reply_word);
          editor_switch_p.appendChild(editor_switch);

          editor_switch.onclick = function(){
            if (editorInprogress) {
              return false;
            }

            if (editor.style.display == "block") {
              editor.style.display = "none";
              editor_switch.textContent = reply_word;
            }
            else {
              editor.style.display = "block";
              editor_switch.textContent = "Свернуть";
              editor_textarea.focus();
            }

            return true;
          };

          var onclick = function(id){
            var value = editor_textarea.value.trim();
            if (value !== "") {
              var request_data = "text=" + value;
              if (_shared.page == "watch") {
                request_data += "&eid=" + parseInt(platform.dom.findFirst("#eid").value, 10);
              }

              platform.service.request('/Blog/reply/' + id + '.post', {
                method: "post",
                data: request_data,
                success: function(xhr){
                  editor_progress.style.display = "none";
                  editorInprogress = false;
                  clearInterval(interval);

                  if (xhr.responseText != "") {
                    var data = JSON.parse(xhr.responseText);
                    editor_switch.textContent = "Готово!";

                    if (_shared.page == "watch") {
                      _shared._f.loadComments();
                    } else {
                      window.location = '#comm' + data.commid;
                      window.location.reload();
                    }
                  } else {
                    editor.style.display = "block";
                    editor_switch.textContent = "Свернуть";
                    _shared._f.setActionStatus("Не удалось отправить", editor);
                  }
                },
                error: function(){
                  editor_progress.style.display = "none";
                  editorInprogress = false;
                  clearInterval(interval);

                  editor.style.display = "block";
                  editor_switch.textContent = "Свернуть";
                  _shared._f.setActionStatus("Не удалось отправить", editor);
                }
              });
            } else {
              editor_progress.style.display = "none";
              editorInprogress = false;
              clearInterval(interval);

              editor.style.display = "block";
              editor_switch.textContent = "Свернуть";
              _shared._f.setActionStatus("Не удалось отправить: не введён комментарий", editor);
            }
          };

          editor_submit.onclick = function(){
            editor_progress.style.display = "block";
            editorInprogress = true;
            editor.style.display = "none";
            editor_switch.textContent = "Отправка";
            interval = setInterval(function(){
              if (editor_switch.textContent.length < 11) {
                editor_switch.textContent += ".";
              } else {
                editor_switch.textContent = "Отправка";
              }
            }, 350);

            var
              pid_input = platform.dom.findFirst("#pid"),
              pid = parseInt(pid_input.value, 10);

            if (_shared.page == "watch" && !pid) {
              _shared._f.getCommentsId(parseInt(platform.dom.findFirst("#eid").value, 10), function(xhr){
                pid = parseInt(xhr.responseText, 10) || 0;
                pid_input.value = pid;
                onclick(pid);
              });
            } else {
              onclick(pid);
            }
          };
        };
      })(),
      enhanceEditorNew: (function(){
        var newpostInprogress = null;

        return function(){
          var newpost_button = platform.dom.findFirst("#newpostsw");
          var newpost_button_p = newpost_button.parentNode;
          newpost_button_p.removeChild(newpost_button);

          newpost_button = platform.dom.create("a", "newpostsw");
          newpost_button.appendChild(platform.dom.create("span", null, ( _shared.page == "mymessages_post" || _shared.page == "mymessages" ? "mymesbuttonc" : "buttonc" ), "Создать сообщение"));
          if (newpost_button_p.childNodes.length > 0) {
            newpost_button_p.insertBefore(newpost_button, newpost_button_p.childNodes.item(0));
          } else {
            newpost_button_p.appendChild(newpost_button);
          }

          var newpost_form = platform.dom.findFirst("#newpost");
          newpost_form.classList.add("blog_editor_new");
          if (_shared.page == "tlog_post" || _shared.page == "tlog" || _shared.page == "blog_post" || _shared.page == "blog") {
            platform.dom.findFirst(".content").insertBefore(newpost_form, platform.dom.findFirst(".blogmenu").nextSibling);
          }

          var newpost_send = platform.dom.findFirst("#newpostbtn", newpost_form);
          var newpost_send_p = newpost_send.parentNode;
          newpost_send_p.removeChild(newpost_send);
          newpost_send = platform.dom.create("a", "newpostbtn");
          newpost_send.appendChild(platform.dom.create("span", null, "newpostbutton"));
          newpost_send_p.appendChild(newpost_send);

          var newpost_progress = platform.dom.create("div", null, "blogpost_editor_progress");
          newpost_progress.style.display = "none";
          newpost_form.parentNode.insertBefore(newpost_progress, newpost_form);

          newpost_button.onclick = function(){
            if (newpostInprogress) {
              return false;
            }

            if (newpost_form.style.display == "block") {
              newpost_form.style.display = "none";
              newpost_button.classList.remove("buttonc_active");
            }
            else {
              newpost_form.style.display = "block";
              newpost_button.classList.add("buttonc_active");
              platform.dom.findFirst("#newposttitle").focus();
            }

            return true;
          };

          newpost_send.onclick = function(){
            newpost_progress.style.display = "block";
            newpostInprogress = true;
            newpost_form.style.display = "none";

            var
              p_title = platform.dom.findFirst("#newposttitle").value.trim(),
              p_text = platform.dom.findFirst("#newposttext").value.trim(),
              p_cat = ( _shared.page == "mymessages_post" || _shared.page == "mymessages" ? 21 : platform.dom.findFirst("#newpostcat").value );

            if (!p_title || !p_text || !p_cat) {
              newpost_progress.style.display = "none";
              newpostInprogress = false;
              newpost_form.style.display = "block";
              _shared._f.setActionStatus("Не удалось отправить: заполнены не все поля", newpost_form);
              return;
            }

            var
              data = { title: p_title, text: p_text, cat: p_cat },
              url = "/services/newpost",
              url_after = "/Blog/Posts/";

            if (_shared.page == "mymessages_post" || _shared.page == "mymessages") {
              var p_recipient = platform.dom.findFirst("#recipient").value.trim();
              if (!p_recipient) {
                newpost_progress.style.display = "none";
                newpostInprogress = false;
                newpost_form.style.display = "block";
                _shared._f.setActionStatus("Не удалось отправить: заполнены не все поля", newpost_form);
                return;
              }

              data["recipient"] = p_recipient;
              url = "/services/newmsg";
              url_after = "/My/Messages/";
            }
            else if (_shared.page == "tlog_post" || _shared.page == "tlog") {
              url_after = "/Tlog/Posts/";
            }

            platform.service.request(_shared.index + url, {
              method: "post",
              data: data,
              success: function(xhr){
                var data = parseInt(xhr.responseText) || 0;

                if (data) {
                  newpost_progress.style.display = "none";
                  newpostInprogress = false;

                  window.location = url_after + data;
                }
                else {
                  newpost_progress.style.display = "none";
                  newpostInprogress = false;
                  newpost_form.style.display = "block";
                  _shared._f.setActionStatus("Не удалось отправить", newpost_form);
                }
              },
              error: function(){
                newpost_progress.style.display = "none";
                newpostInprogress = false;
                newpost_form.style.display = "block";
                _shared._f.setActionStatus("Не удалось отправить", newpost_form);
              }
            });
          };
        };
      })(),
      enhanceMyMessages: (function(){
        var
          selfname = "",
          pid = 0;
        var
          rebuildRecipients = function(users){
            if (users.length > 0) {
              var
                recipients_line = platform.dom.findFirst("#mymessage_recipients_line"),
                recipients_block = null,
                loader_line = platform.dom.findFirst("#mymessage_loader_line");

              if (!recipients_line) {
                var container = platform.dom.findFirst(".mymesauthorblock");
                var container_ref = platform.dom.findFirst(".mymesauthorlineb", container);

                recipients_line = platform.dom.create("div", "mymessage_recipients_line", "mymesauthorlinec");
                recipients_block = platform.dom.create("div", null, "mymespostcreated mymessage_recipients");
                recipients_line.appendChild(recipients_block);
                container.insertBefore(recipients_line, container_ref);

                loader_line = platform.dom.create("div", "mymessage_loader_line", "mymesauthorlinec");
                loader_line.appendChild(platform.dom.create("div", null, "blogpost_editor_progress"));
                loader_line.style.display = "none";
                container.insertBefore(loader_line, container_ref);
              } else {
                recipients_block = platform.dom.findFirst(".mymessage_recipients", recipients_line);
              }

              var recipients_add = platform.dom.create("div", null, "mymessage_recipients_add", "[+]", { title: "Добавить участника" });
              recipients_add.onclick = function(){
                var addname = prompt("Введите имя пользователя:").trim();
                if (addname){
                  loader_line.style.display = "block";
                  recipients_line.style.display = "none";

                  platform.service.request("/services/msgacladd", {
                    method: "post",
                    data: { pid: pid, login: addname },
                    success: function(xhr){
                      loader_line.style.display = "none";
                      recipients_line.style.display = "block";

                      var data = xhr.responseText != "" ? JSON.parse(xhr.responseText) : null;
                      if (data && data.errcode == 0) {
                        rebuildRecipients(data.acl);
                        _shared._f.setActionStatus("Пользователь добавлен", recipients_line);
                      }
                      else if (data && data.errcode == 2) {
                        _shared._f.setActionStatus("Пользователя с таким именем не существует", recipients_line);
                      }
                      else {
                        _shared._f.setActionStatus("Не удалось добавить пользователя", recipients_line);
                      }
                    },
                    error: function(){
                      loader_line.style.display = "none";
                      recipients_line.style.display = "block";
                      _shared._f.setActionStatus("Не удалось добавить пользователя", recipients_line);
                    }
                  });
                }
              };

              recipients_block.innerHTML = "";
              recipients_block.appendChild(platform.dom.create("div", null, "mymessage_recipients_title", "Участники"));
              for (var i = 0; i < users.length; i++) {
                var user = users[i]; //{"ualias":"pycbouh","ulogin":"pycbouh","uid":"24219","aclid":"201235"}
                if (user.ulogin == selfname) {
                  continue;
                }

                var user_block = platform.dom.create("div", null, "mymessage_recipient_block");

                var user_link = platform.dom.create("a", null, "", "", { href: "/Users/" + user.ualias });
                user_link.appendChild(platform.dom.create("label", null, "mymespostu", user.ulogin));

                var user_del = platform.dom.create("span", null, "mymessage_recipients_del", "[x]", { title: "Исключить участника" });
                user_del.onclick = (function(user, user_block){
                  return function(){
                    if (confirm("Вы уверены, что хотите исключить участника " + user.ulogin + " из переписки?")) {
                      loader_line.style.display = "block";
                      recipients_line.style.display = "none";

                      platform.service.request("/services/msgacldel", {
                        method: "post",
                        data: { id: user.aclid },
                        success: function(xhr){
                          loader_line.style.display = "none";
                          recipients_line.style.display = "block";

                          var data = xhr.responseText != "" ? JSON.parse(xhr.responseText) : null;
                          if (data && data.errcode == 0) {
                            user_block.parentNode.removeChild(user_block);
                            _shared._f.setActionStatus("Пользователь исключён", recipients_line);
                          }
                          else {
                            _shared._f.setActionStatus("Не удалось исключить пользователя", recipients_line);
                          }
                        },
                        error: function(){
                          loader_line.style.display = "none";
                          recipients_line.style.display = "block";
                          _shared._f.setActionStatus("Не удалось исключить пользователя", recipients_line);
                        }
                      });
                    }
                  };
                })(user, user_block);

                user_block.appendChild(user_link);
                user_block.appendChild(user_del);
                recipients_block.appendChild(user_block);
              }
              recipients_block.appendChild(recipients_add);
            }
          };

        return function(){
          selfname = platform.dom.findFirst(".loginame").textContent.trim();
          var pid_input = platform.dom.findFirst("#pid");
          if (pid_input) {
            pid = parseInt(pid_input.value, 10) || 0;
          }

          var postname = platform.dom.findFirst(".mymespostu").textContent.trim();

          if (postname == selfname && pid) {
            platform.service.post("/services/msgacladd", { pid: pid, login: selfname }, function(xhr){
              var data = xhr.responseText != "" ? JSON.parse(xhr.responseText) : null;
              if (data && data.errcode == 0) {
                rebuildRecipients(data.acl);
              }
            });
          }
        };
      })(),
      enhanceMyMessagesNew: (function(){
        var
          newpostInprogress = false,
          interval = null;

        return function(){
          var old_parent = platform.dom.findFirst(".content");
          old_parent.removeChild(platform.dom.findFirst(".mymesinputareatop", old_parent));
          old_parent.removeChild(platform.dom.findFirst(".mymesinputareac", old_parent));
          old_parent.removeChild(platform.dom.findFirst(".mymesinputbuttonblock", old_parent));
          old_parent.removeChild(platform.dom.findFirst(".mymesinputareabottom", old_parent));

          var recipient = platform.dom.findFirst("#recipient");

          var newpost_form = platform.dom.create("div", "newpost", "openbox blog_editor_new");
          newpost_form.style.display = "block";

          var openboxc = platform.dom.create("span", null, "openboxc");

          var title_line = platform.dom.create("span", null, "newpostline");
          title_line.appendChild(platform.dom.create("span", null, "leftnewpost", "Заголовок"));
          var title_line_right = platform.dom.create("span", null, "rightnewpost");
          title_line_right.appendChild(platform.dom.create("input", "newposttitle", "newpostinput", null, { type: "text" }));
          title_line.appendChild(title_line_right);

          var repicient_line = platform.dom.create("span", null, "newpostline");
          repicient_line.appendChild(platform.dom.create("span", null, "leftnewpost", "Кому"));
          var repicient_line_right = platform.dom.create("span", null, "rightnewpost");
          repicient_line_right.appendChild(platform.dom.create("span", null, "newpostrecipient", recipient.value));
          repicient_line.appendChild(repicient_line_right);

          var text_line = platform.dom.create("span", null, "newpostline");
          text_line.appendChild(platform.dom.create("span", null, "leftnewpost", "Пост"));
          var text_line_right = platform.dom.create("span", null, "rightnewpost");
          text_line_right.appendChild(platform.dom.create("textarea", "newposttext", "newposttextarea", ""));
          text_line.appendChild(text_line_right);

          var newpost_send = platform.dom.create("a", "newpostbtn");
          newpost_send.appendChild(platform.dom.create("span", null, "newpostbutton"));

          openboxc.appendChild(title_line);
          openboxc.appendChild(repicient_line);
          openboxc.appendChild(text_line);

          openboxc.appendChild(newpost_send);
          newpost_form.appendChild(openboxc);
          recipient.parentNode.insertBefore(newpost_form, recipient);

          var newpost_progress_text = platform.dom.create("div", null, "blogpost_editor_progress_text");
          newpost_progress_text.style.display = "none";
          newpost_form.parentNode.insertBefore(newpost_progress_text, newpost_form);

          var newpost_progress = platform.dom.create("div", null, "blogpost_editor_progress");
          newpost_progress.style.display = "none";
          newpost_form.parentNode.insertBefore(newpost_progress, newpost_form);

          newpost_send.onclick = function(){
            newpost_progress.style.display = "block";
            newpost_progress_text.style.display = "block";
            newpostInprogress = true;
            newpost_form.style.display = "none";

            newpost_progress_text.textContent = "Отправка";
            interval = setInterval(function(){
              if (newpost_progress_text.textContent.length < 11) {
                newpost_progress_text.textContent += ".";
              } else {
                newpost_progress_text.textContent = "Отправка";
              }
            }, 350);

            var
              p_title = platform.dom.findFirst("#newposttitle").value.trim(),
              p_text = platform.dom.findFirst("#newposttext").value.trim(),
              p_cat = 21;

            if (!p_title || !p_text || !p_cat) {
              newpost_progress.style.display = "none";
              newpost_progress_text.style.display = "none";
              newpostInprogress = false;
              clearInterval(interval);
              newpost_form.style.display = "block";
              _shared._f.setActionStatus("Не удалось отправить: заполнены не все поля", newpost_form);
              return;
            }

            var
              data = { title: p_title, text: p_text, cat: p_cat, recipient: recipient.value.trim() },
              url = "/services/newmsg",
              url_after = "/My/Messages/";

            platform.service.request(_shared.index + url, {
              method: "post",
              data: data,
              success: function(xhr){
                newpost_progress.style.display = "none";
                newpost_progress_text.style.display = "none";
                newpostInprogress = false;
                clearInterval(interval);

                var data = parseInt(xhr.responseText) || 0;

                if (data) {
                  newpost_progress_text.style.display = "block";
                  newpost_progress_text.textContent = "Готово! Сейчас откроем...";
                  window.location = url_after + data;
                }
                else {
                  newpost_form.style.display = "block";
                  _shared._f.setActionStatus("Не удалось отправить", newpost_form);
                }
              },
              error: function(){
                newpost_progress.style.display = "none";
                newpost_progress_text.style.display = "none";
                newpostInprogress = false;
                clearInterval(interval);
                newpost_form.style.display = "block";
                _shared._f.setActionStatus("Не удалось отправить", newpost_form);
              }
            });
          };
        };
      })(),

      createPlaylistControl: (function(){
        _shared.playlists["favorites"] = platform.storage.get("playlists-favorites");
        _shared.playlists["watch-later"] = platform.storage.get("playlists-watch-later");
        var pls_keys = platform.storage.get("playlists");
        for (var i in pls_keys) {
          _shared.playlists[pls_keys[i]] = platform.storage.get("playlists-" + pls_keys[i]);
        }

        var
          applyButtons = function(){
            var items, item, link, a, child, tsn, ten;
            switch (_shared.page) {
              default: break;

              case "myseries":
                items = platform.dom.find(".myseriesblock,.myseriesblockc");
                for (var i = 0; i < items.length; i++) {
                  item = items.item(i);
                  link = item.parentElement;
                  link.onclick = function(e){ if (e.target.classList.contains("playlist_button")) { return false; } return true; };

                  a = createEpisode();
                  a.id_series = link.href.substr(0, link.href.indexOf("/Season")).replace("https://turbik.tv/Watch/", "");

                  for (var j = 0; j < item.children.length; j++) {
                    child = item.children[j];
                    if (child.tagName.toLowerCase() == "img") {
                      a.img = child.src.substr(child.src.lastIndexOf("/") + 1).replace("b.jpg", "");
                    }
                    else if (child.classList.contains("myseriesbtop")) {
                      a.title_en = child.children[0].textContent;
                      a.title_ru = child.children[1].textContent;
                    }
                    else if (child.classList.contains("myseriesbbot")) {
                      tsn = child.children[0].textContent;
                      a.season_num = tsn.substr(tsn.indexOf(":") + 2);
                      ten = child.children[1].textContent;
                      a.num = ten.substr(ten.indexOf(":") + 2);
                    }
                  }

                  a.hq = (platform.dom.findFirst(".myserieshq", item) != null);
                  a.sound_en = (platform.dom.findFirst(".myseriesesound", item) != null);
                  a.sound_ru = (platform.dom.findFirst(".myseriesrsound", item) != null);
                  a.sub_en = (platform.dom.findFirst(".myseriesesub", item) != null);
                  a.sub_ru = (platform.dom.findFirst(".myseriesrsub", item) != null);

                  a.hash = platform.hash.md5(a.id_series + "-" + "S" + (a.season_num.length < 2 ? "0" : "") + a.season_num + "E" + (a.num.length < 2 ? "0" : "") + a.num);

                  item.appendChild(createButton(a, "playlist_button_myseries"));
                }
                break;

              case "series":
                items = platform.dom.find(".sserieslistone");
                for (var i = 0; i < items.length; i++) {
                  item = items.item(i);
                  link = item.parentElement;
                  link.onclick = function(e){ if (e.target.classList.contains("playlist_button")) { return false; } return true; };

                  a = createEpisode();
                  a.id_series = link.href.substr(0, link.href.indexOf("/Season")).replace("https://turbik.tv/Watch/", "");

                  for (var j = 0; j < item.children.length; j++) {
                    child = item.children[j];
                    if (child.classList.contains("sserieslistoneimg")) {
                      a.img = child.children[0].src.substr(child.children[0].src.lastIndexOf("/") + 1).replace("a.jpg", "");
                    }
                    else if (child.classList.contains("sserieslistonetxt")) {
                      a.title_en = child.children[0].textContent;
                      a.title_ru = child.children[1].textContent;
                      tsn = child.children[2].textContent;
                      a.season_num = tsn.substr(tsn.indexOf(":") + 2);
                      ten = child.children[3].textContent;
                      a.num = ten.substr(ten.indexOf(":") + 2);
                    }
                  }

                  a.hq = (platform.dom.findFirst(".sserieshq", item) != null);
                  a.sound_en = (platform.dom.findFirst(".sseriesesound", item) != null);
                  a.sound_ru = (platform.dom.findFirst(".sseriesrsound", item) != null);
                  a.sub_en = (platform.dom.findFirst(".sseriesesub", item) != null);
                  a.sub_ru = (platform.dom.findFirst(".sseriesrsub", item) != null);

                  a.hash = platform.hash.md5(a.id_series + "-" + "S" + (a.season_num.length < 2 ? "0" : "") + a.season_num + "E" + (a.num.length < 2 ? "0" : "") + a.num);
                  item.appendChild(createButton(a, "playlist_button_series"));
                }
                break;

              case "index":
                items = platform.dom.find(".firstoneep");
                for (var i = 0; i < items.length; i++) {
                  item = items.item(i);
                  link = item.parentElement;
                  link.onclick = function(e){ if (e.target.classList.contains("playlist_button")) { return false; } return true; };

                  a = createEpisode();
                  a.id_series = link.href.substr(0, link.href.indexOf("/Season")).replace("https://turbik.tv/Watch/", "");

                  for (var j = 0; j < item.children.length; j++) {
                    child = item.children[j];
                    if (child.classList.contains("firstoneimage")) {
                      a.img = child.children[1].src.substr(child.children[1].src.lastIndexOf("/") + 1).replace("a.jpg", "");
                    }
                    else if (child.classList.contains("firstonetext")) {
                      a.title_en = child.children[1].textContent;
                      a.title_ru = child.children[1].textContent;
                      tsn = child.children[2].textContent;
                      a.season_num = tsn.substr(tsn.indexOf(":") + 2);
                      ten = child.children[3].textContent;
                      a.num = ten.substr(ten.indexOf(":") + 2);
                    }
                  }

                  a.hq = (platform.dom.findFirst(".fbhq", item) != null);
                  a.sound_en = (platform.dom.findFirst(".fbesound", item) != null);
                  a.sound_ru = (platform.dom.findFirst(".fbrsound", item) != null);
                  a.sub_en = (platform.dom.findFirst(".fbesub", item) != null);
                  a.sub_ru = (platform.dom.findFirst(".fbrsub", item) != null);

                  a.hash = platform.hash.md5(a.id_series + "-" + "S" + (a.season_num.length < 2 ? "0" : "") + a.season_num + "E" + (a.num.length < 2 ? "0" : "") + a.num);
                  item.appendChild(createButton(a, "playlist_button_index_right"));
                }

                item = platform.dom.findFirst(".firstbigimg");
                {
                  link = item.parentElement;
                  link.onclick = function(e){ return !e.target.classList.contains("playlist_button"); };

                  a = createEpisode();
                  a.id_series = link.href.substr(0, link.href.indexOf("/Season")).replace("https://turbik.tv/Watch/", "");

                  for (var j = 0; j < item.children.length; j++) {
                    child = item.children[j];
                    if (child.tagName.toLowerCase() == "img") {
                      a.img = child.src.substr(child.src.lastIndexOf("/") + 1).replace("b.jpg", "");
                    }
                    else if (child.classList.contains("firstbigbg")) {
                      a.title_en = child.children[1].textContent;
                      a.title_ru = child.children[1].textContent;

                      var tn = link.href.substr(link.href.indexOf("/Season")+1).split("/");
                      a.season_num = tn[0].replace("Season","");
                      a.num = tn[1].replace("Episode","");
                    }
                  }

                  a.hq = (platform.dom.findFirst(".fbhq", item) != null);
                  a.sound_en = (platform.dom.findFirst(".fbesound", item) != null);
                  a.sound_ru = (platform.dom.findFirst(".fbrsound", item) != null);
                  a.sub_en = (platform.dom.findFirst(".fbesub", item) != null);
                  a.sub_ru = (platform.dom.findFirst(".fbrsub", item) != null);

                  a.hash = platform.hash.md5(a.id_series + "-" + "S" + (a.season_num.length < 2 ? "0" : "") + a.season_num + "E" + (a.num.length < 2 ? "0" : "") + a.num);
                  item.appendChild(createButton(a, "playlist_button_index_main"));
                }
                break;

              case "watch":
                var content = platform.dom.findFirst("#content");
                var oepcimg = platform.dom.findFirst(".oepcimg", content);
                item = oepcimg.parentNode;
                {
                  link = window.location.pathname;

                  a = createEpisode();
                  a.id_series = link.substr(0, link.indexOf("/Season")).replace("/Watch/", "");

                  for (var j = 0; j < oepcimg.children.length; j++) {
                    child = oepcimg.children[j];
                    if (child.tagName.toLowerCase() == "img") {
                      a.img = child.src.substr(child.src.lastIndexOf("/") + 1).replace("a.jpg", "");
                    }
                    else if (child.classList.contains("hq")) {
                      a.hq = (platform.dom.findFirst("img", child).src.indexOf("promohq.png") > 0);
                    }
                  }

                  a.title_en = platform.dom.findFirst(".comwatchinputlinec", content).textContent;
                  a.title_ru = platform.dom.findFirst("#runame", content).value;

                  var tn = link.substr(link.indexOf("/Season")+1).split("/");
                  a.season_num = tn[0].replace("Season","");
                  a.num = tn[1].replace("Episode","");

                  a.sound_en = (platform.dom.findFirst(".esound", item) != null);
                  a.sound_ru = (platform.dom.findFirst(".rsound", item) != null);
                  a.sub_en = (platform.dom.findFirst(".esub", item) != null);
                  a.sub_ru = (platform.dom.findFirst(".rsub", item) != null);

                  a.hash = platform.hash.md5(a.id_series + "-" + "S" + (a.season_num.length < 2 ? "0" : "") + a.season_num + "E" + (a.num.length < 2 ? "0" : "") + a.num);

                  var maine = platform.dom.findFirst(".maine", content);
                  maine.style.position = "relative";
                  maine.appendChild(createButton(a, "playlist_button_watch", "favorites"));
                }
                break;
            }
          },
          createEpisode = function(){
            return {
              hash: "",
              id_series: "",
              title_en: "",
              title_ru: "",
              num: 0,
              season_num: 0,
              img: "",
              hq: false,
              sound_en: false,
              sound_ru: false,
              sub_en: false,
              sub_ru: false
            };
          },
          createButton = function(data, style, default_pl){
            if (typeof default_pl == "undefined") {
              default_pl = "watch-later";
            }
            var but = platform.dom.create("div", null, "playlist_button playlist_button_add " + style);
            but.onclick = (function(a, but){
              return function(e){
                if (e.button == 0) {
                  addToList(default_pl, a, but);
                }
              };
            })(data, but);

            appendContext(data, but);
            return but;
          },
          appendContext = function(data, button){
            var menus = [];
            for (var k in _shared.playlists) {
              if (typeof _shared.playlists[k].map[data.hash] != "undefined") {
                menus.push({
                  id: 'pl-' + k,
                  text: _shared.playlists[k].name,
                  title: platform.language.getString("inj_watch_playlists_remove_from", [_shared.playlists[k].name]),
                  icon: platform.env.getUrl("imgs/imageset/ico.checked.png"),
                  action: (function(k, data){ return function(){ removeFromList(k, data, button); }; })(k, data)
                });
              } else {
                if (_shared.playlists[k].eps.length < 10) {
                  menus.push({
                    id: 'pl-' + k,
                    text: _shared.playlists[k].name,
                    title: platform.language.getString("inj_watch_playlists_append_to", [_shared.playlists[k].name]),
                    icon: platform.env.getUrl("imgs/imageset/ico.unchecked.png"),
                    action: (function(k, data){ return function(){ addToList(k, data, button); }; })(k, data)
                  });
                }
              }
            }
            menus.push({
              id: 'create-new',
              text: platform.language.getString("lists_context_create"),
              title: platform.language.getString("lists_context_create_title"),
              action: (function(data){ return function(){ createList(data, button); }; })(data)
            });

            (function(button, menus){
              platform.contextMenu.append(button, menus);
            })(button, menus);
          },
          addToList = function(list, data, from){
            platform.messaging.send({ action: "playlist", func: "add", playlist: list, episode: data }, null, function(response){
              if (response.result != "error") {
                _shared.playlists[list] = response.playlist;
                appendContext(data, from);
                _shared._f.setActionStatus(platform.language.getString("lists_update_success_status"), from);
              } else {
                _shared._f.setActionStatus(platform.language.getString("lists_update_failure_status") + (typeof response.code != "undefined" ? " " + platform.language.getString("lists_failure_reason_" + response.code) : ""), from);
              }
            });
          },
          removeFromList = function(list, data, from){
            platform.messaging.send({ action: "playlist", func: "remove", playlist: list, episode: data }, null, function(response){
              if (response.result != "error") {
                _shared.playlists[list] = response.playlist;
                appendContext(data, from);
                _shared._f.setActionStatus(platform.language.getString("lists_update_success_status"), from);
              } else {
                _shared._f.setActionStatus(platform.language.getString("lists_update_failure_status") + (typeof response.code != "undefined" ? " " + platform.language.getString("lists_failure_reason_" + response.code) : ""), from);
              }
            });
          },
          createList = function(data, from){
            var title = prompt(platform.language.getString('lists_action_create_prompt'));
            var id = platform.hash.md5(title);

            platform.messaging.send({ action: "playlist", func: "create", playlist: { id: id, title: title }, episode: data }, null, function(response){
              if (response.result != "error") {
                _shared.playlists[id] = response.playlist;
                appendContext(data, from);
                _shared._f.setActionStatus(platform.language.getString("lists_action_create_success_status"), from);
              } else {
                _shared._f.setActionStatus(platform.language.getString("lists_action_create_failure_status") + (typeof response.code != "undefined" ? " " + platform.language.getString("lists_failure_reason_" + response.code) : ""), from);
              }
            });
          };

        return function(){
          applyButtons();
        };
      })(),
      createPlaylistSlider: (function(){
        var
          slider_old,
          slider_new,
          slider_ul,
          playlist_id;

        var
          epboxes = [],
          episode_index = 0,
          current_index = -1,
          split_by = 3;

        var
          createEpbox = function(item){
            var
              item_link = _shared.index + "/Watch/" + item.id_series + "/Season" + item.season_num + "/Episode" + item.num + "#pl-" + playlist_id,
              is_active = false;

            current_index++;
            if (item_link == window.location.href) {
              is_active = true;
              episode_index = current_index;
            }

            var
              epbox = platform.dom.create("div", null, "epbox"),
              epbox_link = platform.dom.create("a", null, "", "", { href: item_link }),
              epbox_img = platform.dom.create("span", null, (is_active ? "oepcimg" : "oepimg")),
              epbox_text = platform.dom.create("span", null, "oeptxt");

            if (item.hq) {
              var epbox_img_hq = platform.dom.create("span", null, "hq");
              epbox_img_hq.appendChild(platform.dom.createImg(null, "", "https://s.turbik.tv/i/watch/promohq.png", 20, 10, "High Quality" ));
              epbox_img_hq.appendChild(platform.dom.text(" "));
              epbox_img.appendChild(epbox_img_hq);
            }
            epbox_img.appendChild(platform.dom.createImg(null, "", "https://img.turbik.tv/" + item.id_series + "/" + item.img + "a.jpg", 140, 81, "" ));

            epbox_text.appendChild(platform.dom.create("span", null, "en", item.title_en.substr(0,20) + ( item.title_en.length > 20 ? "..." : "" )));
            epbox_text.appendChild(platform.dom.create("span", null, "ru", item.title_ru.substr(0,22) + ( item.title_en.length > 22 ? "..." : "" )));
            epbox_text.appendChild(platform.dom.create("span", null, "os", "Сезон: " + item.season_num));
            epbox_text.appendChild(platform.dom.create("span", null, "oe", "Эпизод: " + item.num));
            if (item.sound_ru) {
              epbox_text.appendChild(platform.dom.create("span", null, "rsound"));
            }
            if (item.sound_en) {
              epbox_text.appendChild(platform.dom.create("span", null, "esound"));
            }
            if (item.sub_ru) {
              epbox_text.appendChild(platform.dom.create("span", null, "rsub"));
            }
            if (item.sub_en) {
              epbox_text.appendChild(platform.dom.create("span", null, "esub"));
            }

            epbox.appendChild(epbox_link);
            epbox_link.appendChild(epbox_img);
            epbox_link.appendChild(epbox_text);

            return epbox;
          },
          parsePlaylist = function(){
            for (var i in _shared.playlists[playlist_id].eps) {
              epboxes.push(createEpbox(_shared.playlists[playlist_id].eps[i]));
            }

            var li;
            for (var j in epboxes) {
              if (j % split_by == 0) {
                if (typeof li != "undefined") {
                  slider_ul.appendChild(li);
                }
                li = platform.dom.create("li");
              }
              li.appendChild(epboxes[j]);
            }
            if (typeof li != "undefined") {
              slider_ul.appendChild(li);
            }
          },
          injectScript = function(){
            var script_text = "" +
              "$('#slider_playlist').append('<a id=\"sliderpos\" rel=\"0\"></a>');" +
              "$('#slider_playlist').slider({ continuous: false, prevId: 'prev', nextId: 'next' });" +
              "$('#sliderpos').attr('rel', Math.floor(" + episode_index + " / 3));" +
              "$('#sliderpos').click();";

            var script = platform.dom.create("script");
            script.textContent = script_text;
            document.body.appendChild(script);
          };

        return function(){
          playlist_id = window.location.hash.substr(4);
          if (playlist_id && typeof _shared.playlists[playlist_id] != "undefined" && _shared.playlists[playlist_id].eps.length) {
            slider_old = platform.dom.findFirst("#slider");
            slider_new = platform.dom.create("div", "slider_playlist", "eplist");

            slider_ul = platform.dom.create("ul");
            parsePlaylist();
            slider_new.appendChild(slider_ul);

            slider_old.parentNode.replaceChild(slider_new, slider_old);
            injectScript();
          }
        };
      })(),

      createFutureReleases: (function(){
        var
          current_date = new Date(),
          current_days = Math.floor(current_date.getTime() / 86400000),
          max_days = 6,
          max_weeks = 5,

          parsed_items = [],
          parseItem = function(node){
            var a = {};
            a.element = node;
            a.img = platform.dom.find('.firstcalendarimg', node)[0].children.item(0).src;
            a.url = node.children.item(1).href;
            a.name = platform.dom.find('.firstcalendarepisode', node)[0].textContent;
            a.name_series = platform.dom.find('.firstcalendarseries', node)[0].textContent;
            a.date = parseDate(platform.dom.find('.firstcalendardate', node)[0].textContent);
            a.id = a.img.replace("https://s.turbik.tv/i/series/", "").replace(".png", "");
            parsed_items.push(a);
          },
          parseDate = function(date_str){
            var
              date_arr = date_str.trim().split(' '),
              date = new Date(),
              date_text;

            if (date_arr.length >= 2) {
              date.setDate(date_arr[0]);
              date.setMonth(lib.months[date_arr[1]] - 1);
              if (date.getMonth() < current_date.getMonth()) {
                date.setFullYear(current_date.getFullYear() + 1);
              } else {
                date.setFullYear(current_date.getFullYear());
              }
            }
            var diff = Math.floor((date.getTime() + 12345) / 86400000) - current_days;
            date_text = parseDateText(diff);

            var hotness = 1;
            if (diff < 0) {
              hotness = -1;
            } else if (diff < 0.1) {
              hotness = 5;
            } else if (diff - 1 < 0.1) {
              hotness = 4;
            } else if (diff - 2 < 0.1) {
              hotness = 3;
            } else if (diff - max_days < 0.1) {
              hotness = 2;
            }

            return { date: date, text: date_text, hotness: hotness, raw: date_str.trim() };
          },
          parseDateText = function(diff){
            var date_text = '';

            if (diff < 0) {
              date_text = lib.words.last_century;
            } else if (diff < 0.1) {
              date_text = lib.words.today;
            } else if (diff - 1 < 0.1) {
              date_text = lib.words.tomorrow;
            } else if (diff - 2 < 0.1) {
              date_text = lib.words.day_after_tomorrow;
            } else if (diff - max_days < 0.1) {
              date_text = lib.words.after + lib.numbers[diff - 1].mon_title.toLowerCase() + " " + lib.plural.day[lib.numbers[diff - 1].month];
            } else {
              var weekdiff = Math.floor(diff / 7);
              if (weekdiff - max_weeks < 0.1) {
                if (weekdiff - 1 < 0.1) { // one
                  if ((diff % 7) > 3) { // and a half
                    date_text = lib.words.after + lib.words.one_and_a_half_weeks + " " + lib.plural.week[1];
                  } else {
                    date_text = lib.words.after + lib.plural.week[lib.numbers[weekdiff - 1].week];
                  }
                } else {
                  date_text = lib.words.after + lib.numbers[weekdiff - 1].week_title.toLowerCase() + ((diff % 7) > 3 ? lib.words.and_a_half : "") + " " + lib.plural.week[lib.numbers[weekdiff - 1].week];
                }
              } else {
                var monthdiff = Math.floor(diff / 30);
                if (monthdiff - 1 < 0.1) { // one
                  if ((diff % 30) > 14) { // and a half
                    date_text = lib.words.after + lib.words.one_and_a_half_months + " " + lib.plural.month[1];
                  } else {
                    date_text = lib.words.after + lib.plural.month[lib.numbers[monthdiff - 1].month];
                  }
                } else {
                  if (monthdiff - lib.numbers.length < 0.1) {
                    date_text = lib.words.after + lib.numbers[monthdiff - 1].mon_title.toLowerCase() + ((diff % 30) > 14 ? lib.words.and_a_half : "") + " " + lib.plural.month[lib.numbers[monthdiff - 1].month];
                  } else {
                    date_text = lib.words.after + monthdiff + ((diff % 30) > 14 ? ".5" : "") + " " + lib.words.fallback_months;
                  }
                }
              }
            }

            return date_text;
          },

          drawItems = function(){
            var
              order = platform.preferences.get("inj_myseries_futureReleasesOrder"),
              series_blocks = platform.dom.find('.myseriesbox');

            for (var p in parsed_items) {
              var
                item = parsed_items[p],
                series = platform.dom.findFirst("#seriesbox" + item.id),
                series_eps = 0,
                series_eps_titles = [];

              if (!series) {
                series = platform.dom.create("div", "seriesbox" + item.id, "myseriesbox");
                var series_top = platform.dom.create("div", null, "myseriest");

                var series_ico = platform.dom.create("span", null, "myseriesico");
                series_ico.appendChild(platform.dom.createImg(null, "", "https://s.turbik.tv/i/series/" + item.id + ".png", 30, 30, item.name_series));
                var series_ico_a = platform.dom.create("a");
                series_ico_a.href = item.url;
                series_ico_a.appendChild(platform.dom.create("span", null, "myseriesicotop"));
                series_ico.appendChild(series_ico_a);
                series_top.appendChild(series_ico);

                var series_title = platform.dom.create("a");
                series_title.href = item.url;
                series_title.appendChild(platform.dom.create("span", null, "myseriesent", item.name_series));
                series_title.appendChild(platform.dom.create("span", null, "myseriesrut", "/ " + item.name_series));
                series_top.appendChild(series_title);

                series.appendChild(series_top);
                series.appendChild(platform.dom.create("div", null, "myseriesoption"));

                if (order == "empty-last") {
                  platform.dom.findFirst(".content").insertBefore(series, platform.dom.findFirst("#noitems"));
                }
                else if (order == "alphabetical") {
                  for (var s = 0; s < series_blocks.length; s++) {
                    var series_item = series_blocks.item(s);
                    if (platform.dom.findFirst(".myseriesent", series_item).textContent.trim().toLowerCase() > item.name_series.trim().toLowerCase()) {
                      platform.dom.findFirst(".content").insertBefore(series, series_item);
                      break;
                    }
                  }
                }
              } else {
                for (var i = 0; i < series.children.length; i++) {
                  if (series.children.item(i).tagName.toLowerCase() == "a") {
                    series_eps++;
                    series_eps_titles.push('+' + platform.dom.findFirst('.myseriesbten', series.children.item(i)).textContent.toLowerCase() + '+');
                  }
                }
              }

              if (series_eps < 3 && series_eps_titles.join(";").indexOf('+' + item.name.toLowerCase() + '+') < 0) {
                var ep = platform.dom.create("span");
                var ep_block = platform.dom.create("span", null, "myseriesblock" + (series_eps == 1 ? "c" : "") + " myseriesblock_hotness_" + item.date.hotness);
                var ep_img_wrap = platform.dom.create("div", null, "myseries_image_wrapper");
                ep_img_wrap.appendChild(platform.dom.createImg(null, "", "https://s.turbik.tv/i/series/" + item.id + "s.jpg" ));
                ep_block.appendChild(ep_img_wrap);
                var ep_title = platform.dom.create("span", null, "myseriesbtop");
                ep_title.appendChild(platform.dom.create("span", null, "myseriesbten", item.name));
                ep_title.appendChild(platform.dom.create("span", null, "myseriesbtru", item.name));
                ep_block.appendChild(ep_title);
                var ep_bottom = platform.dom.create("span", null, "myseriesbbot", "", { title: item.date.raw });
                ep_bottom.appendChild(platform.dom.create("span", null, "myseriesbbs", item.date.text));
                ep_block.appendChild(ep_bottom);
                ep.appendChild(ep_block);

                series.insertBefore(ep, platform.dom.findFirst(".myseriesoption", series));
              }
            }
          },
          drawOrderSwitch = function(){
            var
              order = platform.preferences.get("inj_myseries_futureReleasesOrder"),
              block = platform.dom.create("div", "futurereleases_container", "", "Порядок сортировки: "),
              fr_switch;

            if (order == "empty-last") {
              block.appendChild(platform.dom.create("b", null, "", "Сначала недосмотренные"));
            } else {
              fr_switch = platform.dom.create("a", "", "futurereleases_switch", "Сначала недосмотренные");
              fr_switch.setAttribute("ref", "empty-last");
              fr_switch.onclick = function(){
                platform.preferences.set("inj_myseries_futureReleasesOrder", "empty-last");
                platform.preferences.sync(function(){
                  window.location.reload();
                });
              };
              block.appendChild(fr_switch);
            }

            block.appendChild(platform.dom.create("span", null, "", " | "));

            if (order == "alphabetical") {
              block.appendChild(platform.dom.create("b", null, "", "По алфавиту"));
            } else {
              fr_switch = platform.dom.create("a", "", "futurereleases_switch", "По алфавиту");
              fr_switch.setAttribute("ref", "alphabetical");
              fr_switch.onclick = function(){
                platform.preferences.set("inj_myseries_futureReleasesOrder", "alphabetical");
                platform.preferences.sync(function(){
                  window.location.reload();
                });
              };
              block.appendChild(fr_switch);
            }

            platform.dom.findFirst(".messagestitle").appendChild(block);
          };

        var lib = {
          months: { "января" : 1, "февраля" : 2, "марта" : 3, "апреля" : 4, "мая" : 5, "июня" : 6, "июля" : 7, "августа" : 8, "сентября" : 9, "октября" : 10, "ноября" : 11, "декабря" : 12 },
          plural: {
            day: [ "день", "дня", "дней" ],
            week: [ "неделю", "недели", "недель" ],
            month: [ "месяц", "месяца", "месяцев" ]
          },
          words: {
            last_century : "В прошлом веке <_>",
            today: "Сегодня о_о",
            tomorrow: "Завтра!!!",
            day_after_tomorrow: "Послезавтра!",
            after: "Через ",
            and_a_half: " с половиной",
            one_and_a_half_months: "полтора",
            one_and_a_half_weeks: "полторы",
            fallback_months: "мес."
          },

          numbers : [
            { mon_title: "Один", week_title: "Одну", month: 0, week: 0 },
            { mon_title: "Два", week_title: "Две", month: 1, week: 1 },
            { mon_title: "Три", week_title: "Три", month: 1, week: 1 },
            { mon_title: "Четыре", week_title: "Четыре", month: 1, week: 1 },
            { mon_title: "Пять", week_title: "Пять", month: 2, week: 2 },
            { mon_title: "Шесть", week_title: "Шесть", month: 2, week: 2 },
            { mon_title: "Семь", week_title: "Семь", month: 2, week: 2 },
            { mon_title: "Восемь", week_title: "Восемь", month: 2, week: 2 },
            { mon_title: "Девять", week_title: "Девять", month: 2, week: 2 },
            { mon_title: "Десять", week_title: "Десять", month: 2, week: 2 }
          ]
        };

        return function(){
          platform.service.get(_shared.index, function(xhr){
            var doc = platform.dom.pasteHTML(xhr.responseText);
            var calendar_items = platform.dom.find('.firstcalendarbox', doc);

            for (var j = 0; j < calendar_items.length; j++) {
              var calendar_item = calendar_items.item(j);
              var h = calendar_item.children.item(1).href;
              if (typeof _shared.series.favorite[h] !== "undefined") {
                parseItem(calendar_item);
              }
            }

            drawOrderSwitch();
            drawItems();
          });
        }
      })(),
      createSeriesInfo: function(){
        var
          api_search = "http://api.myshows.ru/shows/search/?q=",
          api_info = "http://api.myshows.ru/shows/";

        var statuses = {
          "Canceled/Ended" : "Закрыт или завершён",
          "Final Season" : "Последний сезон",
          "In Development" : "Снимается",
          "New Series" : "Новый сериал",
          "On Hiatus" : "Перерыв",
          "Returning Series" : "В эфире",
          "TBD/On The Bubble" : "Судьба не объявлена"
        };

        var series = platform.dom.findFirst(".content").children;

        for (var i = 0; i < series.length; i++) {
          var item = series[i];
          if (item.tagName.toLowerCase() == "a") {
            (function(item){
              var
                title = {
                  ru: platform.dom.findFirst(".serieslistboxru", item).textContent,
                  en: platform.dom.findFirst(".serieslistboxen", item).textContent
                },
                year_premier = platform.dom.findFirst(".serieslistboxpersr", item).children[0].textContent.trim();

              var
                series_block = platform.dom.create("div", null, "series_block"),
                info_button = platform.dom.create("div", null, "series_info_button", "", { title: "Показать дополнительную информацию о сериале" }),
                info_block = platform.dom.create("div", null, "series_info_block");
              item.parentNode.insertBefore(series_block, item);
              series_block.appendChild(item);
              series_block.appendChild(info_block);
              series_block.appendChild(info_button);

              var info_block_data = platform.dom.create("div");
              info_block.appendChild(info_block_data);
              var copywrong = platform.dom.create("div", null, "turbosearch_copywrong");
              copywrong.appendChild(platform.dom.text("powered by "));
              copywrong.appendChild(platform.dom.create("a", null, "", "myshows.ru", { href: "http://myshows.ru/", target: "_blank" }));
              info_block.appendChild(copywrong);


              var
                request_info = function(){
                  info_block_data.appendChild(platform.dom.create("span", null, "", "Загрузка..."));
                  platform.service.request(api_search + encodeURIComponent(title.en), {
                    method: "get",
                    dataType: "json",
                    success: function(xhr, data){
                      info_block_data.innerHTML = "";
                      parse_info(data);
                    },
                    error: function(xhr, data){
                      info_block_data.innerHTML = "";
                      info_block_data.appendChild(platform.dom.create("span", null, "", "Не удалось загрузить информацию :("));
                    }
                  });
                },
                parse_info = function(data){
                  var
                    title_compare = title.en.toLowerCase().replace(/[\W\d]/g, ''),
                    year_compare = year_premier.substr(year_premier.lastIndexOf(" ") + 1);
                  var
                    possible_matches = { 1: [], 2: [], 3: [], 4: [] },
                    id_best_match = 0;

                  for (var id in data) {
                    var started = data[id].started.trim();
                    var year_started = started.substr(started.lastIndexOf("/") + 1);

                    if (data[id].title.toLowerCase().replace(/\W/g, '') == title_compare && year_started == year_compare) {
                      possible_matches[1].push(id);
                    }
                    else if (data[id].title.toLowerCase().replace(/[\W\d]/g, '') == title_compare && year_started == year_compare) {
                      possible_matches[1].push(id);
                    }
                    else if (data[id].title.toLowerCase().replace(/\W/g, '') == title_compare) {
                      possible_matches[2].push(id);
                    }
                    else if (data[id].title.toLowerCase().replace(/[\W\d]/g, '') == title_compare) {
                      possible_matches[3].push(id);
                    }
                    else if (data[id].title.toLowerCase().replace(/[\W\d]/g, '').indexOf(title_compare) == 0) {
                      possible_matches[3].push(id);
                    }
                    else if (data[id].title.toLowerCase().replace(/[\W\d]/g, '').indexOf(title_compare) > 0) {
                      possible_matches[4].push(id);
                    }
                  }

                  id_best_match = (((possible_matches[1][0] || possible_matches[2][0]) || possible_matches[3][0]) || possible_matches[4][0]) || 0;
                  if (id_best_match) {
                    var data_item = data[id_best_match];
                    var data_block = platform.dom.create("div", null, "series_info_data");

                    var data_title = platform.dom.create("h3", null, "", data_item.title);
                    data_title.appendChild(platform.dom.create("span", null, "", data_item.ruTitle));
                    data_block.appendChild(data_title);
                    var data_status_str = statuses[data_item.status] || "Информация о статусе отсутствует";
                    data_block.appendChild(platform.dom.create("span", null, "series_info_status", data_status_str));

                    var data_rating_back = platform.dom.create("div", null, "series_info_rating_back", "", { title: "Оценка: " + data_item.rating });
                    var data_rating = platform.dom.create("div", null, "series_info_rating");
                    data_rating.style.width = ( 100 * ( parseInt(data_item.rating, 10) / 5 ) ) + "%";
                    data_rating_back.appendChild(data_rating);
                    data_block.appendChild(data_rating_back);

                    var links_count = 0;
                    var data_block_links = platform.dom.create("p");
                    if (data_item.imdbId) {
                      if (links_count > 0) { data_block_links.appendChild(platform.dom.create("br")); }
                      data_block_links.appendChild(platform.dom.create("a", null, "", "На IMDb.com", { href: "http://www.imdb.com/title/tt" + data_item.imdbId + "/", target: "_blank" }));
                      links_count++;
                    }
                    if (data_item.kinopoiskId) {
                      if (links_count > 0) { data_block_links.appendChild(platform.dom.create("br")); }
                      data_block_links.appendChild(platform.dom.create("a", null, "", "На Кинопоиске", { href: "http://www.kinopoisk.ru/film/" + data_item.kinopoiskId + "/", target: "_blank" }));
                      links_count++;
                    }
                    if (data_item.tvrageId) {
                      if (links_count > 0) { data_block_links.appendChild(platform.dom.create("br")); }
                      data_block_links.appendChild(platform.dom.create("a", null, "", "На TVRage.com", { href: "http://www.tvrage.com/shows/id-" + data_item.tvrageId + "", target: "_blank" }));
                      links_count++;
                    }
                    data_block.appendChild(data_block_links);
                    info_block_data.appendChild(data_block);
                  }
                  else {
                    info_block_data.innerHTML = "";
                    info_block_data.appendChild(platform.dom.create("span", null, "", "Подходящих результатов нет :("));
                  }
                };

              info_button.onclick = function(){
                if (info_block.style.display == "block") {
                  info_block.style.display = "none";
                } else {
                  info_block.style.display = "block";
                  if (info_block_data.textContent.trim() == "") {
                    request_info();
                  }
                }
              };
            })(item);
          }
        }
      },

      createTurboSearchCopywrong: function(){
        var turbosearch_copywrong = platform.dom.create("div", null, "turbosearch_copywrong");
        turbosearch_copywrong.appendChild(platform.dom.text("powered by "));
        turbosearch_copywrong.appendChild(platform.dom.create("a", null, "", "Турбопоиск", { href: "http://tfsearch.ru", target: "_blank" }));
        return turbosearch_copywrong;
      },
      createTurboSearchBar: (function(){
        return function(){
          var
            turbosearch_container = platform.dom.create("div", null, "turbosearch"),
            turbosearch_bar = platform.dom.create("div", null, "turbosearch_bar"),
            turbosearch_results = platform.dom.create("div", null, "turbosearch_results"),

            turbosearch_results_blocks = platform.dom.create("div", null, "turbosearch_results_blocks"),
            turbosearch_copywrong = _shared._f.createTurboSearchCopywrong();

          turbosearch_results.appendChild(turbosearch_results_blocks);
          turbosearch_results.appendChild(turbosearch_copywrong);

          var turbosearch_tag = platform.dom.create("div", null, "turbosearch_bar_tag");
          turbosearch_tag.onclick = function(){
            if (turbosearch_container.classList.contains("turbosearch_active")) {
              turbosearch_container.classList.remove("turbosearch_active");
            }
            else {
              turbosearch_container.classList.add("turbosearch_active");
            }
          };

          var turbosearch_input = platform.dom.create("input", null, "turbosearch_bar_input", null, { type: "text" });
          turbosearch_input.onkeyup = function(e){
            if (e.keyCode == 13) {
              var string = this.value.trim();
              if (string.length > 0) {
                turbosearch_input.disabled = true;

                turbosearch_results.classList.remove("turbosearch_results_has");
                turbosearch_results_blocks.innerHTML = "";

                platform.messaging.send({ action: "turbosearch", func: "search", query: string }, null, function(response){
                  turbosearch_input.disabled = false;

                  if (response.result != "error") {
                    var turbosearch_results_status = platform.dom.create("div", null, "turbosearch_results_status");
                    if (response.matches.total > 0) {
                      turbosearch_results_status.innerHTML = "Всего найдено <b>" + response.matches.total + "</b> " + platform.env.getPlural( response.matches.total, [ "совпадение", "совпадения", "совпадений" ] );
                      turbosearch_results_blocks.appendChild(turbosearch_results_status);

                      var turbosearch_results_list = platform.dom.create("ol");
                      for (var i = 0; i < response.matches.data.length; i++) {
                        var
                          match_block = platform.dom.create("li", null, "turbosearch_results_match"),
                          match_text = platform.dom.create("a", null, "", "", { href: response.matches.data[i].link, target: "_blank" });
                        match_text.innerHTML = response.matches.data[i].text;
                        match_block.appendChild(match_text);
                        turbosearch_results_list.appendChild(match_block);
                      }
                      turbosearch_results_blocks.appendChild(turbosearch_results_list);
                    }
                    else {
                      turbosearch_results_status.innerHTML = "Совпадений <b>нет</b>";
                      turbosearch_results_blocks.appendChild(turbosearch_results_status);
                    }
                    turbosearch_results.classList.add("turbosearch_results_has");
                  }
                });
              } else {
                turbosearch_results.classList.remove("turbosearch_results_has");
                turbosearch_results_blocks.innerHTML = "";
              }
            }
          };

          turbosearch_bar.appendChild(turbosearch_tag);
          turbosearch_bar.appendChild(turbosearch_input);

          turbosearch_container.appendChild(turbosearch_bar);
          turbosearch_container.appendChild(turbosearch_results);

          platform.dom.findFirst(".head-line").appendChild(turbosearch_container);
        }
      })(),

      enhanceSpecialPages: function(){
        var pid = platform.dom.findFirst('#pid').value;
        switch (pid) {
          default: break;

          case '22390':
            _shared._f.createSeriesRating();
            break;
        }
      },
      createSeriesRating: (function(){
        var
          series = {},
          max_requests = 0,
          max_votes = 0,
          order_field = "requests",
          order_way = "desc";

        var
          poststats,
          turbosearch_copywrong;

        var
          getRanks = function(){
            platform.service.request("http://tfsearch.ru/top/requested?json", {
              method : "post",
              dataType : "json",
              success : function(xhr, data){
                var series_list = data.page.content.request_ranks.list;

                var j = 0;
                for (var i = 0; i < series_list.length; i++) {
                  if (j >= 20) {
                    break;
                  }

                  var
                    series_item = series_list[i],
                    hash = platform.hash.md5(series_item.name);

                  if (series_item.added != 1) {
                    series[hash] = { name: series_item.name, requests: series_item.votes, votes: series_item.commvotes.toFixed(2) };

                    if (max_requests < series_item.votes) {
                      max_requests = series_item.votes;
                    }
                    if (max_votes < series_item.commvotes.toFixed(2)) {
                      max_votes = series_item.commvotes.toFixed(2);
                    }
                    j++;
                  }
                }
                printRanks();
              },
              error : function(xhr, data) {
                poststats.childNodes[0].textContent = "Не удалось загрузить рейтинг :(";
              }
            });
          },
          orderRanks = function(field, way){
            var sorted = [];
            order_field = field || "name";
            order_way = way || "asc";

            for (var h in series) {
              sorted.push(series[h]);
            }
            sorted.sort(orderFunction);
            return sorted;
          },
          orderFunction = function(a, b) {
            var result = 0;
            switch (order_field) {
              default:
              case "name":
                if (a.name.toLowerCase() < b.name.toLowerCase()) {
                  result = -1;
                }
                else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                  result = 1;
                }
                break;

              case "requests":
                if (parseInt(a.requests) < parseInt(b.requests)) {
                  result = -1;
                }
                else if (parseInt(a.requests) > parseInt(b.requests)) {
                  result = 1;
                }
                else {
                  if (a.name.toLowerCase() < b.name.toLowerCase()) {
                    result = -2;
                  }
                  else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                    result = 2;
                  }
                }
                break;

              case "votes":
                if (parseFloat(a.votes) < parseFloat(b.votes)) {
                  result = -1;
                }
                else if (parseFloat(a.votes) > parseFloat(b.votes)) {
                  result = 1;
                }
                else {
                  if (a.name.toLowerCase() < b.name.toLowerCase()) {
                    result = -2;
                  }
                  else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                    result = 2;
                  }
                }
                break;
            }

            if (Math.abs(result) > 1) {
              return result;
            } else {
              return (order_way == "asc" ? result : result * -1);
            }
          },
          printRanks = function(){
            var poststats_block = platform.dom.create("div", null, "poststats_block");
            var poststats_table = platform.dom.create("table", null, "poststats_table");

            var
              poststats_table_head = platform.dom.create("thead"),
              poststats_table_head_row = platform.dom.create("tr");

            var poststats_table_head_row_t1 = platform.dom.create("th");
            var poststats_order_switch_t1 = platform.dom.create("span", null, "poststats_order_switch", "Название", { "data-orderfield": "name", "data-orderway": "asc" });
            poststats_table_head_row_t1.appendChild(poststats_order_switch_t1);
            poststats_table_head_row.appendChild(poststats_table_head_row_t1);

            var poststats_table_head_row_t2 = platform.dom.create("th", null, "poststats_table_head_rating");
            poststats_table_head_row.appendChild(poststats_table_head_row_t2);

            var poststats_table_head_row_t3 = platform.dom.create("th", null, "poststats_table_head_balls");
            var poststats_order_switch_t3 = platform.dom.create("span", null, "poststats_order_switch", "З", { "title": "Запросы", "data-orderfield": "requests", "data-orderway": "desc" });
            poststats_table_head_row_t3.appendChild(poststats_order_switch_t3);
            poststats_table_head_row.appendChild(poststats_table_head_row_t3);

            var poststats_table_head_row_t4 = platform.dom.create("th", null, "poststats_table_head_balls");
            var poststats_order_switch_t4 = platform.dom.create("span", null, "poststats_order_switch", "Б", { "title": "Баллы", "data-orderfield": "votes", "data-orderway": "desc" });
            poststats_table_head_row_t4.appendChild(poststats_order_switch_t4);
            poststats_table_head_row.appendChild(poststats_table_head_row_t4);

            poststats_table_head.appendChild(poststats_table_head_row);

            var poststats_table_body = platform.dom.create("tbody");
            printFunction(poststats_table_body);

            poststats_table.appendChild(poststats_table_head);
            poststats_table.appendChild(poststats_table_body);
            poststats_block.appendChild(poststats_table);

            var order_switch = function(){
              var
                field = this.dataset["orderfield"],
                way = this.dataset["orderway"];

              if (order_field == field && order_way == way) {
                if (way == 'asc') {
                  way = 'desc';
                } else {
                  way = 'asc';
                }
              }
              order_field = field;
              order_way = way;

              printFunction(poststats_table_body);
            };
            poststats_order_switch_t1.onclick = order_switch;
            poststats_order_switch_t3.onclick = order_switch;
            poststats_order_switch_t4.onclick = order_switch;

            poststats.replaceChild(poststats_block, poststats.childNodes[0]);
          },
          printFunction = function(body){
            body.innerHTML = "";

            var maxwidth = 130;
            var ordered_series = orderRanks(order_field, order_way);

            for (var i = 0; i < ordered_series.length; i++) {
              var
                series_item = ordered_series[i],
                ratio = series_item.requests / max_requests;

              if (typeof series_item.row == "undefined") {
                var row = platform.dom.create("tr", null, "poststats_row");
                var
                  row_td1 = platform.dom.create("td"),
                  row_td2 = platform.dom.create("td"),
                  row_td3 = platform.dom.create("td"),
                  row_td4 = platform.dom.create("td");

                row_td1.appendChild(platform.dom.create("span", null, "", series_item.name));
                row.appendChild(row_td1);

                var
                  row_percentage = platform.dom.create("div", null, "poststats_percentage", "", { "title": (ratio * 100).toFixed(1) + "%", "data-width": (ratio * maxwidth) }),
                  row_percentage_back = platform.dom.create("div", null, "poststats_percentage_back");

                row_percentage.style.width = (ratio * maxwidth) + "px";
                row_percentage_back.style.width = maxwidth + "px";
                row_percentage_back.appendChild(row_percentage);
                row_td2.appendChild(row_percentage_back);
                row.appendChild(row_td2);

                row_td3.appendChild(platform.dom.create("span", null, "", series_item.requests));
                row.appendChild(row_td3);
                row_td4.appendChild(platform.dom.create("span", null, "", "(" + series_item.votes + ")"));
                row.appendChild(row_td4);

                series_item.row = row;
              }
              body.appendChild(series_item.row);
            }
          };

        return function(){
          var posttext = platform.dom.findFirst("#posttext");

          turbosearch_copywrong = _shared._f.createTurboSearchCopywrong();
          poststats = platform.dom.create("div", "poststats", "", "Загрузка...");
          poststats.appendChild(turbosearch_copywrong);
          posttext.insertBefore(poststats, posttext.childNodes[0]);

          getRanks();
        };
      })(),

      handleSubtitlesInComments: function(){
        var
          subtitles_action = platform.dom.findFirst("#funcf-subtitles"),
          subtitles_url = platform.dom.findFirst(".subtitles_url");
        var subtitle_comments = platform.dom.find(".watch_subtitles_from_comments");
        for (var i = 0; i < subtitle_comments.length; i++) {
          var item = subtitle_comments.item(i);
          item.title = "Нажми, чтобы перейти к загрузке этих субтитров";
          item.onclick = function(){
            subtitles_url.value = this.href;
            subtitles_action.onclick();
            return false;
          };
        }
      },
      enhanceWatch: (function(){
        var base64 = (function() {
          var BASE64_CHARS="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
          var
            smart_replace = function(str,f) {
              var
                b = ["2","I","0","=","3","Q","8","V","7","X","G","M","R","U","H","4","1","Z","5","D","N","6","L","9","B","W"],
                c = ["x","u","Y","o","k","n","g","r","m","T","w","f","d","c","e","s","i","l","y","t","p","b","z","a","J","v"];
              for (var i = 0; i < c.length; i++) { str = substitude(c[i],b[i],str); }
              return str
            },
            substitude = function(e,d,c) { var b=new RegExp(e,"g"), a=new RegExp(d,"g"); c=c.replace(b,"___"); c=c.replace(a,e); c=c.replace(/___/g,d); return c },
            toByteArray = function(str) {
              var b = [], e = [], d = [];
              for (var f=0;f<str.length;f+=4) {
                for (var c=0;c<4&&f+c<str.length;c++) {
                  e[c]=BASE64_CHARS.indexOf(str.charAt(f+c))
                }

                d[0]=(e[0]<<2)|(e[1]>>4);
                d[1]=((e[1]&15)<<4)|(e[2]>>2);
                d[2]=((e[2]&3)<<6)|e[3];
                for(var a=0;a<d.length;a++) {
                  if(e[a+1]==64) { break }
                  b[b.length]=String.fromCharCode(d[a])
                }
              }
              return b.join("")
            },
            fromByteArray = function(input) {
              var output = "";
              var chr1, chr2, chr3 = "";
              var enc1, enc2, enc3, enc4 = "";
              var i = 0;

              do {
                chr1 = input.charCodeAt(i++); chr2 = input.charCodeAt(i++); chr3 = input.charCodeAt(i++);

                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;

                if (isNaN(chr2)) {
                  enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                  enc4 = 64;
                }

                output = output + BASE64_CHARS.charAt(enc1) + BASE64_CHARS.charAt(enc2) + BASE64_CHARS.charAt(enc3) + BASE64_CHARS.charAt(enc4);
                chr1 = chr2 = chr3 = "";
                enc1 = enc2 = enc3 = enc4 = "";
              } while (i < input.length);
              return output;
            };

          return {
            decode: function(str) {
              return toByteArray(smart_replace(str,"d"))
            },
            encode: function(str) {
              return smart_replace(fromByteArray(str),"e");
            }
          };
        })();

        var content, videoblock, overvideo, promobox, metadata, xml;
        var players = { html: null, flash: null };
        var more_actions = [];
        var
          parseEpisode = function(){
            var metadata = { series_code: "", number: {}, id: {}, watched: {}, player: { hash: "", global: "" }, title: {}, description: "" };
            var link = window.location.pathname;

            metadata.series_code = link.substr(0, link.indexOf("/Season")).replace("/Watch/", "");
            metadata.number.episode = parseInt(link.substr(link.indexOf("/Episode") + 8).replace("/Watch/", ""), 10);
            metadata.number.series = parseInt(link.substr(link.indexOf("/Season") + 7, link.indexOf("/Episode")).replace("/Watch/", ""), 10);
            metadata.id.episode = parseInt(platform.dom.findFirst("#eid", content).value, 10);
            metadata.id.comments = parseInt(platform.dom.findFirst("#pid", content).value, 10);
            metadata.id.series = parseInt(platform.dom.findFirst("#sid", content).value, 10);
            metadata.watched.episode = (platform.dom.findFirst("#epwatch", content).value == 1);
            metadata.watched.series = (platform.dom.findFirst("#sewatch", content).value == 1);
            metadata.player.global = platform.dom.findFirst("#metadata", content).value;
            metadata.player.hash = platform.dom.findFirst("#hash", content).value;
            metadata.title.en = platform.dom.findFirst(".comwatchinputlinec", content).textContent;
            metadata.title.ru = platform.dom.findFirst("#runame", content).value;
            metadata.description = platform.dom.findFirst("#desctext", content).value;
            metadata.out = platform.dom.findFirst(".maine", content).title.replace("Дата выхода: ", "");
            return metadata;
          },
          checkBalance = function(){
            return !platform.dom.findFirst("#playerupdate");
          },
          parsePlayerData = function(){
            if (metadata.player.global != "") {
              var
                predata = metadata.player.global.replace(/%2b/gi, "+").replace(/%3d/gi, "="),
                xmlstring = base64.decode(predata);
              xml = (new DOMParser()).parseFromString(xmlstring, "text/xml");
            }
          },
          replaceSubtitlesData = function(link, language){
            if (typeof link != "undefined" && typeof language != "undefined") {
              var
                xml_subtitles = xml.getElementsByTagName("subtitles").item(0),
                xml_subtitles_lang = xml_subtitles.getElementsByTagName(language).item(0),
                xml_subtitle_sources = xml_subtitles.getElementsByTagName("sources").item(0),
                xml_subtitle_sources_lang = xml_subtitle_sources.getElementsByTagName(language);

              xml_subtitles_lang.firstChild.nodeValue = "1";
              if (xml_subtitle_sources_lang.length) {
                xml_subtitle_sources_lang.item(0).firstChild.nodeValue = link;
              } else {
                var source = xml.createElement(language);
                source.appendChild(xml.createTextNode(link));
                xml_subtitle_sources.appendChild(source);
              }
            }
          },
          compilePlayerData = function(){
            var
              xmlstring = (new XMLSerializer).serializeToString(xml),
              postdata = encodeURIComponent(base64.encode(xmlstring));

            platform.dom.findFirst("#metadata", content).value = postdata;
            platform.dom.findFirst("param[name='flashvars']", content).value = "global=" + postdata + "&hash=" + metadata.player.hash;
            platform.dom.findFirst("embed", content).setAttribute("flashvars", "global=" + postdata + "&hash=" + metadata.player.hash);

            players.flash.innerHTML = "" + players.flash.innerHTML;

            var script_text = "" +
              "var a = base64_decode(unescape($(\"#metadata\").val()));" +
              "try{a=(new DOMParser()).parseFromString(a,\"text/xml\")}catch(b){return}" +
              "metadata.subtitles=new Object();"+
              "metadata.subtitles.en=a.getElementsByTagName(\"subtitles\")[0].getElementsByTagName(\"en\")[0].firstChild.nodeValue;"+
              "metadata.subtitles.ru=a.getElementsByTagName(\"subtitles\")[0].getElementsByTagName(\"ru\")[0].firstChild.nodeValue;"+
              "metadata.subtitles.sources=new Object();"+
              "if (a.getElementsByTagName(\"subtitles\")[0].getElementsByTagName(\"sources\")[0].getElementsByTagName(\"en\").length){metadata.subtitles.sources.en=a.getElementsByTagName(\"subtitles\")[0].getElementsByTagName(\"sources\")[0].getElementsByTagName(\"en\")[0].firstChild.nodeValue}"+
              "if (a.getElementsByTagName(\"subtitles\")[0].getElementsByTagName(\"sources\")[0].getElementsByTagName(\"ru\").length){metadata.subtitles.sources.ru=a.getElementsByTagName(\"subtitles\")[0].getElementsByTagName(\"sources\")[0].getElementsByTagName(\"ru\")[0].firstChild.nodeValue}"+
              "initSubtitles();";

            var script = platform.dom.create("script");
            script.textContent = script_text;
            document.body.appendChild(script);
            script.parentNode.removeChild(script);
          },
          createOvervideoBox = function(id, text, width, height, keystroke, override_id, onopened){
            var box = platform.dom.create("div", null, "overvideo_block_box");
            box.style.width = width;
            box.style.height = height;
            overvideo.appendChild(box);

            var box_collapser = platform.dom.create("div", null, "overvideo_block_box_collapser", "", { title: "Свернуть" });
            box_collapser.onclick = function(){
              box.classList.remove("overvideo_block_box_active");
              platform.dom.findFirst(".overvideo_block_switch_active").classList.remove("overvideo_block_switch_active");
            };
            box.appendChild(box_collapser);

            if (typeof onopened != "function") {
              onopened = function(){};
            }

            var action = function(){
              if (box.classList.contains("overvideo_block_box_active")) {
                box.classList.remove("overvideo_block_box_active");
                this.classList.remove("overvideo_block_switch_active");
              }
              else {
                var active_ovbox = platform.dom.findFirst(".overvideo_block_box_active");
                if (active_ovbox) {
                  active_ovbox.classList.remove("overvideo_block_box_active");
                }
                var active_switch = platform.dom.findFirst(".overvideo_block_switch_active");
                if (active_switch) {
                  active_switch.classList.remove("overvideo_block_switch_active");
                }
                box.classList.add("overvideo_block_box_active");
                this.classList.add("overvideo_block_switch_active");
                onopened();
              }
            };

            if (!override_id) {
              more_actions.push({ id: id, text: text, title: "", action: action, keystroke: keystroke });
            } else {
              var override = platform.dom.findFirst("[href='#" + override_id + "']");
              if (override) {
                override.removeAttribute("href");
                override.onclick = action;
                if (keystroke) {
                  platform.keystroke.track(keystroke, function(){ override.onclick(); });
                }
              }
            }
            return box;
          },
          generateDownloads = function(){
            var
              ias_id = platform.env.getCookieFast("IAS_ID"),
              links = [];
            var add = function(src, lang, size, hq, time, name) {
              if (src && lang && size) {
                if (typeof time == "undefined") { time = 0; }
                if (typeof name == "undefined") { name = 'Ссылка №' + (links.length + 1) + ', ' + lang; }
                var a = platform.hash.sha1(ias_id + Math.random().toString());
                var b = platform.hash.sha1(a + "" + metadata.id.episode + "A2DC51DE0F8BC1E9");
                var download_url = "https://cdn.turbik.tv/" + platform.hash.sha1(lang) + "/" + metadata.id.episode + "/" + src + "/" + time + "/" + ias_id + "/" + a + "/" + b + "";
                var download_name = metadata.series_code + "." + "S" + (metadata.number.series.toString().length < 2 ? "0" : "") + metadata.number.series + "E" + (metadata.number.episode.toString().length < 2 ? "0" : "") + metadata.number.episode + (hq ? ".720p" : "") + ".WebRip.TurbofilmTV";

                links.push({ source: src, time: time, lang: lang, size: size, name: name, link: { url: download_url, name: download_name } });
              }
            };

            var xml_langs = xml.getElementsByTagName("langs").item(0);
            var langs = {};
            if (xml_langs.getElementsByTagName("en").length) { langs['en'] = xml_langs.getElementsByTagName("en").item(0).firstChild.nodeValue; }
            if (xml_langs.getElementsByTagName("ru").length) { langs['ru'] = xml_langs.getElementsByTagName("ru").item(0).firstChild.nodeValue; }

            var xml_sizes = xml.getElementsByTagName("sizes").item(0);
            var sizes = {};
            if (xml_sizes.getElementsByTagName("default").length) { sizes['default'] = xml_sizes.getElementsByTagName("default").item(0).firstChild.nodeValue; }
            if (xml_sizes.getElementsByTagName("hq").length)      { sizes['hq'] = xml_sizes.getElementsByTagName("hq").item(0).firstChild.nodeValue; }

            var xml_sources = xml.getElementsByTagName("sources2").item(0);
            var sources = {};
            if (xml_sources.getElementsByTagName("default").length) { sources['default'] = xml_sources.getElementsByTagName("default").item(0).firstChild.nodeValue; }
            if (xml_sources.getElementsByTagName("hq").length)      { sources['hq'] = xml_sources.getElementsByTagName("hq").item(0).firstChild.nodeValue; }

            if (sizes.default > 0) {
              if (langs.en > 0) {
                add(sources.default, 'en', sizes.default, false, 0, 'Стандартное качество, английский');
              }
              if (langs.ru > 0) {
                add(sources.default, 'ru', sizes.default, false, 0, 'Стандартное качество, русский');
              }
            }

            if (sizes.hq > 0) {
              if (langs.en > 0) {
                add(sources.hq, 'en', sizes.hq, true, 0, 'Высокое качество, английский');
              }
              if (langs.ru > 0) {
                add(sources.hq, 'ru', sizes.hq, true, 0, 'Высокое качество, русский');
              }
            }
            return links;
          },
          createDownloadsOB = function(){
            var downloads_ovbox = createOvervideoBox("download", "Сохранить эпизод", "350px", "auto");
            if (checkBalance()) {
              downloads_ovbox.appendChild(platform.dom.create("span", null, "", "На выбор все доступные форматы, качества и языки:"));
              var downloads_table = platform.dom.create("table", null, "downloads_table");

              var downloads_links = generateDownloads();
              for (var i = 0; i < downloads_links.length; i++) {
                var download = downloads_links[i];
                var
                  tr = platform.dom.create("tr"),
                  tdl = platform.dom.create("td", null, "", "", { align: "left" }),
                  tdr = platform.dom.create("td", null, "", "", { align: "right" });
                tdl.appendChild(platform.dom.create("a", null, "", download.name, { href: download.link.url, download: download.link.name + ".mp4" }));
                tr.appendChild(tdl);
                tdr.appendChild(platform.dom.create("span", null, "", "(около " + (download.size / (1024*1024)).toFixed(2) + " Мб)"))
                tr.appendChild(tdr);
                downloads_table.appendChild(tr);
              }
              downloads_ovbox.appendChild(downloads_table);
            }
            else {
              downloads_ovbox.appendChild(platform.dom.create("span", null, "", "Ничего не работает, если не пополнить баланс :("));
            }
          },
          createSubtitlesOB = function(){
            var subtitles_ovbox = createOvervideoBox("subtitles", "Свои субтитры", "400px", "auto", "Shift+S");
            if (checkBalance()) {
              var subtitles_ways = platform.dom.create("div", null, "subtitles_ways");

              var subtitles_get = function(){
                platform.messaging.send({ action: "turbosearch", func: "get_subs" }, null, function(response){
                  subtitles_w3_content.innerHTML = "";
                  if (response.result != "error") {
                    if (response.files.length) {
                      for (var i in response.files) {
                        var
                          file = response.files[i],
                          file_block = platform.dom.create("div", null, "subtitles_ts_link"),
                          file_link = platform.dom.create("a", null, "", file.title);
                        file_link.onclick = (function(file){
                          return function(){
                            subtitles_url.value = "http://tfsearch.ru" + file.link;
                            return false;
                          }
                        })(file);
                        file_block.appendChild(file_link);
                        subtitles_w3_content.appendChild(file_block);
                      }
                    } else {
                      subtitles_w3_content.textContent = "Загруженных субтитров не найдено";
                    }
                  } else {
                    subtitles_w3_content.textContent = "Не удалось загрузить субтитры :(";
                  }
                });
              };

              var subtitles_w1 = platform.dom.create("div", null, "subtitles_way");
              subtitles_w1.appendChild(platform.dom.create("span", null, "subtitles_way_prefix", "Вариант 1. "));
              subtitles_w1.appendChild(platform.dom.create("span", null, "subtitles_way_title", "Укажите ссылку на файл с субтитрами в формате XML:"));
              var subtitles_w1_content = platform.dom.create("div", null, "subtitles_way_content");
              var subtitles_url = platform.dom.create("input", null, "subtitles_url", null, { type: "text" });
              subtitles_w1_content.appendChild(subtitles_url);
              subtitles_w1.appendChild(subtitles_w1_content);
              subtitles_ways.appendChild(subtitles_w1);

              var subtitles_w2 = platform.dom.create("div", null, "subtitles_way");
              subtitles_w2.appendChild(platform.dom.create("span", null, "subtitles_way_prefix", "Вариант 2. "));
              subtitles_w2.appendChild(platform.dom.create("span", null, "subtitles_way_title", "Загрузите субтитры в формате SRT:"));
              var subtitles_w2_content = platform.dom.create("div", null, "subtitles_way_content");
              if (platform.preferences.get("inj_global_turbosearch") && platform.preferences.get("inj_global_turbosearch_login") && platform.preferences.get("inj_global_turbosearch_password")) {
                var subtitles_uploader_link = platform.dom.create("span", null, "subtitles_uploader_link", "Открыть окно загрузчика");
                subtitles_uploader_link.onclick = function(){
                  platform.messaging.send({ action: "turbosearch", func: "upload_window" }, null, function(){ });
                };
                subtitles_w2_content.appendChild(subtitles_uploader_link);

                platform.messaging.on("subtitles", function(request, sender){
                  switch (request.func) {
                    default:
                      return { result: "error", error: "unknown action" };
                      break;

                    case "take_upload":
                      if (typeof request.link == "undefined" || request.link.trim() == "") {
                        return { result: "error", error: "missing parameters" };
                      }

                      subtitles_url.value = "http://tfsearch.ru" + request.link;
                      subtitles_get();
                      return { result: "success", success: true };
                      break;
                  }
                });
              } else {
                subtitles_w2_content.appendChild(platform.dom.create("span", null, "subtitles_way_turbosearch_only", "Доступно пользователям "));
                subtitles_w2_content.appendChild(platform.dom.create("a", null, "", "Турбопоиска", { href: "http://tfsearch.ru", target: "_blank" }));
              }
              subtitles_w2.appendChild(subtitles_w2_content);
              subtitles_ways.appendChild(subtitles_w2);

              var subtitles_w3 = platform.dom.create("div", null, "subtitles_way");
              subtitles_w3.appendChild(platform.dom.create("span", null, "subtitles_way_prefix", "Вариант 3. "));
              subtitles_w3.appendChild(platform.dom.create("span", null, "subtitles_way_title", "Выберите из ранее загруженных:"));
              var subtitles_w3_content = platform.dom.create("div", null, "subtitles_way_content subtitles_ts_links", "Загрузка...");
              if (platform.preferences.get("inj_global_turbosearch") && platform.preferences.get("inj_global_turbosearch_login") && platform.preferences.get("inj_global_turbosearch_password")) {
                subtitles_get();
              } else {
                subtitles_w3_content.appendChild(platform.dom.create("span", null, "subtitles_way_turbosearch_only", "Доступно пользователям "));
                subtitles_w3_content.appendChild(platform.dom.create("a", null, "", "Турбопоиска", { href: "http://tfsearch.ru", target: "_blank" }));
              }
              subtitles_w3.appendChild(subtitles_w3_content);
              subtitles_ways.appendChild(subtitles_w3);
              subtitles_ovbox.appendChild(subtitles_ways);

              var subtitles_langs = platform.dom.create("div", null, "subtitles_langs");
              subtitles_langs.appendChild(platform.dom.create("span", null, "", "Выберите язык субтитров:"));
              subtitles_langs.appendChild(platform.dom.create("input", "subtitles_lang_ru", "subtitles_lang_radio", null, { type: "radio", value: "ru", name: "subtitles_lang", checked: true }));
              subtitles_langs.appendChild(platform.dom.create("label", null, "subtitles_lang_label subtitles_lang_label_ru", null, { for: "subtitles_lang_ru" }));
              subtitles_langs.appendChild(platform.dom.create("input", "subtitles_lang_en", "subtitles_lang_radio", null, { type: "radio", value: "en", name: "subtitles_lang" }));
              subtitles_langs.appendChild(platform.dom.create("label", null, "subtitles_lang_label subtitles_lang_label_en", null, { for: "subtitles_lang_en" }));
              subtitles_ovbox.appendChild(subtitles_langs);

              var subtitles_apply_block = platform.dom.create("div", null, "subtitles_apply_block");
              var subtitles_apply = platform.dom.create("span", null, "subtitles_apply", "Применить");
              subtitles_apply.onclick = function(){
                var
                  link = subtitles_url.value,
                  language = platform.dom.findFirst(".subtitles_lang_radio:checked").value;

                if (link && language) {
                  platform.dom.findFirst("#funcf-subtitles").onclick();
                  replaceSubtitlesData(link, language);
                  compilePlayerData();
                } else {
                  _shared._f.setActionStatus("Необходимо указать ссылку на файл и выбрать язык", subtitles_apply);
                }
              };
              subtitles_apply_block.appendChild(subtitles_apply);
              subtitles_ovbox.appendChild(subtitles_apply_block);

              var script = platform.dom.create("script");
              script.textContent = "function subtitlesTimerHandler(){startSubtitlesTimer();if(!(0>=vd.duration)){var a=subtitles.firstChild.childNodes[currentSubtitlePosition];if(a){var c=a.childNodes[1],d=a.childNodes[3],e=a.childNodes[5],b=!0;3==a.childNodes.length&&(c=a.childNodes[0],d=a.childNodes[1],e=a.childNodes[2],b=!1);if(3==a.nodeType)currentSubtitlePosition++;else{parseFloat(c.firstChild.nodeValue)<=vd.currentTime&&prevSubtitlePosition!=currentSubtitlePosition&&($(\"#subBox\").html(e.firstChild.nodeValue),prevSubtitlePosition=currentSubtitlePosition);for(;parseFloat(d.firstChild.nodeValue)<vd.currentTime&&!($(\"#subBox\").html(\"\"),currentSubtitlePosition++,a=subtitles.firstChild.childNodes[currentSubtitlePosition],b&&3==a.nodeType||!b&&a););}}}};";
              document.body.appendChild(script);
              script.parentNode.removeChild(script);
            }
            else {
              subtitles_ovbox.appendChild(platform.dom.create("span", null, "", "Ничего не работает, если не пополнить баланс :("));
            }
          },
          enhanceSeriesMenu = function(){
            var
              main = platform.dom.findFirst(".main", content),
              func = platform.dom.findFirst(".func", content),
              funce = platform.dom.findFirst(".funce", func);

            createDownloadsOB();
            createSubtitlesOB();

            if (more_actions.length) {
              var funcf = platform.dom.create("span", null, "funcf");
              for (var i = 0; i < more_actions.length; i++) {
                var act = more_actions[i];
                var action_link = platform.dom.create("a", "funcf-" + act.id, "", act.text);
                action_link.onclick = act.action;
                funcf.appendChild(action_link);
                funcf.appendChild(platform.dom.text(" / "));
                if (act.keystroke) {
                  platform.keystroke.track(act.keystroke, function(){ action_link.onclick(); });
                }
              }
              func.appendChild(funcf);

              var more_button_back = platform.dom.create("a", null, "", "Назад");
              funcf.appendChild(more_button_back);
              more_button_back.onclick = function(){
                funcf.classList.remove("func_active");
                funce.style.display = "block";
                funce.classList.add("func_active");
              };
              funcf.appendChild(more_button_back);

              var more_button = platform.dom.create("a", null, "", "Ещё");
              funce.appendChild(platform.dom.text(" / "));
              funce.appendChild(more_button);
              more_button.onclick = function(){
                funce.style.display = "none";
                funce.classList.remove("func_active");
                funcf.classList.add("func_active");
              };
            }

            if (platform.preferences.get("inj_watch_enhanced_hide_description")) {
              var description_ovbox = createOvervideoBox("description", "Описание серии", "450px", "auto", null, "desc");
              description_ovbox.appendChild(platform.dom.create("p", null, "", (metadata.description ? metadata.description : "Описание временно отсутствует")));
              platform.dom.findFirst("#desc").style.display = "none";
              platform.dom.findFirst(".textdesc").style.display = "none";
            }

            if (platform.preferences.get("inj_watch_enhanced_hide_comments")) {
              var comments_ovbox = createOvervideoBox("comments", "Комментарии к серии серии", "979px", "auto", "Shift+C", "commarea", function(){ _shared._f.loadComments(); });
              comments_ovbox.appendChild(platform.dom.findFirst("#commarea"));
            }

            if (platform.preferences.get("inj_watch_enhanced_hide_description") && platform.preferences.get("inj_watch_enhanced_hide_comments")) {
              platform.dom.findFirst(".down", content).style.display = "none";
              platform.dom.findFirst(".bg", content).style.borderRadius = "16px 16px 16px 16px";
              platform.dom.findFirst(".promobox", content).style.borderRadius = "0 0 16px 16px";
            }
          },
          enhanceEplist = function(){
            var
              promobox = platform.dom.findFirst(".promobox", content),
              promoep = platform.dom.findFirst(".promoep", content);

            promobox.classList.add("promobox_enhanced");

            var promobox_action = platform.dom.create("div", null, "promobox_action", "Список эпизодов");
            promobox_action.onclick = function(){
              if (promoep.classList.contains("promoep_active")) {
                promoep.classList.remove("promoep_active");
                this.textContent = "Список эпизодов";
              } else {
                promoep.classList.add("promoep_active");
                this.textContent = "Скрыть список эпизодов";
              }
            };
            promobox.appendChild(promobox_action);
          },
          enhanceTopping = function(){
            var header = platform.dom.findFirst("#header");
            header.classList.add("enhanced_topping");
            content.classList.add("has_enhanced_topping");
            var footer = platform.dom.findFirst("#footer");
            footer.style.display = "none";
            platform.dom.findFirst("html").style.height = "100%";
            document.body.style.height = "100%";
            document.body.style.paddingBottom = "0";

            var bg = platform.dom.findFirst(".bg", header);

            var
              expander = platform.dom.create("div", null, "topping_expander"),
              expander_info = platform.dom.create("div", null, "topping_expander_info"),
              expander_controls = platform.dom.create("div", null, "topping_expander_controls"),
              expander_handler = platform.dom.create("div", null, "topping_expander_handler", "^ Потянуть здесь ^");

            expander_info.appendChild(platform.dom.create("span", null, "topping_expander_info_title", (metadata.title.en.length > 21 ? metadata.title.en.substr(0, 21) + "..." : metadata.title.en), { title: metadata.title.en }));
            expander_info.appendChild(platform.dom.text(" / "));
            expander_info.appendChild(platform.dom.create("span", null, "topping_expander_info_title", (metadata.title.ru.length > 21 ? metadata.title.ru.substr(0, 21) + "..." : metadata.title.ru), { title: metadata.title.ru }));
            expander_info.appendChild(platform.dom.text(" "));
            expander_info.appendChild(platform.dom.create("span", null, "topping_expander_info_code", "(S" + (metadata.number.series.toString().length < 2 ? "0" : "" ) + metadata.number.series + "E" + (metadata.number.episode.toString().length < 2 ? "0" : "" ) + metadata.number.episode + ")", { title: "Дата выхода: " + metadata.out }));

            expander_handler.onclick = function(){
              if (header.classList.contains("enhanced_topping_opened")) {
                header.classList.remove("enhanced_topping_opened");
                header.classList.add("enhanced_topping_closed");
                expander_handler.textContent = "^ Потянуть здесь ^";
              } else {
                header.classList.remove("enhanced_topping_closed");
                header.classList.add("enhanced_topping_opened");
                expander_handler.textContent = "Упаковать обратно";
              }
            };
            expander.appendChild(expander_info);
            expander.appendChild(expander_handler);
            expander.appendChild(expander_controls);
            bg.appendChild(expander);
          },
          createSidebuttons = function(){
            var
              episodes = platform.dom.find(".epbox"),
              episode_current = platform.dom.findFirst(".oepcimg").parentNode;

            var current_index;
            for (current_index = 0; current_index < episodes.length; current_index++) {
              if (episodes.item(current_index).isEqualNode(episode_current)) {
                break;
              }
            }

            var parse_link = function(epbox) {
              var a = { url: "", code: "", name: "" };

              a.url = epbox.children[0].href;
              a.name = platform.dom.findFirst(".en", epbox).textContent + " / " + platform.dom.findFirst(".ru", epbox).textContent;

              var
                season_num = platform.dom.findFirst(".os", epbox).textContent.replace("Сезон: ", ""),
                episode_num = platform.dom.findFirst(".oe", epbox).textContent.replace("Эпизод: ", "");
              a.code = "S" + (season_num.length < 2 ? "0" : "") + season_num + "E" + (episode_num.length < 2 ? "0" : "") + episode_num;

              return a;
            };

            var links = {
              prev: (typeof episodes[current_index-1] != "undefined" ? parse_link(episodes[current_index-1]) : null),
              next: (typeof episodes[current_index+1] != "undefined" ? parse_link(episodes[current_index+1]) : null)
            };

            var top_offset = (window.innerHeight / 2);
            var arrow_left;
            if (links.prev) {
              arrow_left = platform.dom.create("a", null, "watch_sidebutton watch_sidebutton_prev", "", { href: links.prev.url, title: "(" + links.prev.code + ") " + links.prev.name });
              arrow_left.style.top = top_offset + "px";
              document.body.appendChild(arrow_left);

              platform.keystroke.trackCode(37, function(){
                window.location.href = links.prev.url;
              }, true);
              platform.keystroke.trackCode(177, function(){
                window.location.href = links.prev.url;
              });
            }
            var arrow_right;
            if (links.next) {
              arrow_right = platform.dom.create("a", null, "watch_sidebutton watch_sidebutton_next", "", { href: links.next.url, title: "(" + links.next.code + ") " + links.next.name });
              arrow_right.style.top = top_offset + "px";
              document.body.appendChild(arrow_right);

              platform.keystroke.trackCode(39, function(){
                window.location.href = links.next.url;
              }, true);
              platform.keystroke.trackCode(176, function(){
                window.location.href = links.next.url;
              });
            }

            platform.events.on("resize", function(){
              top_offset = (window.innerHeight / 2);
              if (arrow_left) { arrow_left.style.top = top_offset + "px"; }
              if (arrow_right) { arrow_right.style.top = top_offset + "px"; }
            });
          },
          enhancePlayer = function(){
            if (checkBalance()) {
              var toggle_bigscreen = platform.dom.create("div", null, "watch_bigscreen_toggle", "", { title: "Развернуть плеер" });

              var topping_expander, topping_expander_controls, func, funce, funcf;
              if (platform.preferences.get("inj_watch_enhanced_topping")) {
                topping_expander = platform.dom.findFirst(".topping_expander");
                topping_expander_controls = platform.dom.findFirst(".topping_expander_controls", topping_expander);
                func = platform.dom.findFirst(".func");
                funce = platform.dom.findFirst(".funce", func);
                funcf = platform.dom.findFirst(".funcf", func);
              }

              var toggle_bigscreen_function = function(){
                if (videoblock.classList.contains("watch_bigscreen")) {
                  videoblock.classList.remove("watch_bigscreen");
                  toggle_bigscreen.classList.remove("watch_bigscreen_active");
                  toggle_bigscreen.title = "Развернуть плеер";
                  if (!(platform.preferences.get("inj_watch_enhanced_hide_description") && platform.preferences.get("inj_watch_enhanced_hide_comments"))) {
                    platform.dom.findFirst(".down", content).style.display = "block";
                  }
                  if (!platform.preferences.get("inj_watch_enhanced_topping")) {
                    platform.dom.findFirst("#header").style.display = "block";
                    platform.dom.findFirst("#footer").style.display = "block";
                  } else {
                    topping_expander.classList.remove("topping_show_info");
                    func.appendChild(funce);
                    func.appendChild(funcf);
                  }
                  localStorage["TCM_BigScreen"] = 0;
                } else {
                  videoblock.classList.add("watch_bigscreen");
                  toggle_bigscreen.classList.add("watch_bigscreen_active");
                  toggle_bigscreen.title = "Свернуть плеер";
                  platform.dom.findFirst(".down", content).style.display = "none";
                  if (!platform.preferences.get("inj_watch_enhanced_topping")) {
                    platform.dom.findFirst("#header").style.display = "none";
                    platform.dom.findFirst("#footer").style.display = "none";
                  } else {
                    topping_expander.classList.add("topping_show_info");
                    topping_expander_controls.appendChild(funce);
                    topping_expander_controls.appendChild(funcf);
                  }
                  localStorage["TCM_BigScreen"] = 1;
                }
                resizePlayer();
              };
              toggle_bigscreen.onclick = toggle_bigscreen_function;
              platform.keystroke.track("Shift+B", toggle_bigscreen_function);
              document.body.appendChild(toggle_bigscreen);

              if (typeof localStorage["TCM_BigScreen"] != "undefined" && localStorage["TCM_BigScreen"] == 1) {
                toggle_bigscreen_function();
              }

              resizePlayer();
              platform.events.on("resize", function(){
                resizePlayer();
              });
            }
          },
          resizePlayer = function(){
            var
              viewport = {
                height: window.innerHeight,
                width: window.innerWidth
              };

            var
              min_dim = { height: 570, width: 980 },
              global_dim = { height: min_dim.height, width: min_dim.width },
              ratio = min_dim.width / min_dim.height;

            var
              requested_width = viewport.width - 120,
              requested_height = viewport.height - 4;

            if (!videoblock.classList.contains("watch_bigscreen")) {
              if (platform.preferences.get("inj_watch_enhanced_topping")) {
                requested_height -= 110 + 10;
              } else {
                requested_height -= 160 + 96 + 30
              }
              if (platform.preferences.get("inj_watch_enhanced_hide_eplist")) {
                requested_height -= 40;
              } else {
                requested_height -= 145;
              }
              if (!(platform.preferences.get("inj_watch_enhanced_hide_description") && platform.preferences.get("inj_watch_enhanced_hide_comments"))) {
                requested_height -= 10;
              }
            } else {
              requested_width = viewport.width - 10;
              requested_height = viewport.height - 4 - 16;
              if (platform.preferences.get("inj_watch_enhanced_topping")) {
                requested_height -= 20;
              }
              if (platform.preferences.get("inj_watch_enhanced_sidebuttons")) {
                requested_width -= 110;
              }
            }

            if (requested_width <= min_dim.width || requested_height <= min_dim.height) {
              global_dim.width = min_dim.width;
              global_dim.height = min_dim.height;
            } else {
              global_dim.width = requested_width;
              global_dim.height = global_dim.width / ratio;

              if (global_dim.height > requested_height) {
                global_dim.height = requested_height;
                global_dim.width = global_dim.height * ratio;
              }
            }

            videoblock.style.height = global_dim.height + "px";
            videoblock.style.width = global_dim.width + "px";
            videoblock.style.marginLeft = "-" + ((global_dim.width - min_dim.width) / 2 + 1) + "px";

            var flash_obj = platform.dom.findFirst("object", players.flash);
            flash_obj.setAttribute("height", global_dim.height.toString());
            flash_obj.setAttribute("width", global_dim.width.toString());
            var flash_emb = platform.dom.findFirst("embed", players.flash);
            flash_emb.setAttribute("height", global_dim.height.toString());
            flash_emb.setAttribute("width", global_dim.width.toString());

            var html_dim = { height: global_dim.height - 45, width: global_dim.width };
            players.html.classList.remove("modeambi");
            players.html.classList.add("modewide");
            var html_videobox = platform.dom.findFirst("#videoBox", players.html);
            html_videobox.style.height = html_dim.height + "px";
            html_videobox.style.width = html_dim.width + "px";
            var html_subbox = platform.dom.findFirst("#subBox", players.html);
            html_subbox.style.left = ((html_dim.width - 740)/2) + "px";
          };

        return function(){
          content = platform.dom.findFirst("#content");
          content.classList.add("enhanced_watch");

          videoblock = platform.dom.findFirst(".vdfixbox", content);
          promobox = platform.dom.findFirst(".promobox", content);

          players.html = platform.dom.findFirst("#view", videoblock);
          players.flash = platform.dom.findFirst("#player", videoblock);
          metadata = parseEpisode();
          if (checkBalance()) {
            parsePlayerData();
          }

          overvideo = platform.dom.create("div", null, "overvideo_block");
          videoblock.appendChild(overvideo);

          enhanceSeriesMenu();
          if (platform.preferences.get("inj_watch_enhanced_hide_eplist")) {
            enhanceEplist();
          }
          if (platform.preferences.get("inj_watch_enhanced_topping")) {
            enhanceTopping();
          }
          if (platform.preferences.get("inj_watch_enhanced_sidebuttons")) {
            createSidebuttons();
          }
          if (platform.preferences.get("inj_watch_enhanced_resize")) {
            enhancePlayer();
          }
        }
      })()
    };

    var _init = {
      global: function(){
        if (platform.preferences.get("inj_global_inviteless")) {
          var invcount = platform.dom.findFirst(".invcount");
          if (invcount) {
            invcount.style.display = "none";
          }
        }

        if (platform.preferences.get("inj_global_turbosearch") && platform.preferences.get("inj_global_turbosearch_login") && platform.preferences.get("inj_global_turbosearch_password")) {
          if (platform.dom.findFirst("#header")) {
            _shared._f.createTurboSearchBar();
          }
        }
      },

      index: function(){
        if (platform.preferences.get("inj_watch_playlists")) {
          _shared._f.createPlaylistControl();
        }

        if (platform.preferences.get("inj_index_hideUnfavorable")) {
          _shared._f.getFavoriteSeries();

          var calendar_items = platform.dom.find('.firstcalendarbox');

          for (var j = 0; j < calendar_items.length; j++) {
            var calendar_item = calendar_items.item(j);
            var h = calendar_item.children.item(1).href;
            if (typeof _shared.series.favorite[h] === "undefined") {
              calendar_item.classList.add("index_calendar_common");
            }
          }
        }
      },

      myseries: function(){
        if (platform.preferences.get("inj_watch_playlists")) {
          _shared._f.createPlaylistControl();
        }

        if (platform.preferences.get("inj_myseries_futureReleases")) {
          _shared._f.getFavoriteSeries();
          _shared._f.createFutureReleases();
        }
      },

      series: function(){
        if (platform.preferences.get("inj_watch_playlists")) {
          _shared._f.createPlaylistControl();
        }
      },

      allseries: function(){
        if (platform.preferences.get("inj_allseries_info")) {
          _shared._f.createSeriesInfo();
        }
      },

      blogpage: function(){
        if (platform.preferences.get("inj_blog_enhanced")) {
          var com_blocks = platform.dom.find('.blogpostcom');
          for (var i = 0; i < com_blocks.length; i++) {
            var com_block = com_blocks[i];
            if (com_block.children.length == 2) {
              com_block.children.item(0).onclick = function(){ return false; };
              com_block.children.item(1).onclick = (function(com_block){
                return function(e){
                  if (e.button == 0 || e.button == 1) {
                    this.style.display = "none";
                    com_block.children.item(0).onclick = function(){ return true; };
                  }
                };
              })(com_block);
            }
          }
        }
        if (platform.preferences.get("inj_blog_enhanced_editor")) {
          _shared._f.enhanceEditorNew();
        }
      },

      blogpost: function(){
        if (platform.preferences.get("inj_blog_enhanced")) {
          if (platform.preferences.get("inj_blog_enhanced_navigation")) {
            _shared._f.createPostNavigation();
          }
          if (platform.preferences.get("inj_blog_enhanced_formatting")) {
            _shared._f.enhancePosts();
          }
          if (platform.preferences.get("inj_blog_enhanced_editor")) {
            _shared._f.enhanceEditor();
            _shared._f.enhanceEditorNew();
          }
          _shared._f.enhanceSpecialPages();
        }
      },

      mymessagespage: function(){
        if (platform.preferences.get("inj_blog_enhanced_editor")) {
          _shared._f.enhanceEditorNew();
        }
      },

      mymessagespost: function(){
        if (platform.preferences.get("inj_blog_enhanced")) {
          if (platform.preferences.get("inj_blog_enhanced_navigation")) {
            _shared._f.createPostNavigation();
          }
          if (platform.preferences.get("inj_blog_enhanced_formatting")) {
            _shared._f.enhancePosts();
          }
          if (platform.preferences.get("inj_blog_enhanced_editor")) {
            _shared._f.enhanceEditor();
            _shared._f.enhanceEditorNew();
          }

          _shared._f.enhanceMyMessages();
        }
      },

      mymessagesnew: function(){
        if (platform.preferences.get("inj_blog_enhanced")) {
          if (platform.preferences.get("inj_blog_enhanced_editor")) {
            _shared._f.enhanceMyMessagesNew();
          }
        }
      },

      watch: function(){
        if (platform.preferences.get("inj_watch_beforeclose")) {
          window.onbeforeunload = function(){
            return platform.language.getString("inj_watch_beforeclose_message");
          }
        }

        if (platform.preferences.get("inj_blog_enhanced")) {
          platform.messaging.on("comments", function(request, sender){
            switch (request.func) {
              default:
                return { result: "error", error: "unknown action" };
                break;

              case "onload":
                if (platform.preferences.get("inj_blog_enhanced_formatting")) {
                  _shared._f.enhancePosts();
                }
                if (platform.preferences.get("inj_blog_enhanced_editor")) {
                  _shared._f.enhanceEditor();
                }
                if (platform.preferences.get("inj_watch_enhanced")) {
                  _shared._f.handleSubtitlesInComments();
                }

                return { result: "success", success: true };
                break;
            }
          });
        }

        if (platform.preferences.get("inj_watch_playlists")) {
          _shared._f.createPlaylistControl();
          _shared._f.createPlaylistSlider();
        }

        if (platform.preferences.get("inj_watch_enhanced")) {
          _shared._f.enhanceWatch();
        }
      },

      other: function(){
        platform.dom.findFirst("html").style.backgroundColor = "transparent";
        platform.dom.findFirst("html").style.backgroundImage = "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAChJREFUeNpiPHPmDAMMGBsbw9lMDDgA6RKM%2F%2F%2F%2Fh3POnj1LCzsAAgwAQtYIcFfEyzkAAAAASUVORK5CYII%3D')";
        platform.dom.findFirst("html").style.backgroundRepeat = "repeat";
      },

      login: function(){
        platform.dom.findFirst("html").style.background = "none";
      }
    };

    return {
      init: function(){
        _init.global();

        switch(_shared._f.matchPage()) {
          default:
            break;
          case 'other':
            _init.other();
            break;

          case 'login':
            _init.login();
            break;

          case 'index':
            _init.index();
            break;

          case 'myseries':
            _init.myseries();
            break;

          case 'series':
            _init.series();
            break;

          case 'allseries':
            _init.allseries();
            break;

          case 'blog':
          case 'tlog':
            _init.blogpage();
            break;

          case 'blog_post':
          case 'tlog_post':
            _init.blogpost();
            break;

          case 'mymessages':
            _init.mymessagespage();
            break;

          case 'mymessages_post':
            _init.mymessagespost();
            break;

          case 'mymessages_new':
            _init.mymessagesnew();
            break;

          case 'watch':
            _init.watch();
            break;
        }

        _shared._f.afterInit();
      }
    };
  })();

  TCMInjected.init();
});