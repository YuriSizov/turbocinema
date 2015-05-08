platform.ready(function(){
  TCMPage.menu = {
    items: {},

    addItem: function(id, link, parent){
      if (typeof(parent) === 'undefined' || typeof(this.items[parent]) === 'undefined' ) {
        this.items[id] = { i: id, l: link, n: platform.language.getString('popup_item_' + id + '_title'), d: platform.language.getString('popup_item_' + id + '_description'), c: {} };
      } else {
        this.items[parent]['c'][id] = { i: id, l: link, n: platform.language.getString('popup_item_' + id + '_title'), d: platform.language.getString('popup_item_' + id + '_description'), c: {} };
      }
    },

    draw: function() {
      var domlist = platform.dom.findFirst('#menulist');

      var drawItem = function(item, lvl) {
        var domitem = platform.dom.create('div', 'menu_item_' + item.i, 'list-item' + (lvl > 0 ? ' sub' + lvl : ''));
        var domitem_link = platform.dom.create('a', null, 'list-item-link', item.n);
        domitem_link.onclick = function(){ platform.tabs.open(item.l); };

        var domitem_desc = platform.dom.create('p', null, 'list-item-desc', item.d);

        domitem.appendChild(domitem_link);
        domitem.appendChild(domitem_desc);

        domlist.appendChild(domitem);
      };

      for (var i in this.items) {
        drawItem(this.items[i]);
        for (var j in this.items[i].c) {
          drawItem(this.items[i].c[j], 1);
        }
      }
    },

    init: function(){
      TCMPage.initPage(platform.language.getString('popup_title'), platform.language.getString('extension_name'));

      var itsettings = platform.dom.findFirst('.itsettings');
      if (itsettings) {
        itsettings.title = platform.language.getString('popup_icon_settings');
        itsettings.onclick = function(){ platform.tabs.open( platform.env.getUrl('pages/settings.html') ) };
      }
      var itfeedback = platform.dom.findFirst('.itfeedback');
      if (itfeedback) {
        itfeedback.title = platform.language.getString('popup_icon_feedback');
        itfeedback.onclick = function(){ platform.tabs.open( TCMPage.index + '/Tlog/Posts/13402' ) };
      }
      var itlists = platform.dom.findFirst('.itlists');
      if (itlists) {
        itlists.title = platform.language.getString('popup_icon_lists');
        itlists.onclick = function(){ platform.tabs.open( platform.env.getUrl('pages/lists.html') ) };
      }

      this.draw();
    }
  };

  TCMPage.menu.addItem('main', TCMPage.index);
  TCMPage.menu.addItem('series', TCMPage.index + '/Series');
  TCMPage.menu.addItem('blog', TCMPage.index + '/Blog');
  TCMPage.menu.addItem('tlog', TCMPage.index + '/Tlog');
  TCMPage.menu.addItem('my', TCMPage.index + '/My');
  TCMPage.menu.addItem('mymessages', TCMPage.index + '/My/Messages', 'my');
  TCMPage.menu.addItem('myseries', TCMPage.index + '/My/Series', 'my');

  TCMPage.menu.init();
});