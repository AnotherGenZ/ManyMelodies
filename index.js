const VoiceConnectionManager = require('./src/VoiceConnectionManager');

function ManyMelodies(...args) {
    return new VoiceConnectionManager(...args);
}

module.exports = ManyMelodies;
