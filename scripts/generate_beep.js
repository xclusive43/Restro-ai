const fs = require('fs');

// A valid minimal 44.1kHz 16-bit mono WAV file with a short 440Hz beep
const sampleRate = 44100;
const duration = 0.2; // seconds
const numSamples = Math.floor(sampleRate * duration);

const buffer = Buffer.alloc(44 + numSamples * 2);

// RIFF header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + numSamples * 2, 4);
buffer.write('WAVE', 8);

// fmt chunk
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // Subchunk1Size
buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
buffer.writeUInt16LE(1, 22); // NumChannels
buffer.writeUInt32LE(sampleRate, 24); // SampleRate
buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
buffer.writeUInt16LE(2, 32); // BlockAlign
buffer.writeUInt16LE(16, 34); // BitsPerSample

// data chunk
buffer.write('data', 36);
buffer.writeUInt32LE(numSamples * 2, 40); // Subchunk2Size

// generate sine wave (440 Hz)
const freq = 440;
for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * freq * t);
    const val = Math.floor(sample * 32767);
    buffer.writeInt16LE(val, 44 + i * 2);
}

fs.writeFileSync('public/sounds/served.wav', buffer);
console.log('Successfully generated served.wav!');
