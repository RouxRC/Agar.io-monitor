function Utils() {
    this.scorize = function(size){
        return parseInt(Math.pow(size/10, 2));
    };

    this.namize = function(ball){
        if (!ball) return "";
        return ball.virus ? "virus" : (ball.name || "unnamed");
    };

    this.idize = function(b){
        return this.namize(b) + b.color;
    };
}

module.exports = Utils;

