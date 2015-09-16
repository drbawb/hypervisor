var irc = require('irc')
  , moment = require('moment')
  , request = require('request')
  , fs = require('fs')
  , nconf = require('nconf')
  , lodash = require('lodash');

require('moment-duration-format');

nconf.argv().env().file(__dirname + "/config.json");

var data = require('./data');

var pkg = JSON.parse(fs.readFileSync(__dirname + "/package.json"));

console.dir(nconf.get("irc:debug"))

var clientOptions = {
  userName: nconf.get("irc:userName"),
  realName: nconf.get("irc:realName"),
  port: nconf.get("irc:port"),
  secure: nconf.get("irc:secure"),
  selfSigned: nconf.get("irc:selfSigned"),
  debug: nconf.get("irc:debug")
};

var bot = new irc.Client("irc.rizon.net", nconf.get("irc:nick"), clientOptions);

bot.on('motd', function(motd) {
  bot.join("#hypervisor");
})

bot.on('notice', function(nick, to, text, message) {
  if (nick && nick.toLowerCase() === "nickserv" && message.args[1].indexOf("NickServ IDENTIFY") !== -1) {
    bot.say("NickServ", "identify " + nconf.get("irc:nspassword"));
  }
})

bot.addListener("message#", function(from, to, text, message) {
  var argv = message.args[1].split(" ");
  if (argv[0] === "!round") {
    data.round(function(round) {
      if (!round.current_round) {
        return bot.say(to, "No active round");
      }
      var roundEnd = moment(round.current_round.ends_at);

      var diffSeconds = moment(roundEnd).diff(moment(), "seconds");
      var tillRoundEnds = moment.duration(diffSeconds, "seconds")
      var tillRoundEndsF = tillRoundEnds.format("d [days], h [hours], m [minutes], s [seconds]");

      var output = "Current round ends " + tillRoundEnds.humanize() + " (" + tillRoundEndsF + ")";

      bot.say(to, output);
    })
  } else if (argv[0] === "!roll" || argv[0] === "!r") {
    if (argv[1].indexOf("d") === -1) {
      bot.say(to, "Syntax: !roll [rolls]d<sides>")
    } else {
      var parts = argv[1].split("d");
      var rolls = parseInt(parts[0]) || 1;
      var sides = parseInt(parts[1]);

      if (typeof rolls !== "number" && typeof sides !== "number") {
        return bot.say(to, "Invalid Sytax");
      }

      if (sides === 1) {
        return bot.say(to, "We sadly don't have a moebius strip around here, " + from);
      }

      if (rolls > 64) {
        return bot.say(to, "What would you do with so many numbers, " + from);
      }

      if (sides > 128 && sides < 1) {
        return bot.say(to, "That wouldn't fit on a dice, " + from);
      }

      var numbers = []
      var total = 0;

      for (var i = 0; i < rolls; i++) {
        var rand = Math.floor(Math.random() * sides) + 1
        numbers.push(rand);
        total += rand;
      }

      var avg = total / rolls;

      bot.say(to, from + " rolls " + numbers.join(", ") + " /" + rolls + "d" + sides + "/ sum " + total + "/ avg " + avg + "");
    }
  } else if (argv[0] == "!stats") {
    data.users(function(data) {
      if (data.doms_active.length > 0) {
        bot.say(to, data.doms_active.length + " doms / " +  data.subs_active.length + " subs / ratio " + data.round_ratio );
      } else {
        bot.say(to, "No active doms, are we in signup phase yet?");
      }
    });
  } else if (argv[0] === "!version" || argv[0] === "!v") {
    var output = pkg.name + " v" + pkg.version + " (node " + process.version + " on " + process.platform + "-" + process.arch + ")";
    bot.say(to, output);
  } else if (text.indexOf("!") === 0) {
    bot.say(to, "I don't understand that command.");
  }
});

