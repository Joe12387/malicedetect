/**
 * (c) 2021 Joe Rutkowski
 * Joe <@> dreggle <.> com
 **/

var malicedetect = (function(callback) {

  var eva = eval;

  function check() {

    if (checkUA() || checkPrototype() || checkVars() || checkLanguages() || checkScreen()) {

      return callback({status: 'failed'});

    }

    return callback({status: 'passed'});

  }

  /**
   * Bots may screw up the prototype on several variables related to plugins and mime types.
   **/

  function checkPrototype() {
    var n = navigator;
    try {
      if (PluginArray.prototype === n.plugins.__proto__ === false) return true;
    } catch (e) {}
    try {
      if (Plugin.prototype === n.plugins[0].__proto__ === false) return true;
    } catch (e) {}
    try {
      if (MimeTypeArray.prototype === n.mimeTypes.__proto__ === false) return true;
    } catch (e) {}
    try {
      if (MimeType.prototype === n.mimeTypes[0].__proto__ === false) return true;
    } catch (e) {}
    return false;
  }
  
  /**
   * Looks for variables defined that indicate the browser is a bot or headless.
   **/

  function checkVars() {
    var w = window,
      d = document,
      n = navigator,
      e = d.documentElement,
      windowBotVars = ['webdriver', '_Selenium_IDE_Recorder', 'callSelenium', '_selenium', 'callPhantom', '_phantom', 'phantom', '__nightmare'],
      navigatorBotVars = ['webdriver', '__webdriver_script_fn', '__driver_evaluate', '__webdriver_evaluate', '__selenium_evaluate', '__fxdriver_evaluate', '__driver_unwrapped', '__webdriver_unwrapped', '__selenium_evaluate', '__fxdriver_evaluate', '__driver_unwrapped', '__webdriver_unwrapped', '__selenium_unwrapped', '__fxdriver_unwrapped', '__webdriver_script_func'],
      documentBotAttributes = ['webdriver', 'selenium', 'driver'];
      
    for (var i = 0; i < windowBotVars.length; i++)
      if (windowBotVars[i] in w) return true;
      
    for (var i = 0; i < navigatorBotVars.length; i++)
      if (navigatorBotVars[i] in n) return true;
      
    for (var i = 0; i < documentBotAttributes.length; i++)
      if (e.getAttribute(documentBotAttributes[i]) !== null) return true;
      
    return false;
  }

  /**
   * Round Time Trip of the connection is obtainable in Chromium-based browsers. The RTT equals zero in many bots, but may result in a few false positives.
   **/

  function checkRTT() {
    
    var connection = navigator.connection;
    var connectionRtt = connection ? connection.rtt : -1;
    
    return connectionRtt === 0;
    
  }

  /**
   * navigator.language & navigator.languages are always defined & non-empty, unless the browser is MSIE.
   **/

  function checkLanguages() {
    
    if (isIE()) return false;

    var n = navigator;

    try {
      var language = n.language;
      var languagesLength = n.languages.length;

      if (!language || languagesLength === 0)
        return true;
    } catch (e) {}
    return false;
  }

  /**
   * Unless on MSIE or Firefox, navigator.plugins will always have at least one element defined.
   * Note: This does not support mobile browsers, in which case navigator.plugins is always an empty array.
   **/

  function checkPlugins() {

    if (isIE() || isFirefox()) return false;

    var n = navigator;

    if (!n.plugins) return false;

    return n.plugins.length === 0

  }

  /**
   * Some bots will define outerWidth & outerHeight as 0. I believe this has to do with some bots' windows being minimized or the window being very small.
   **/

  function checkScreen() {

    var w = window;

    return w.outerWidth == 0 && w.outerHeight == 0

  }

  /**
   * A bunch of tests based on the user agent.
   **/

  function checkUA() {

    var n = navigator;
    var u = n.userAgent;

    /**
     * Modern browsers start their user agent strings with "Mozilla/5.0". Bots often do not start their user agent strings with this.
     * Note: This excludes very old browsers such as MSIE 7 and will thus be marked as malicious.
     **/
    if (u.substr(0, 11) !== "Mozilla/5.0") return false;

    /**
     * Literally the easiest way to detect a bot: if they just tell you they're a bot via their user agent string.
     **/
    if (u.match(new RegExp(['headless', 'bot', 'crawl', 'index', 'archive', 'spider', 'http', 'google', 'bing', 'yahoo', 'msn', 'yandex', 'facebook'].join('|'), 'i'))) return false;

    /**
     * Check mobile devices to ensure they have touch support.
     * Note: I don't think that navigator.maxTouchPoints is supported on older versions of iOS Safari, and may come up as a false positive.
     **/
    if (u.match(new RegExp(['Mobile', 'Tablet', 'Android', 'iPhone', 'iPad', 'iPod'].join('|')))) {

      if (n.maxTouchPoints < 1 || !touchSupport()) return false;

    }

    if (u.match(new RegExp('Safari'))) {

      if (u.match(new RegExp('Chrome'))) {

        if (u.match(new RegExp('Edge'))) {

          /**
           * Original EdgeHTML-based Microsoft Edge. Obsolete.
           **/

          return !isEdgeHTML() || !checkEdgeHTML()

        } else {

          /**
           * Chromium-based Browsers (Chrome, Edge, Opera, Brave)
           **/
       
          return !isChrome() || !checkChrome()

        }

      } else if (u.match(new RegExp('Mobile Safari'))) {

        /**
         * iOS Devices
         **/
       
        return !isSafari() || !isMobileSafari() || !checkSafari()

      } else {

        /**
         * macOS Devices
         **/

        return !isSafari() || !checkSafari()

      }

    } else if (u.match(new RegExp('Firefox'))) {

      /**
       * Mozilla Firefox
       **/

      return !isFirefox() || !checkFirefox()

    } else if (u.match(new RegExp(['Trident', 'MSIE'].join('|')))) {

      /**
       * Internet Explorer
       **/

      return !isIE() || !checkMSIE()

    }

    return true;

  }

  /**
   * These are some ways to detect browsers/engines based on feature detection. I got this code from somewhere but forgot where (sorry!).
   **/

  function reduce(e) {
    return e.reduce((function(e, t) {
      return e + (t ? 1 : 0)
    }), 0)
  }

  function isIE() {
    var w = window,
      n = navigator;
    return reduce(["MSCSSMatrix" in w, "msSetImmediate" in w, "msIndexedDB" in w, "msMaxTouchPoints" in n, "msPointerEnabled" in n]) >= 4
  }

  function isChrome() {
    var w = window,
      n = navigator;
    return reduce(["webkitPersistentStorage" in n, "webkitTemporaryStorage" in n, 0 === n.vendor.indexOf("Google"), "webkitResolveLocalFileSystemURL" in w, "BatteryManager" in w, "webkitMediaStream" in w, "webkitSpeechGrammar" in w]) >= 5
  }

  function isSafari() {
    var w = window,
      n = navigator;
    return reduce(["ApplePayError" in w, "CSSPrimitiveValue" in w, "Counter" in w, "WebKitMediaKeys" in w, 0 === n.vendor.indexOf("Apple"), "getStorageUpdates" in n]) >= 4
  }

  function isMobileSafari() {
    var w = window,
      n = navigator;
    return reduce(["safari" in w, !("DeviceMotionEvent" in w), !("ongestureend" in w), !("standalone" in n)]) >= 3
  }

  function isEdgeHTML() {
    var w = window,
      n = navigator;
    return reduce(["msWriteProfilerMark" in w, "MSStream" in w, "msLaunchUri" in n, "msSaveBlob" in n]) >= 3 && !isIE()
  }

  function isFirefox() {

    return !isIE() && !isChrome() && !isSafari() && !isMobileSafari() && !isEdgeHTML();

  }

  //

  function checkChrome() {

    /**
     * The following should be true of all Chromium-based browsers:
     * - eval.toString().length should equal 33, otherwise it's lying about its user agent.
     * - If the RTT equals zero, it's probably a bot.
     * - If it's not a mobile browser and navigator.plugins is empty, it's probably a bot.
     **/
    
    if (toStringLength(eva) != 33) return false;
    if (checkRTT()) return false;
    if (navigator.userAgent.match(new RegExp(['Mobile', 'Tablet', 'Android'].join('|')) == false && checkPlugins())) return false;

    return true;

  }

  function checkFirefox() {

    /**
     * The following should be true of all Firefox browsers:
     * - eval.toString().length should equal 37, otherwise it's lying about its user agent.
     **/

    if (toStringLength(eva) != 37) return false;

    return true;

  }

  function checkSafari() {

    /**
     * The following should be true of all Safari browsers, both on macOS and iOS:
     * - eval.toString().length should equal 37, otherwise it's lying about its user agent.
     **/

    if (toStringLength(eva) != 37) return false;

    return true;

  }

  function checkMSIE() {

    /**
     * The following should be true of all MSIE browsers:
     * - eval.toString().length should equal 39, otherwise it's lying about its user agent.
     **/

    if (toStringLength(eva) != 39) return false;

    return true;

  }

  function checkEdgeHTML() {

    /**
     * The following should be true of legacy Edge:
     * - eval.toString().length should equal 33, otherwise it's lying about its user agent.
     **/

    if (toStringLength(eva) != 33) return false;

    return true;

  }

  /**
   * Some code to detect if the browser has touch support or not.
   **/

  function touchSupport() {
    
    var ts = "ontouchstart" in window, d = document;
    
    if (ts) return ts;
    
    try {
      d.createEvent("TouchEvent");
      ts = true;
    } catch (r) {
      ts = false;
    }
    return ts;
  }

  /**
   * Helper function that just turns a function into a string and measures the length of that string.
   **/

  function toStringLength(a) {
    return a.toString().length;
  }
  
  var init = function () {
    return check();
  };

  return init();

});