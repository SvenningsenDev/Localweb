class Logger {
  constructor() {
    this.debugMode = true;
  }

  debug(...messages) {
    if (this.debugMode) {
        console.log('DEBUG:', ...messages);
    }
  }
}
  
  module.exports = new Logger();