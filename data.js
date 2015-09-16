var request = require('request')
  , redis = require('redis')
  , lodash = require('lodash');

var c = redis.createClient();

module.exports = {
  users: function(cb) {
    var key = "kobayashi_users"
    c.get(key, function(err, data) {
      if (err)
        throw err;
      if (data !== null) {
        console.log("Serving users from redis");
        data = JSON.parse(data);
        return cb(data);
      }

      console.log("Requesting users from API");
      request("https://please-deny.me/api/v0/users", function(err, res, body) {
        if (err) return bot.say(to, "Error: " + err.message)
        var data = {};

        data.users = JSON.parse(body);
        data.doms = lodash.where(data.users, {is_dom: true});
        data.doms_active = lodash.where(data.doms, {is_active_dom: true});
        data.subs = lodash.where(data.users, {is_sub: true});
        data.subs_active = lodash.where(data.subs, {is_eligible: true});
        data.round_ratio = Math.round(data.subs_active.length / data.doms_active.length * 100) / 100;

        c.set(key, JSON.stringify(data));
        c.expire(key, 180);

        cb(data);
      })
    });
  },
  round: function(cb) {
    var key = "kobayashi_round"
    c.get(key, function(err, data) {
      if (err)
        throw err;
      if (data !== null) {
        console.log("Serving round from redis");
        data = JSON.parse(data);
        return cb(data);
      }

      console.log("Requesting round from API");
      request("https://please-deny.me/api/v0/round_status", function(err, res, body) {
        if (err) return bot.say(to, "Error: " + err.message)
        var data = {};

        data = JSON.parse(body);
        c.set(key, JSON.stringify(data));
        c.expire(key, 180);

        cb(data);
      })
    });
  },
  chan: function(chan, board, cb) {
    var key = chan + "_" + board;
    c.get(key, function(err, data) {
      if (err)
        throw err;
      if (data !== null) {
        console.log("Serving " + chan + "_" + board + " from redis");
        data = JSON.parse(data);
        return cb(data);
      }

      console.log("Requesting " + chan + "_" + board + " from API");
      var baseUri = (chan === "8ch" ? "https://8ch.co/" : "https://a.4cdn.org/");
      request(baseUri + "/" + board + "/catalog.json", function(err, res, body) {
        if (err) return bot.say(to, "Error: " + err.message)
        var data = {};

        data = JSON.parse(body);
        c.set(key, JSON.stringify(data));
        c.expire(key, 1800);

        cb(data);
      })
    });
  }
}