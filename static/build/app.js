(function() {
  var WSocket,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  $(function() {
    var p;
    p = window.location.pathname;
    if (p !== "/" && p.substring(0, 9) !== "/project/") {
      return;
    }
    $("#searchForm").attr('action', p);
    $("#searchForm").submit(function(e) {
      e.preventDefault();
      return $.ajax({
        type: "GET",
        url: $(this).attr("action"),
        data: $(this).serialize(),
        success: function(data) {
          return $("#logTableContainer").html(data);
        },
        complete: function() {
          return setTimeout((function() {
            Ladda.stopAll();
            return $("html, body").animate({
              scrollTop: 0
            }, "fast");
          }), 300);
        }
      });
    });
    return $("body").on("click", "#pagination a", function(e) {
      e.preventDefault();
      return $("#logTableContainer").load($(this).attr("href"), function() {
        return $("html, body").animate({
          scrollTop: 0
        }, "fast");
      });
    });
  });

  $(function() {
    return $(".confirm").click(function() {
      return confirm("Are you sure?");
    });
  });

  window.LiveLogs = (function() {
    LiveLogs.prototype.opts = {
      container: "#liveLogsContainer",
      filterContainer: "#liveLogsSearch",
      stackLimit: 2000
    };

    LiveLogs.prototype.container = null;

    LiveLogs.prototype.autoScroll = true;

    LiveLogs.prototype.messages = [];

    LiveLogs.prototype.filter = null;

    function LiveLogs() {
      this.escapeHtml = __bind(this.escapeHtml, this);
      this._filterMessage = __bind(this._filterMessage, this);
      this._filterAllMessages = __bind(this._filterAllMessages, this);
      this._filter = __bind(this._filter, this);
      this._detectAutoScroll = __bind(this._detectAutoScroll, this);
      this.setTheme = __bind(this.setTheme, this);
      this.container = $(this.opts.container);
      this.filterContainer = $(this.opts.filterContainer);
      this.setTheme($.cookie("livelogstheme"));
    }

    LiveLogs.prototype.init = function() {
      this.container.height($(window).height() - 36);
      $(window).resize((function(_this) {
        return function() {
          return _this.container.height($(window).height() - 36);
        };
      })(this));
      this.container.scroll(this._detectAutoScroll);
      PubSub.subscribe("log_message", (function(_this) {
        return function(type, data) {
          _this.messages.push(data);
          return _this.appendMessage(data.log_type, data.message);
        };
      })(this));
      return this.filterContainer.find("input.query").keyup(this._filter);
    };

    LiveLogs.prototype.appendMessage = function(type, message) {
      message = this.escapeHtml(message);
      if (this.filter) {
        message = this._filterMessage(message);
      }
      if (message) {
        this.container.append("<p><span class='type'>" + type + "</span><span class='message'>" + message + "</span></p>");
      }
      if (this.autoScroll) {
        return this.scrollToBottom();
      }
    };

    LiveLogs.prototype.clear = function() {
      this.container.html('');
      return this.messages = [];
    };

    LiveLogs.prototype.scrollToBottom = function() {
      return this.container.scrollTop(this.container.prop('scrollHeight'));
    };

    LiveLogs.prototype.switchTheme = function() {
      if (this.container.hasClass("dark")) {
        return this.setTheme("light");
      } else {
        return this.setTheme("dark");
      }
    };

    LiveLogs.prototype.setTheme = function(t) {
      if (t === "dark" || t === "light") {
        this.container.removeClass().addClass(t);
        return $.cookie("livelogstheme", t);
      }
    };

    LiveLogs.prototype._detectAutoScroll = function(e) {
      return this.autoScroll = (this.container.height() + this.container.scrollTop()) === this.container.prop('scrollHeight');
    };

    LiveLogs.prototype._filter = function(e) {
      var wait;
      wait = (function(_this) {
        return function() {
          _this.filter = $(e.target).val();
          return _this._filterAllMessages();
        };
      })(this);
      return setTimeout(wait, 500);
    };

    LiveLogs.prototype._filterAllMessages = function() {
      var data, _i, _len, _ref, _results;
      this.container.html('');
      _ref = this.messages;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        data = _ref[_i];
        _results.push(this.appendMessage(data.type, data.message));
      }
      return _results;
    };

    LiveLogs.prototype._filterMessage = function(text) {
      var re;
      re = new RegExp("(" + this.filter + ")", 'ig');
      if (text.match(re)) {
        return text.replace(re, '<span class="highlight">$1</span>');
      }
      return false;
    };

    LiveLogs.prototype.escapeHtml = function(unsafe) {
      return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };

    return LiveLogs;

  })();

  $(function() {
    return $("body").on("click", "a.view", function(e) {
      var el;
      e.preventDefault();
      el = this;
      $("#recordViewLabel").html($(this).data("type"));
      $("#recordViewDateTime").html($(this).data("datetime"));
      $("#viewRecordModal .btn-danger").unbind("click").click(function() {
        if (confirm("Are you sure want to delete this event?")) {
          return $.ajax({
            url: $(el).attr("href"),
            type: "DELETE",
            success: function() {
              $(".modal .close").click();
              return $(el).parents("tr").css("opacity", "0.2");
            },
            error: function() {
              return alert("Error: Record not deleted.");
            }
          });
        } else {
          return e.preventDefault();
        }
      });
      return $.getJSON($(this).attr("href"), function(data) {
        $(".modal-body").JSONView(data);
        return $("#viewRecordModal").modal();
      }).fail(function() {
        $(".modal-body").html("Error: Record not found or wrong JSON structure.");
        return $("#viewRecordModal").modal();
      });
    });
  });

  WSocket = (function() {
    function WSocket(apiKey) {
      this.apiKey = apiKey;
      this.ws = new WebSocket("ws://" + window.location.hostname + ":12345/ws");
      this.ws.onopen = ((function(_this) {
        return function() {
          return _this.register();
        };
      })(this));
      this.ws.onmessage = ((function(_this) {
        return function() {
          return _this.onMessage(event);
        };
      })(this));
    }

    WSocket.prototype.onMessage = function(event) {
      var data;
      data = JSON.parse(event.data);
      return PubSub.publish(data.type, data);
    };

    WSocket.prototype.register = function() {
      this.ws.send(this.apiKey);
      return console.log("registered user " + this.apiKey);
    };

    return WSocket;

  })();

  $(function() {
    return new WSocket(options.apiKey);
  });

}).call(this);
