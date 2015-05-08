var TCMPage = {
  index: "https://turbik.tv",

  initPage: function(title, subtitle){
    var conttitle = platform.dom.findFirst(".content_title");
    if (conttitle && title) {
      conttitle.textContent = title;
      document.title = title + " — " + platform.language.getString("extension_name");
    } else {
      document.title = platform.language.getString("extension_name");
    }

    var contsubtitle = platform.dom.findFirst(".content_subtitle");
    if (contsubtitle && subtitle) {
      contsubtitle.textContent = subtitle;
    }

    //platform.analytics.setup("analytics code");
    platform.analytics.track("pageview", [{ name: "Extension Version", value: chrome.runtime.getManifest().version }, { name: "Current Locale", value: chrome.runtime.getManifest().current_locale }]);
  },
  setActionStatus: function(text, timeout){
    var status_bar = platform.dom.findFirst(".action_status");
    if (status_bar) {
      timeout = timeout || 1400;

      status_bar.textContent = text;
      status_bar.style.display = "block";
      setTimeout(function(){ status_bar.style.display = "none"; status_bar.textContent = ""; }, timeout);
    }
  }
};