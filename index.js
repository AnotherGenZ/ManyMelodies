const VoiceConnectionManager = require('./src/VoiceConnectionManager');

function ManyMelodies(...args) {
    return new VoiceConnectionManager(...args);
}

ManyMelodies.SharedStream = require('./src/SharedStream');
ManyMelodies.VoiceConnectionManager = VoiceConnectionManager;
ManyMelodies.VoiceConnection = require('./src/VoiceConnection');


module.exports = ManyMelodies;
