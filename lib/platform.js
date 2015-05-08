/**
 * Platform JavaScript library
 * Middleware-class library build for interaction with browser specific extension API
 *
 * Copyright (c) 2014 Yuri Sizov, http://humnom.net/
 *
 * Released under the MIT license (provided)
 */

(function(window) {
  var
    _modules = ["env", "events", "preferences", "storage", "messaging", "dom", "service", "tabs", "language", "toolbar", "contextMenu", "keystroke", "hash", "analytics"],

    /**
     * Platform constructor
     * @constructor
     */
    Platform = function(){
      var
        // Overall readiness
        _readyState = 0,
        // Modules readiness
        _readyPrerequisites = (function(){
          var a = {};
          for (var i in _modules) {
            a[_modules[i]] = false;
          }
          return a;
        })(),
        // Ready state checker
        _checkReadyState = function() {
          var r = 0;
          var i = 0;
          for (var k in _readyPrerequisites) {
            if (_readyPrerequisites[k]) {
              r++;
            }
            i++;
          }
          if (i == r) {
            _readyState = 1;
            platform.log("Platform is READY.");
            platform.events.fire("extension-ready");
            return true;
          }
          return false;
        };


      /**
       * Global function for setting ready state of individual modules
       * @param {string} key
       */
      this.setReady = function(key) {
        if (typeof _readyPrerequisites[key] != "undefined") {
          _readyPrerequisites[key] = true;
          _checkReadyState();
        }
      };

      /**
       * Shorthand method for binding on platform ready
       * @param callback
       */
      this.ready = function(callback){
        platform.events.on("extension-ready", callback);
      };

      /**
       * Local log function
       */
      this.log = function() {
        console.log.apply(console, arguments);
      };
      this.extend = function(obj1, obj2){
        for (var i in obj2) {
          if (typeof obj1[i] == "undefined") {
            obj1[i] = obj2[i];
          }
        }
        return obj1;
      };

      // Self-initialization
      (function(Platform) {
        Platform.events.create("Event", "extension-ready");
        Platform.events.on("domready", function(){
          for (var i in _modules) {
            var name = _modules[i];
            if (typeof Platform[name] != "undefined") {
              if (typeof Platform[name].init == "function") {
                Platform[name].init();
              } else {
                Platform.setReady(name);
              }
            } else {
              Platform.log("ERROR Module '" + name + "' is absent.");
            }
          }
        });
      })(this);
    },
    // For a case when DOM is ready before Platform is loaded
    IsDOMReady = false;

  window.addEventListener("DOMContentLoaded", function(){ IsDOMReady = true; }, false);

  Platform.mod = Platform.prototype = (function(){
    var a = {};
    for (var i in _modules) {
      a[_modules[i]] = {
        init: function(){ throw new Error("Module '" + _modules[i] + "' is NOT implemented!"); }
      };
    }

    return a;
  })();

  // Environmental variables and functions
  Platform.mod.env = {
    /**
     * @var {object} Contains information about browser environment
     */
    browser: (function(window){
      var a = { name: "Unknown", version: "0" };
      var us = window.navigator.userAgent;

      if (us.indexOf("Chrome") > -1) {
        a.name = "Chrome";
        var ua = us.substr(us.indexOf("Chrome"));
        var si = ua.indexOf(" ");
        a.version = ua.substring(7, (si > -1 ? si : undefined));
      }
      else if (us.indexOf("Opera") > -1) {
        a.name = "Opera";
        var ua = us.substr(us.indexOf("Version"));
        var si = ua.indexOf(" ");
        a.version = ua.substring(8, (si > -1 ? si : undefined));
      }

      return a;
    })(window),

    /**
     * Get global URL of a local file
     * @param {string} file Local file path
     * @return {string} Global file path
     */
    getUrl: function(file) {
      return chrome.extension.getURL("data/" + file);
    },

    /**
     * A handler to be executed when an extension is first installed
     * @param {function} callback A callback function
     */
    onInstalled: (function(){
      try {
        var installed = false;
        chrome.runtime.onInstalled.addListener(function(d){
          if (d.reason == "install") {
            installed = true;
          }
        });

        return function(callback) {
          if (installed) {
            callback();
          } else {
            chrome.runtime.onInstalled.addListener(function(d){
              if (d.reason == "install") {
                callback();
              }
            });
          }
        }
      } catch (e) {
        return function(callback){};
      }
    })(),

    /**
     * A handler to be executed when an extension is updated
     * @param {function} callback A callback function
     */
    onUpdated: (function(){
      try {
        var updated = false;
        chrome.runtime.onInstalled.addListener(function(d){
          if (d.reason == "update") {
            updated = true;
          }
        });

        return function(callback) {
          if (updated) {
            callback();
          } else {
            chrome.runtime.onInstalled.addListener(function(d){
              if (d.reason == "update") {
                callback();
              }
            });
          }
        }
      } catch (e) {
        return function(callback){};
      }
    })(),

    /**
     * Get an array of matching cookies
     * @param {string} name A name of the cookie
     * @param {object} params A set of parameters for the cookie
     * @param {function} callback A callback function on cookie retrieval
     */
    getCookies: function(name, params, callback) {
      if (typeof name != "undefined" && typeof callback == "function") {
        if (typeof params.path == "undefined") {
          params.path = "/";
        }
        if (typeof params.domain == "undefined") {
          params.domain = window.location.host;
        }
        chrome.cookies.getAll({ domain: params.domain, path: params.path, name: name }, callback);
      }
    },

    /**
     * Get a cookie from current domain old-school way
     * @param {string} name A name of the cookie
     * @returns {string} A cookie value
     */
    getCookieFast: function(name){
      var e = name + "=";
      var a = document.cookie.split(";");
      for (var d = 0; d < a.length; d++) {
        var f = a[d];
        while (f.charAt(0)==" ") {
          f = f.substring(1,f.length);
        }
        if (f.indexOf(e) == 0) {
          return f.substring(e.length,f.length);
        }
      }
      return "";
    },

    /**
     * Get a string variant corresponding to a value
     * @param {int} value A value
     * @param {Array} strings An array of 3 possible strings
     * @returns {*}
     */
    getPlural: function(value, strings){
      var cases = [2, 0, 1, 1, 1, 2];
      var i = (value%100>4 && value%100<20)? 2 : cases[(value%10<5)?value%10:5];
      return (typeof strings[i] != "undefined" ? strings[i] : "");
    }
  };

  // Event system
  Platform.mod.events = (function(){
    var
      knownEvents = {
        "domready": true,
        "extension-load": true,
        "resize": true
      },
      customEvents = {};

    return {
      /**
       * Set an event listener
       * @param {string} eventName A name of the event
       * @param {function} listener A function to be executed when the event is fired
       */
      on: function(eventName, listener) {
        if (typeof eventName == "string" && typeof listener == "function") {
          if (typeof knownEvents[eventName] != "undefined" && knownEvents[eventName]) {
            switch (eventName) {
              default:
                window.addEventListener(eventName, listener, false);
                break;

              case "extension-load":
                window.addEventListener("load", listener, false);
                break;

              case "domready":
                window.addEventListener("DOMContentLoaded", listener, false);
                break;
            }
          } else {
            platform.log("Can't bind event: invalid event");
          }
        } else {
          platform.log("Can't bind event: wrong argument types");
        }
      },
      /**
       * Unset an event listener
       * @param {string} eventName A name of the event
       * @param {function} listener A function to be removed from the event
       */
      off: function(eventName, listener) {
        if (typeof eventName == "string" && typeof listener == "function") {
          if (typeof knownEvents[eventName] != "undefined" && knownEvents[eventName]) {
            switch (eventName) {
              default:
                window.removeEventListener(eventName, listener, false);
                break;

              case "extension-load":
                window.removeEventListener("load", listener, false);
                break;

              case "domready":
                window.removeEventListener("DOMContentLoaded", listener, false);
                break;
            }
          } else {
            platform.log("Can't unbind event: invalid event");
          }
        } else {
          platform.log("Can't unbind event: wrong argument types");
        }    },
      /**
       * Create an event
       * @param {string} key A type of the event
       * @param {string} eventName A name of the event
       */
      create: function(key, eventName) {
        var event = document.createEvent(key);
        event.initEvent(eventName, true, true);
        customEvents[eventName] = event;
        knownEvents[eventName] = true;
      },
      /**
       * Execute all listeners tied to a named event
       * @param {string} eventName A name of the event
       * @param {EventTarget} [context] If specified, used as a context of the event instead of document
       */
      fire: function(eventName, context) {
        var c = context || document;
        platform.log("Event fired [" + eventName + "]");
        c.dispatchEvent(customEvents[eventName]);
      },
      init: function() {
        platform.events.create("Event", "storage-ready");
        platform.events.create("Event", "preferences-updated");
        platform.events.create("Event", "preferences-restored");

        platform.setReady("events");
      }
    }
  })();

  // DOM control shortcuts
  Platform.mod.dom = {
    /**
     * Locate a DOM-element, or a set of such, within given context
     * @param {string} selector Valid CSS-selector
     * @param {HTMLDocument|HTMLElement|Node} [context] If specified, is used instead of document as a context for the search
     * @return {NodeList|Array} On success NodeList is returned; if document (not context!) does not exist, an empty array is returned
     */
    find: function(selector, context) {
      if (typeof document === 'undefined')
        return [];

      if (typeof context === 'undefined') context = document;
      return context.querySelectorAll(selector);
    },
    /**
     * Locate a DOM-element, or a set of such, within given context
     * @param {string} selector Valid CSS-selector
     * @param {HTMLDocument|HTMLElement|Node} [context] If specified, is used instead of document as a context for the search
     * @return {Node|null} On success Node is returned; if document (not context!) does not exist, null is returned
     */
    findFirst: function(selector, context) {
      if (typeof document === 'undefined')
        return null;

      if (typeof context === 'undefined') context = document;
      return context.querySelector(selector);
    },
    /**
     * Create a DOM-element with an id, classes and inner text
     * @param {string} tag Tag name of the element
     * @param {string} [id] A unique ID of the element
     * @param {string} [classList] A string of classes, separated by an empty space
     * @param {string} [text] A string, containing textual information (no HTML) to be placed between the tags
     * @param {object} [attrSet] A set of variable attributes
     * @return {HTMLElement|boolean} On success HTMLElement is returned; if document does not exist, boolean false is returned
     */
    create: function(tag, id, classList, text, attrSet){
      if (typeof document === "undefined")
        return false;

      var el = document.createElement(tag);
      if (typeof id !== "undefined" && id !== null) {
        el.id = id;
      }
      if (typeof classList !== "undefined" && classList) {
        var classes = classList.trim().split(" ");
        for (var i = 0; i < classes.length; i++)
          el.classList.add(classes[i]);
      }
      if (typeof text !== "undefined" && text !== null) {
        el.innerText = text;
      }

      if (typeof attrSet == "object") {
        for (var a in attrSet) {
          if (attrSet.hasOwnProperty(a)) {
            el.setAttribute(a, attrSet[a]);
          }
        }
      }

      return el;
    },
    /**
     * A shortcut method to create an image with a source, dimensions and alternative text specified
     * @param {string} id A unique ID of the element (can be omitted)
     * @param {string} classList A string of classes, separated by an empty space (can be omitted)
     * @param {string} src A source of the image
     * @param {int} [width] A horizontal dimension of the image
     * @param {int} [height] A vertical dimension of the image
     * @param {string} [alt] A text to be displayed if no image is loaded
     * @return {HTMLElement} On success HTMLElement is returned; if document does not exist, boolean false is returned
     */
    createImg: function(id, classList, src, width, height, alt) {
      var img = this.create("img", id, classList);
      img.src = src;
      if (typeof width != "undefined") img.width = width;
      if (typeof height != "undefined") img.height = height;
      if (typeof alt != "undefined") img.alt = alt;
      return img;
    },
    /**
     * Create a text node
     * @param {string} text A content of the node
     * @returns {Text|boolean} On success TextNode is returned; if document does not exist, boolean false is returned
     */
    text: function(text) {
      if (typeof document === 'undefined')
        return false;

      return document.createTextNode(text.toString());
    },
    /**
     * Calculate the top and left offsets of an element
     * @param {HTMLElement|Node} element The element to use
     * @returns {object} The top and left offsets in object form
     */
    getOffset: function(element) {
      var offset = { top: 0, left: 0 };
      var i = 0;

      var current_element = element;
      while (current_element.offsetParent) {
        offset.top += current_element.offsetTop;
        offset.left += current_element.offsetLeft;
        current_element = current_element.offsetParent;
        i++;
      }

      return offset;
    },
    /**
     * Create a new document for HTML parsing
     * @returns {HTMLDocument}
     */
    createDoc: function(){
      return document.implementation.createHTMLDocument();
    },
    /**
     * Paste an HTML into a document
     * @param {string} html An HTML string
     * @param {HTMLDocument} [document] A document container
     * @return {HTMLDocument}
     */
    pasteHTML: function(html, document){
      if (!(typeof document !== "undefined" && document instanceof HTMLDocument)) {
        document = platform.dom.createDoc();
      }

      document.open();
      document.write(html);
      document.close();

      return document;
    },

    init: function(){
      if (IsDOMReady) {
        platform.setReady("dom");
      } else {
        platform.events.on('domready', function(){
          platform.setReady("dom");
        });
      }
    }
  };

  // AJAX
  Platform.mod.service = (function(){
    var defaultOptions = {
      method: "get",
      data: null,
      dataType: "text",
      timeout: 0,
      cached: true,
      upload_progress: null,
      success: function(xhr){ },
      error: function(xhr){ platform.log("Sent a GET request, returned an error", xhr); },
      complete: function(xhr){ }
    };

    var prepareResponse = function(xhr, type) {
      if (typeof type == "undefined") {
        type = "text";
      }

      switch(type) {
        default:
        case "text":
          return xhr.responseText;
          break;

        case "json":
          if (!xhr.responseText.length) {
            return "";
          }
          try {
            return JSON.parse(xhr.responseText);
          } catch (exc) {
            return "";
          }
          break;
      }
    };

    return {
      /**
       * Perform a GET request
       * @param {string} url URL of the requested resource
       * @param {function} callback A handler to be executed on success; XHR object is passed as an argument
       */
      get: function(url, callback) {
        this.request(url, { method: "get", success: callback });
      },
      /**
       * Perform a POST request
       * @param {string} url URL of the requested resource
       * @param {string|object} [data] An object or a string containing sending data
       * @param {function} [callback] A handler to be executed on success; XHR object is passed as an argument
       */
      post: function(url, data, callback) {
        this.request(url, { method: "post", data: data, success: callback });
      },
      /**
       * Perform a request
       * @param {string} url URL of the requested resource
       * @param {object} [options] An object of settings
       */
      request: function(url, options) {
        if (typeof url == "string" && (typeof options == "object" || typeof options == "undefined")) {
          if (window.XMLHttpRequest) {
            options = platform.extend((options || {}), defaultOptions);
            var obj = new XMLHttpRequest();
            obj.timeout = options.timeout;

            if (obj.upload && options.upload_progress) {
              obj.upload.addEventListener('progress',  options.upload_progress, false)
            }

            obj.onreadystatechange = function(){
              if (obj.readyState == 4) {
                if (obj.status == 200) {
                  options.success(obj, prepareResponse(obj, options.dataType));
                } else {
                  options.error(obj, prepareResponse(obj, options.dataType));
                }
                options.complete(obj, prepareResponse(obj, options.dataType));
              }
            };

            var contentType = "application/x-www-form-urlencoded; charset=UTF-8";
            if (typeof options.data == "object") {
              if (options.data instanceof FormData) {
                contentType = false;
                options.cached = false;
              } else {
                var data_str = "";
                for (var d in options.data) {
                  data_str += "&" + d + "=" + options.data[d];
                }
                options.data = data_str.substr(1);
              }
            }

            switch (options.method.toUpperCase()) {
              case "POST":
                obj.open(options.method.toUpperCase(), url);
                if (contentType) {
                  obj.setRequestHeader("Content-Type", contentType);
                }
                if (!options.cached) {
                  obj.setRequestHeader("Cache-Control", "no-cache");
                }
                obj.send(options.data);
                break;

              case "GET":
                obj.open(options.method.toUpperCase(), url);
                if (!options.cached) {
                  obj.setRequestHeader("Cache-Control", "no-cache");
                }
                obj.send();
                break;

              default:
                break;
            }
          } else {
            platform.log("Can't send a request: browser doesn't support XHR");
          }
        } else {
          platform.log("Can't send a request: wrong argument types");
        }
      },
      /**
       * Catch one or multiple requests and perform an action when they are completed
       * @param {Array} urls A set of possible requested URLs
       * @param {function} callback A callback function
       */
      interfere: function(urls, callback){
        chrome.webRequest.onCompleted.addListener(callback, { urls: urls, types: ["xmlhttprequest"] });
      }
    }
  })();

  // Storage system
  Platform.mod.storage = (function(){
    var syncedStorage = {};
    return {
      /**
       * Get a stored item
       * @param {string} key A key the item is referenced by
       * @return {*}
       */
      get: function(key) {
      if (typeof syncedStorage[key] !== "undefined") {
        return syncedStorage[key];
      }
      return null;
    },
      /**
       * Set a stored item
       * @param {string} key A key the item is referenced by
       * @param {*} value A value of the item
       * @param {function} [callback] An optional callback
       */
      set: function(key, value, callback) {
        var s = {};
        s[key] = value;
        chrome.storage.sync.set(s, callback);
      },
      /**
       * Remove a stored item
       * @param {string} key A key the item is referenced by
       */
      remove: function(key) {
        chrome.storage.sync.remove(key);
      },
      /**
       * Initializer
       */
      init: function(){
        chrome.storage.sync.get(null, function(s){
          syncedStorage = s;

          chrome.storage.onChanged.addListener(function(changes, areaName) {
            if (areaName == "sync") {
              for (key in changes) {
                if (typeof changes[key].newValue === "undefined") {
                  delete syncedStorage[key];
                } else {
                  syncedStorage[key] = changes[key].newValue;
                }

                if (key == "settings") {
                  if (syncedStorage[key].settings_inited) {
                    platform.events.fire("preferences-updated");
                  } else {
                    platform.events.fire("preferences-restored");
                  }
                }
              }
            }
          });

          platform.setReady("storage");
          platform.events.fire("storage-ready");
        });
      }
    }
  })();

  // Browser toolbar controls
  Platform.mod.toolbar = {
    /**
     * Initialize a toolbar badge
     * @param {string} title A title of the badge
     * @param {string} icon A link to an icon of the badge
     * @param {string} popup A link to a page used as a popup
     */
    createItem: function(title, icon, popup) {
      this.setTitle(title);
      this.setIcon(icon);
      this.setPopup(popup);
    },
    /**
     * Set a title of the badge
     * @param {string} title A title of the badge
     */
    setTitle: function(title) {
      chrome.browserAction.setTitle({title: title});
    },
    /**
     * Set an icon of the badge
     * @param {string} icon A link to an icon of the badge
     */
    setIcon: function(icon) {
      chrome.browserAction.setIcon({path: platform.env.getUrl(icon)});
    },
    /**
     * Set a popup page of the badge
     * @param {string} [popup] A link to a page used as a popup
     */
    setPopup: function(popup) {
      popup = (popup ? "data/" + popup : "");
      chrome.browserAction.setPopup({popup: popup});
    },
    /**
     * Set badge text block
     * @param {string} text A text to be displayed on top of the badge
     * @param {string|Array} [color] A valid CSS color or a ColorArray for the text (can be omitted)
     * @param {string|Array} [backgroundColor] A valid CSS color or a ColorArray for the text's background (can be omitted)
     */
    setBadgeText: function(text, color, backgroundColor) {
      chrome.browserAction.setBadgeText({text: text});
      // no color option, always white
      if (typeof backgroundColor !== 'undefined') chrome.browserAction.setBadgeBackgroundColor({color: backgroundColor});
    }
  };

  // Browser tab controls
  Platform.mod.tabs = {
    /**
     * Open a new tab with a specified URL
     * @param {string} url Local or global URL
     */
    open: function(url) {
      chrome.tabs.create({ url : url });
    },

    /**
     * Open a new popup window with a specified URL and dimensions
     * @param {string} url Local or global URL
     * @param {int} width Horizontal dimension of the window
     * @param {int} height Vertical dimension of the window
     */
    popup: function(url, width, height) {
      chrome.windows.create({ url : url, type : "popup", width : width, height : height });
    }
  };

  // Browser desktop notifications
  Platform.mod.notifications = (function(){
    var canRich = (typeof chrome.notifications != "undefined");

    var
      richButtons = {},
      addButton = function(noteId, buttonIdx, callback) {
        if (typeof callback == "function") {
          if (typeof richButtons[noteId] == "undefined") {
            richButtons[noteId] = {};
          }
          if (typeof richButtons[noteId][buttonIdx] == "undefined") {
            richButtons[noteId][buttonIdx] = [];
          }
          richButtons[noteId][buttonIdx].push(callback);
        }
      };

    var send = function(){ };
    if (canRich) {
      send = function(title, text, icon, buttons, items){
        var noteId = "tcm-" + Math.ceil(Math.random() * 10000);

        var options = {
          type: "basic",
          title: title,
          message: text,
          iconUrl: platform.env.getUrl(icon)
        };
        if (typeof buttons != "undefined" && buttons instanceof Array) {
          options.buttons = [];
          for (var i in buttons) {
            options.buttons.push({ title: buttons[i].title, iconUrl: (buttons[i].icon ? platform.env.getUrl(buttons[i].icon) : "") });
            addButton(noteId, i, buttons[i].callback);
          }
        }
        if (typeof items != "undefined" && items instanceof Array) {
          options.type = "list";
          options.items = [];
          for (var i in items) {
            options.items.push({ title: items[i].title, message: items[i].text });
          }
        }

        chrome.notifications.create(noteId, options, function(){});
      };

      chrome.notifications.onButtonClicked.addListener(function(noteId, buttonIdx) {
        platform.log(richButtons);
        if (typeof richButtons[noteId] != "undefined" && typeof richButtons[noteId][buttonIdx] != "undefined") {
          for (var i in richButtons[noteId][buttonIdx]) {
            richButtons[noteId][buttonIdx][i]();
          }
        }
      });
    } else {
      send = function(title, text, icon){
        var n = webkitNotifications.createNotification( platform.env.getUrl(icon), title, text );
        n.show();
        setTimeout(function(){ n.cancel(); }, 5400);
      }
    }
    return {
      /**
       * Send a desktop notification to user
       * @param {string} title A title string for the notification
       * @param {string} text A formatted text for the notification
       * @param {string} icon A URL to an icon to be displayed in the notification
       * @param {Array} buttons A set of buttons [rich only]
       * @param {Array} items A set of sub-messages [rich only]
       */
      send: send
    };
  })();

  // Language module
  Platform.mod.language = {
    /**
     * Get localized string from dictionary
     * @param {string} key A key the string is referenced by
     * @param {Array} [placeholders] A set of text to be placed in the string
     * @return {string}
     */
    getString: function(key, placeholders) {
      return chrome.i18n.getMessage(key, placeholders);
    },
    /**
     * Get localized string for a number
     * @param {string} key A key the string is referenced by
     * @param {number} val A number corresponding to the string
     * @returns {string}
     */
    getPlural: function(key, val) {
      var cases = [5, 1, 2, 2, 2, 5];
      var i = (val%100>4 && val%100<20)? 5 : cases[(val%10<5)?val%10:5];
      return this.getString(key + "_" + i);
    }

  };

  // Settings module
  Platform.mod.preferences = (function(){
    var unsyncedSettings = { settings_inited: false };

    return {
      /**
       * Get a preference
       * @param {string} key A key the preference is referenced by
       * @return {*}
       */
      get: function(key) {
        var s = platform.storage.get("settings")[key];
        unsyncedSettings[key] = s;
        return s;
      },
      /**
       * Set a preference
       * @param {string} key A key the preference is referenced by
       * @param {*} value A value of the preference
       */
      set: function(key, value) {
        unsyncedSettings[key] = value;
      },
      /**
       * Synchronize settings after all of them are set
       * @param {function} [callback] A function to be executed on set
       */
      sync: function(callback) {
        platform.storage.set("settings", unsyncedSettings, callback);
      },
      /**
       * Restore settings to defaults
       * @param {function} [callback] A function to be executed on set
       */
      restore: function(callback) {
        unsyncedSettings = { settings_inited: false };
        platform.storage.set("settings", unsyncedSettings, callback);
      },

      init: function() {
        platform.events.on("storage-ready", function(){
          if (!platform.storage.get("settings")) {
            platform.storage.set("settings", unsyncedSettings, function(){
              platform.setReady("preferences");
            });
          } else {
            unsyncedSettings = platform.storage.get("settings");
            platform.setReady("preferences");
          }

        });
      }
    }
  })();

  // Internal messaging module
  Platform.mod.messaging = (function(){
    var
      autoActions = {},
      manualActions = {};

    return {
      /**
       * Set up a message handler for a specified action
       * @param {string} key A name of action
       * @param {function} handler A handler
       */
      on: function(key, handler){
        if (typeof autoActions[key] == "undefined") {
          autoActions[key] = [];
        }
        autoActions[key].push(handler);
      },
      /**
       * Set up a message handler for a specified action with manual response sending
       * @param {string} key A name of action
       * @param {function} handler A handler
       */
      onManual: function(key, handler){
        if (typeof manualActions[key] == "undefined") {
          manualActions[key] = [];
        }
        manualActions[key].push(handler);
      },
      /**
       * Send a request to a tab or the background page
       * @param {object} data A request object, containing at least an action
       * @param {int|null} tabid An ID of the tab to send to, or null, if the background page is the target
       * @param {function} callback A message response handler, object is passed if it contains at least a result, otherwise error is passed
       */
      send: function(data, tabid, callback) {
        if (typeof data.action !== "undefined") {
          if (typeof tabid == "undefined" || tabid === null) {
            chrome.runtime.sendMessage(data, function(resp) {
              if (resp && typeof resp.result !== "undefined") {
                callback(resp);
              }
            });
          } else {
            chrome.tabs.sendMessage(parseInt(tabid, 10), data, function(resp) {
              if (typeof resp.result !== "undefined") {
                callback(resp);
              } else {
                callback({ result: "error", error: "malformed response: missing result", response: resp });
              }
            });
          }
        }
      },
      init: function(){
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
          var isTab = (sender.tab);
          if (typeof request.action !== "undefined"){
            if (typeof autoActions[request.action] !== "undefined") {
              for (var i in autoActions[request.action]) {
                sendResponse(autoActions[request.action][i](request, sender));
              }
            }
            if (typeof manualActions[request.action] !== "undefined") {
              for (var i in manualActions[request.action]) {
                manualActions[request.action][i](request, sender, sendResponse);
              }
            }
          } else {
            sendResponse({ result: "error", error: "malformed request: missing action" });
          }
          return true;
        });
        platform.setReady("messaging");
      }
    }
  })();

  // Context menu component
  Platform.mod.contextMenu = (function(){
    var
      context,
      showContext = function(event, items){
        context.style.display = "none";
        context.innerHTML = "";
        for (var i in items) {
          var item = items[i];
          var ci = platform.dom.create("div", null, "context_item");
          if (typeof item.icon != "undefined") {
            var ci_icon = platform.dom.create("div", null, "context_item_icon");
            ci_icon.style.backgroundImage = "url(" + item.icon + ")";
            ci.appendChild(ci_icon);
          }
          ci.appendChild(platform.dom.text(item.text));
          ci.title = item.title;
          ci.onclick = item.action;
          context.appendChild(ci);
        }

        context.style.display = "block";
        context.style.left = (event.pageX + context.offsetWidth > window.innerWidth ? event.pageX - context.offsetWidth : event.pageX) + "px";
        context.style.top = (event.pageY + context.offsetHeight > window.innerHeight + window.scrollY ? event.pageY - context.offsetHeight : event.pageY) + "px";
      };

    return {
      /**
       * Create a menu element, if it is not present, and set it up for an element
       * @param {HTMLElement|Node} element The element, context menu is called on
       * @param {Array} items A set of menu items to be displayed
       */
      append: function(element, items){
        context = platform.dom.findFirst("#tcm_context_menu");
        if (!context) {
          context = platform.dom.create("div", "tcm_context_menu");
          document.body.appendChild(context);
        }

        if (typeof element != "undefined") {
          element.oncontextmenu = function(e){
            showContext(e, items);
            e.cancelBubble = true;
            return false;
          };
        }
      },
      init: function(){
        var onevent = function(e){
          if (e.target != context) {
            if (context && context.style.display == "block") {
              context.style.display = "none";
            }
          }
        };
        document.body.onclick = onevent;
        document.body.oncontextmenu = onevent;

        platform.events.on("resize", function(){
          if (context && context.style.display == "block") {
            context.style.display = "none";
          }
        });

        platform.setReady("contextMenu");
      }
    }
  })();

  Platform.mod.keystroke = (function(){
    var
      functions = {},
      create_function = function(callback, key, shift, ctrl, alt){
        if (typeof callback == "function" && typeof key != "undefined") {
          if (typeof functions[key] == "undefined") {
            functions[key] = [];
          }
          functions[key].push(function(e){
            if (shift && !e.shiftKey) { return; }
            if (ctrl && !e.ctrlKey) { return; }
            if (alt && !e.altKey) { return; }
            if (e.keyCode != key) { return; }
            callback(e);
          });
        }
      };

    var listener = function(e){
      if (e.target.webkitMatchesSelector("input, textarea")){ return; }
      if (typeof functions[e.keyCode] != "undefined") {
        for (var i in functions[e.keyCode]) {
          functions[e.keyCode][i](e);
        }
      }
    };

    return {
      /**
       * Enable keystroke tracking
       */
      enable: function(){
        document.addEventListener("keyup", listener, false);
      },
      /**
       * Disable keystroke tracking
       */
      disable: function(){
        document.removeEventListener("keyup", listener, false);
      },
      /**
       * Track a specific keystroke
       * @param {string} keystroke A string representation of a keystroke, e.g. Shift+Ctrl+A
       * @param {function} callback A callback function
       */
      track: function(keystroke, callback){
        if (typeof keystroke == "string" && keystroke.trim().length > 0 && typeof callback == "function") {
          var keys = keystroke.trim().split("+");
          var shift = false, ctrl = false, alt = false, key = false;

          for (var i = 0; i < keys.length; i++) {
            if (keys[i].toLowerCase() == "shift") {
              shift = true;
            }
            else if (keys[i].toLowerCase() == "ctrl") {
              ctrl = true;
            }
            else if (keys[i].toLowerCase() == "alt") {
              alt = true;
            }
            else {
              var charCode = keys[i].toUpperCase().charCodeAt(0);
              if (charCode >= 65 && charCode <= 90) {
                key = charCode;
                break;
              }
            }
          }

          if (key) {
            create_function(callback, key, shift, ctrl, alt);
          }
        }
      },
      /**
       * Create a tracking data manually for non-alphabetic keys
       * @param {int} key A key code for a keystroke
       * @param {function} callback A callback function
       * @param {boolean} shift Is shift required
       * @param {boolean} ctrl Is control required
       * @param {boolean} alt Is alt required
       */
      trackCode: function(key, callback, shift, ctrl, alt) {
        if (typeof key != "undefined" && typeof callback == "function") {
          create_function(callback, key, shift, ctrl, alt);
        }
      }
    }
  })();

  // Hash functions
  Platform.mod.hash = {
    md5: function(a){function b(a,b){return a<<b|a>>>32-b}function c(a,b){var c,d,e,f,g;return e=a&2147483648,f=b&2147483648,c=a&1073741824,d=b&1073741824,g=(a&1073741823)+(b&1073741823),c&d?g^2147483648^e^f:c|d?g&1073741824?g^3221225472^e^f:g^1073741824^e^f:g^e^f}function d(a,b,c){return a&b|~a&c}function e(a,b,c){return a&c|b&~c}function f(a,b,c){return a^b^c}function g(a,b,c){return b^(a|~c)}function h(a,e,f,g,h,i,j){return a=c(a,c(c(d(e,f,g),h),j)),c(b(a,i),e)}function i(a,d,f,g,h,i,j){return a=c(a,c(c(e(d,f,g),h),j)),c(b(a,i),d)}function j(a,d,e,g,h,i,j){return a=c(a,c(c(f(d,e,g),h),j)),c(b(a,i),d)}function k(a,d,e,f,h,i,j){return a=c(a,c(c(g(d,e,f),h),j)),c(b(a,i),d)}function l(a){var b,c=a.length,d=c+8,e=(d-d%64)/64,f=(e+1)*16,g=Array(f-1),h=0,i=0;while(i<c)b=(i-i%4)/4,h=i%4*8,g[b]=g[b]|a.charCodeAt(i)<<h,i++;return b=(i-i%4)/4,h=i%4*8,g[b]=g[b]|128<<h,g[f-2]=c<<3,g[f-1]=c>>>29,g}function m(a){var b="",c="",d,e;for(e=0;e<=3;e++)d=a>>>e*8&255,c="0"+d.toString(16),b+=c.substr(c.length-2,2);return b}function n(a){a=a.replace(/\r\n/g,"\n");var b="";for(var c=0;c<a.length;c++){var d=a.charCodeAt(c);d<128?b+=String.fromCharCode(d):d>127&&d<2048?(b+=String.fromCharCode(d>>6|192),b+=String.fromCharCode(d&63|128)):(b+=String.fromCharCode(d>>12|224),b+=String.fromCharCode(d>>6&63|128),b+=String.fromCharCode(d&63|128))}return b}var o=Array(),p,q,r,s,t,u,v,w,x,y=7,z=12,A=17,B=22,C=5,D=9,E=14,F=20,G=4,H=11,I=16,J=23,K=6,L=10,M=15,N=21;a=n(a),o=l(a),u=1732584193,v=4023233417,w=2562383102,x=271733878;for(p=0;p<o.length;p+=16)q=u,r=v,s=w,t=x,u=h(u,v,w,x,o[p+0],y,3614090360),x=h(x,u,v,w,o[p+1],z,3905402710),w=h(w,x,u,v,o[p+2],A,606105819),v=h(v,w,x,u,o[p+3],B,3250441966),u=h(u,v,w,x,o[p+4],y,4118548399),x=h(x,u,v,w,o[p+5],z,1200080426),w=h(w,x,u,v,o[p+6],A,2821735955),v=h(v,w,x,u,o[p+7],B,4249261313),u=h(u,v,w,x,o[p+8],y,1770035416),x=h(x,u,v,w,o[p+9],z,2336552879),w=h(w,x,u,v,o[p+10],A,4294925233),v=h(v,w,x,u,o[p+11],B,2304563134),u=h(u,v,w,x,o[p+12],y,1804603682),x=h(x,u,v,w,o[p+13],z,4254626195),w=h(w,x,u,v,o[p+14],A,2792965006),v=h(v,w,x,u,o[p+15],B,1236535329),u=i(u,v,w,x,o[p+1],C,4129170786),x=i(x,u,v,w,o[p+6],D,3225465664),w=i(w,x,u,v,o[p+11],E,643717713),v=i(v,w,x,u,o[p+0],F,3921069994),u=i(u,v,w,x,o[p+5],C,3593408605),x=i(x,u,v,w,o[p+10],D,38016083),w=i(w,x,u,v,o[p+15],E,3634488961),v=i(v,w,x,u,o[p+4],F,3889429448),u=i(u,v,w,x,o[p+9],C,568446438),x=i(x,u,v,w,o[p+14],D,3275163606),w=i(w,x,u,v,o[p+3],E,4107603335),v=i(v,w,x,u,o[p+8],F,1163531501),u=i(u,v,w,x,o[p+13],C,2850285829),x=i(x,u,v,w,o[p+2],D,4243563512),w=i(w,x,u,v,o[p+7],E,1735328473),v=i(v,w,x,u,o[p+12],F,2368359562),u=j(u,v,w,x,o[p+5],G,4294588738),x=j(x,u,v,w,o[p+8],H,2272392833),w=j(w,x,u,v,o[p+11],I,1839030562),v=j(v,w,x,u,o[p+14],J,4259657740),u=j(u,v,w,x,o[p+1],G,2763975236),x=j(x,u,v,w,o[p+4],H,1272893353),w=j(w,x,u,v,o[p+7],I,4139469664),v=j(v,w,x,u,o[p+10],J,3200236656),u=j(u,v,w,x,o[p+13],G,681279174),x=j(x,u,v,w,o[p+0],H,3936430074),w=j(w,x,u,v,o[p+3],I,3572445317),v=j(v,w,x,u,o[p+6],J,76029189),u=j(u,v,w,x,o[p+9],G,3654602809),x=j(x,u,v,w,o[p+12],H,3873151461),w=j(w,x,u,v,o[p+15],I,530742520),v=j(v,w,x,u,o[p+2],J,3299628645),u=k(u,v,w,x,o[p+0],K,4096336452),x=k(x,u,v,w,o[p+7],L,1126891415),w=k(w,x,u,v,o[p+14],M,2878612391),v=k(v,w,x,u,o[p+5],N,4237533241),u=k(u,v,w,x,o[p+12],K,1700485571),x=k(x,u,v,w,o[p+3],L,2399980690),w=k(w,x,u,v,o[p+10],M,4293915773),v=k(v,w,x,u,o[p+1],N,2240044497),u=k(u,v,w,x,o[p+8],K,1873313359),x=k(x,u,v,w,o[p+15],L,4264355552),w=k(w,x,u,v,o[p+6],M,2734768916),v=k(v,w,x,u,o[p+13],N,1309151649),u=k(u,v,w,x,o[p+4],K,4149444226),x=k(x,u,v,w,o[p+11],L,3174756917),w=k(w,x,u,v,o[p+2],M,718787259),v=k(v,w,x,u,o[p+9],N,3951481745),u=c(u,q),v=c(v,r),w=c(w,s),x=c(x,t);var O=m(u)+m(v)+m(w)+m(x);return O.toLowerCase()},
    sha1: function(a){function b(a,b){var c=a<<b|a>>>32-b;return c}function c(a){var b="",c,d,e;for(c=0;c<=6;c+=2)d=a>>>c*4+4&15,e=a>>>c*4&15,b+=d.toString(16)+e.toString(16);return b}function d(a){var b="",c,d;for(c=7;c>=0;c--)d=a>>>c*4&15,b+=d.toString(16);return b}function e(a){a=a.replace(/\r\n/g,"\n");var b="";for(var c=0;c<a.length;c++){var d=a.charCodeAt(c);d<128?b+=String.fromCharCode(d):d>127&&d<2048?(b+=String.fromCharCode(d>>6|192),b+=String.fromCharCode(d&63|128)):(b+=String.fromCharCode(d>>12|224),b+=String.fromCharCode(d>>6&63|128),b+=String.fromCharCode(d&63|128))}return b}var f,g,h,i=new Array(80),j=1732584193,k=4023233417,l=2562383102,m=271733878,n=3285377520,o,p,q,r,s,t;a=e(a);var u=a.length,v=new Array;for(g=0;g<u-3;g+=4)h=a.charCodeAt(g)<<24|a.charCodeAt(g+1)<<16|a.charCodeAt(g+2)<<8|a.charCodeAt(g+3),v.push(h);switch(u%4){case 0:g=2147483648;break;case 1:g=a.charCodeAt(u-1)<<24|8388608;break;case 2:g=a.charCodeAt(u-2)<<24|a.charCodeAt(u-1)<<16|32768;break;case 3:g=a.charCodeAt(u-3)<<24|a.charCodeAt(u-2)<<16|a.charCodeAt(u-1)<<8|128}v.push(g);while(v.length%16!=14)v.push(0);v.push(u>>>29),v.push(u<<3&4294967295);for(f=0;f<v.length;f+=16){for(g=0;g<16;g++)i[g]=v[f+g];for(g=16;g<=79;g++)i[g]=b(i[g-3]^i[g-8]^i[g-14]^i[g-16],1);o=j,p=k,q=l,r=m,s=n;for(g=0;g<=19;g++)t=b(o,5)+(p&q|~p&r)+s+i[g]+1518500249&4294967295,s=r,r=q,q=b(p,30),p=o,o=t;for(g=20;g<=39;g++)t=b(o,5)+(p^q^r)+s+i[g]+1859775393&4294967295,s=r,r=q,q=b(p,30),p=o,o=t;for(g=40;g<=59;g++)t=b(o,5)+(p&q|p&r|q&r)+s+i[g]+2400959708&4294967295,s=r,r=q,q=b(p,30),p=o,o=t;for(g=60;g<=79;g++)t=b(o,5)+(p^q^r)+s+i[g]+3395469782&4294967295,s=r,r=q,q=b(p,30),p=o,o=t;j=j+o&4294967295,k=k+p&4294967295,l=l+q&4294967295,m=m+r&4294967295,n=n+s&4294967295}var t=d(j)+d(k)+d(l)+d(m)+d(n);return t.toLowerCase()}
  };

  // Analytics (Google and such) functions
  Platform.mod.analytics = (function(){
    window._gaq = null;
    return {
      /**
       * Set up google analytics account
       * @param {string} code GA tracking number
       */
      setup: function(code) {
        if (typeof code != "undefined") {
          _gaq = [];
          _gaq.push(['_setAccount', code]);

          var ga = platform.dom.create("script", null, "", "", { type: "text/javascript", async: true });
          ga.src = "https://ssl.google-analytics.com/ga.js";
          var s = platform.dom.findFirst("script");
          s.parentNode.insertBefore(ga, s);
        }
      },
      /**
       * Track a pageview or a specific feature with up to 5 parameters
       * @param {string} [type] A type of tracking, defaults to pageview
       * @param {Array} [params] A set of up to 5 parameters
       */
      track: function(type, params){
        if (typeof _gaq != "undefined") {
          if (typeof params != "undefined") {
            for (var i = 0; i < 5 && i < params.length; i++) {
              var param = params[i];
              _gaq.push(['_setCustomVar', (i+1), param.name, param.value]);
            }
          }

          switch (type) {
            default:
            case "pageview":
              _gaq.push(['_trackPageview']);
              break;
          }
        }
      }
    }
  })();

  window.platform = new Platform();
})(window);