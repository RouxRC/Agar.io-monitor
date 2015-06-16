var colors = require('colors');
var Bot = require('./bot.js');
var Utils = require('./utils.js'),
    fn = new Utils();

var server = process.argv[2],
    max_bots = parseInt(process.argv[3]) || 15,
    spawn_timeout = process.argv[4] || 15;
    leader = process.argv[5];
if(server && !/^ws:\/\/(\d{1,3}\.){3}\d{1,3}:\d\d+$/.test(server))
  return console.log('Wrong server IP:', server);

var bots = [new Bot(server, leader)];

var monitorMap = function() {
    if (!bots[0].leaders_loaded) return setTimeout(monitorMap, 200);
    var screen = [],
        players = {},
        leadids = [];

    bots.filter(function(bot){
        return bot.leaders_loaded && bots[0].leaders_loaded && bots[0].client.leaders[0] == bot.client.leaders[0];
    }).forEach(function(bot){
        Object.keys(bot.client.balls).forEach(function(bid){
            var b = bot.client.balls[bid];
            if (!b.color || fn.scorize(b.size) < 10) return;
            var id = fn.idize(b);
            if (!players[id]) players[id] = {
                id: id,
                name: fn.namize(b),
                balls: {},
                virus: b.virus,
                balls_destroyed: []
            };
            players[id].color = players[id].color || b.color;
            if (b.destroyed) {
                if (players[id].balls_destroyed.indexOf(b.id) == -1)
                    players[id].balls_destroyed.push(b.id);
                if (players[id].balls[b.id])
                    delete players[id].balls_destroyed.balls[b.id];
            } else if (players[id].balls_destroyed.indexOf(b.id) == -1 && (!players[id].balls[b.id] || (!players[id].balls[b.id].visible && b.last_update > players[id].balls[b.id].last_update))) {
                players[id].balls[b.id] = b;
            }
        });
    });
    
    bots[0].client.leaders.forEach(function(l){
        if (!bots[0].client.balls[l]) {
            return screen.push("");
        }
        var n = fn.idize(bots[0].client.balls[l]);
        leadids.push(n);
        screen.push({ name: fn.namize(bots[0].client.balls[l]) });
    });
    screen.push("");

    function rev(a,b) { return b - a; }

    var viruses = [[], []],
        sorted = Object.keys(players)
    .map(function(a){
        var b = players[a];
        b.score = 0;
        b.score_hid = 0;
        b.balls_vis = [];
        b.balls_hid = [];
        Object.keys(b.balls).forEach(function(ba_id){
            ba = b.balls[ba_id]
            var s = fn.scorize(ba.size);
            if (ba.visible) {
                b.score += s;
                b.balls_vis.push(s);
            } else {
                b.score_hid += s;
                b.balls_hid.push(s);
            }
        });
        b.balls_vis = b.balls_vis.sort(rev);
        b.balls_hid = b.balls_hid.sort(rev);
        return b;
    }).sort(function(a, b){
        return (b.score - a.score) || (a.balls_vis.length - b.balls_vis.length) || (b.score_hid - a.score_hid) || (a.balls_hid.length - b.balls_hid.length);
    }).forEach(function(b){
        if (b.virus) {
            viruses = [b.balls_vis, b.balls_hid];
            return;
        }
        var idx = leadids.indexOf(b.id);
        if (idx == -1) {
            idx = screen.length;
            screen.push({ name: b.name });
        }
        screen[idx].color = b.color;
        screen[idx].score = b.score;
        screen[idx].score_hid = b.score_hid;
        screen[idx].balls = b.balls_vis.length;
        screen[idx].balls_hid = b.balls_hid.length;
        screen[idx].visible = (screen[idx].balls > 0);
    });

    var nplay = Object.keys(screen).length,
        nvisi = screen.filter(function(a){return a.visible; }).length,
        conbots = bots.filter(function(a){return a.leaders_loaded}).length,
        totbots = bots.length;
    console.log('\033[2J');
    console.log("          ---------------------".green);
    console.log("          |  AGAR.io MONITOR  |".green);
    console.log("          ---------------------".green);
    console.log("");
    console.log(("Connected to " + bots[0].server).blue);
    console.log((nplay + " players seen (" + nvisi + " visible)").blue + ("\t\tbots: " + conbots + "/" + totbots).blue + " bot0" + (bots[0].leaders_loaded? "":"dis")+"connected");
    console.log("");
    while (screen.length <= 30) screen.push("");
    console.log(screen.slice(0, 32).map(function(a, i){
        if (!a) return "";
        return [
            fmt(i < 10 ? "#"+(i+1) : "-")[a.visible ? "green" : "red"],
            fmt(a.name, 3)[a.visible ? "green" : "red"],
            fmt(a.color, 2),
            fmt(a.score),
            fmt(a.balls),
            fmt((a.balls_hid ? a.balls_hid+ "("+a.score_hid+")" : ""), 2).red
        ].join("");
    }).join("\n"));
    console.log("");
    console.log(("Viruses:\t" + viruses[0].join(" ")).green + "\t" + viruses[1].join(" ").red);
    console.log(("Bots:\t" + bots.map(function(a,i ){return i+"_"+a.leaders_loaded+":"+a.failed_conns + "/" + a.lost_conns;}).join(" | ")).blue)
    return setTimeout(monitorMap, 500);
}

function fmt(s, tabs) {
    tabs = tabs || 1;
    if (!s) return "n/a".red+Array(tabs+1).join("\t");
    s = s.toString();
    var spaces = 8 * tabs - 1;
    if (s.length > spaces) return s.slice(0, spaces - 1) + " ";
    return s + Array(2 + parseInt((spaces - s.length)/8)).join("\t");
}

bots[0].start(true);
bots[0].client.on('connected', monitorMap);
var count = 0;
var itv = setInterval(function(){
    if (!bots[count].leaders_loaded) return;
    count++;
    bots.push(new Bot(server));
    bots[count].bot0 = bots[0];
    bots[count].start();
    if (count > max_bots - 2) return clearInterval(itv);
}, spawn_timeout * 1000);

process.on('SIGINT', function() {
    process.exit();
});

