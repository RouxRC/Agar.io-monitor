var AgarioClient = require('agario-client'),
    Utils = require('./utils.js'),
    fn = new Utils();
AgarioClient.prototype.debug = 0;

function Bot(server, leader, timeout) {
    this.server = server || "ws://151.80.98.56:1505";
    this.leader = leader || "";
    this.timeout = timeout || 2000;
    this.failed_conns = 0;
    this.lost_conns = 0;

    this.leaders_loaded = false;
    this.bot0 = null;

    this.client = new AgarioClient('worker');
    this.client.parent = this;
    this.client.inactive_destroy = 30000;
    this.client.inactive_check = 5000;

    this.client.on('leaderBoardUpdate', function(old, leaders){
        if (!this.balls || this.parent.leaders_loaded) return;
        if ((this.parent.leader && this.parent.leader != fn.namize(this.balls[leaders[0]]) && this.parent.leader != leaders[0]) ||
          ( this.parent.bot0 && this.parent.bot0.client.leaders[0] != leaders[0])) {
            console.log("TESTE", this.parent.leader, this.parent.bot0.client.leaders[0], this.balls[leaders[0]].name, leaders[0])
            this.parent.leaders_loaded = false;
            this.parent.failed_conns += 1;
            this.disconnect();
        } else {
            if (this.parent.spectate) this.spectate();
            else this.spawn('W for team');
            this.parent.leaders_loaded = true;
        }
    });

    this.client.on('disconnect', function(){
        if (!this.parent.bot0 && this.leaders_loaded) {
            this.parent.leader = fn.namize(this.leaders[0]);
        }
        this.parent.leaders_loaded = false;
        console.log("RECONNECT", this.parent.leader, fn.namize(this.balls[this.leaders[0]]));
        this.parent.reconnect();
    });

    this.client.on('connectionError', function(e){
        this.parent.leaders_loaded = false;
        this.parent.lost_conns += 1;
        console.log('Connection failed with reason: ' + e);
        if (/ECONNREFUSED/.test(e)) {
            var _self = this.parent;
            setTimeout(function(){ _self.start(_self.spectate); }, 45000);
        }
    });

    this.client.on('ballDisppear', function(ball_id){
        var mergeable = false,
            balls = this.balls,
            ball = balls[ball_id];
        if (!this.parent.leaders_loaded || !ball || ball.virus || ball.destroyed || fn.scorize(ball.size) < 10) return;
        var mix = 100000, max = 0, miy = 100000, may = 0;
        Object.keys(balls).forEach(function(bid){
            b = balls[bid];
            if (!b.visible) return;
            if (b.id != ball_id && fn.idize(b) == fn.idize(ball))
                mergeable = true;
            mix = Math.min(mix, b.x);
            miy = Math.min(miy, b.y);
            max = Math.max(max, b.x);
            may = Math.max(may, b.y);
        });
        if (mergeable && ball.x > mix+50 && ball.x < max-50 && ball.y > miy+50 && ball.y < may-50) {
            ball.destroy({'reason': 'merge'});
        }
    });
}

Bot.prototype = {
    start: function(spectate) {
        this.spectate = !!(spectate) || this.spectate;
        console.log('Connecting ' + (spectate ? "as spectator ": "") + 'to ' + this.server);
        this.client.connect(this.server);
    },
    reconnect: function() {
        this.client.disconnect();
        var _self = this;
        setTimeout(function(){ _self.start(_self.spectate); }, this.timeout);
    },
    getLeader: function(){
        return fn.namize(this.client.balls[this.client.leaders[0]]);
    },
};
 
module.exports = Bot;

