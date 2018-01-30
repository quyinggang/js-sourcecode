var readline = require('readline');
var rl;

var sequence = "⣾⣽⣻⢿⡿⣟⣯⣷".split("");
function spinner() {
  this.index = 0;
  this.current = sequence[this.index % sequence.length];
  this.next = function() {
    this.index++;
    this.current = sequence[this.index % sequence.length];
  }
}
var spin = new spinner();
function load(text, opts) {
  this.text = text;
  this.int = setInterval(function() {
    rl.clearLine();
    readline.moveCursor(rl, 0, -1);
    rl.write("    \x1b[36m" + spin.current + "\x1b[0m " + text + " ");
    spin.next();
  }, 100);
}

load.prototype.done = function(cb) {
  var self = this;
  setTimeout(function() {
    clearInterval(self.int);
    rl.clearLine();
    readline.moveCursor(rl, 0, -1);
    rl.write("    \x1b[32m" + "✓" + "\x1b[0m " + self.text + " \n");
    cb();
  }, 1000);
}
// Expose loader
module.exports = load;
module.exports.defineRl = (instance) => {
  rl = instance;
}
