/** Sustained microphone activity while the assistant is speaking. */
export class SpeechInterruptor {
    constructor(onInterrupt, now = () => performance.now()) {
        this.onInterrupt = onInterrupt;
        this.now = now;
        this.noise = 0.003;
        this.speechSince = null;
        this.active = false;
        this.pending = false;
        this.until = 0;
    }

    // Compare short waveforms at 4 kHz, scanning recent loudspeaker output
    // to tolerate capture/playback clock skew and acoustic delay.
    matchesPlayback(mic, micRate, output, outputRate) {
        const reduce = (samples, rate) => {
            const step = rate / 4000;
            const reduced = new Float32Array(Math.floor(samples.length / step));
            for (let i = 0; i < reduced.length; i++) {
                const end = Math.floor((i + 1) * step);
                const start = Math.floor(i * step);
                let sum = 0;
                for (let j = start; j < end; j++) sum += samples[j];
                reduced[i] = sum / (end - start);
            }
            return reduced;
        };
        const input = reduce(mic, micRate);
        const ref = reduce(output, outputRate);
        const energy = input.reduce((sum, s) => sum + s * s, 0);
        if (energy < 1e-6 || input.length < 64) return false;
        let refEnergy = 0;
        for (let i = 0; i < input.length; i++) refEnergy += ref[i] * ref[i];
        for (let pos = 0; pos + input.length <= ref.length; pos++) {
            if (refEnergy > 1e-5) {
                let dot = 0;
                for (let i = 0; i < input.length; i++) dot += input[i] * ref[pos + i];
                if (dot * dot > 0.36 * energy * refEnergy) return true;
            }
            const next = ref[pos + input.length] || 0;
            refEnergy += next * next - ref[pos] * ref[pos];
        }
        return false;
    }

    // Voiced syllables have a periodic component and a changing envelope.
    // Stationary fans, tones and isolated transients need neither trigger a flush
    // nor reach the server as a new user utterance.
    hasVoicing(mic, rate) {
        const step = Math.max(1, Math.round(rate / 4000));
        const limit = Math.floor(mic.length / step);
        for (let lag = 9; lag <= 50 && lag < limit / 2; lag++) {
            let dot = 0, a = 0, b = 0;
            for (let i = lag; i < limit; i++) {
                const x = mic[i * step], y = mic[(i - lag) * step];
                dot += x * y;
                a += x * x;
                b += y * y;
            }
            if (dot > 0 && dot * dot > 0.36 * a * b) return true;
        }
        return false;
    }

    update(rms, speaking, muted = false, echo = false, mic = null, rate = 16000) {
        const now = this.now();
        if (muted) {
            this.active = this.pending = false;
            this.until = 0;
            this.speechSince = null;
            return;
        }
        if (!speaking && !this.active) {
            const rate = rms < this.noise ? 0.10 : 0.008;
            this.noise += rate * (Math.min(rms, 0.04) - this.noise);
            this.speechSince = null;
            return;
        }
        const threshold = Math.max(0.020, this.noise * 2.7);
        if (echo) {
            this.speechSince = null;
        } else if (rms >= threshold) {
            if (this.speechSince === null) {
                this.speechSince = now;
                this.voiceFrames = 0;
                this.low = this.high = rms;
            }
            this.lastAbove = now;
            this.low = Math.min(this.low, rms);
            this.high = Math.max(this.high, rms);
            if (mic && this.hasVoicing(mic, rate)) this.voiceFrames++;
            const speechLike = !mic || (this.voiceFrames >= 3 && this.high >= this.low * 1.2);
            if (!this.active && speechLike && now - this.speechSince >= 320) this.trigger();
            if (this.active) this.until = now + 550;
        } else if (now - this.lastAbove > 96) {
            this.speechSince = null;
        }
        if (this.active && now >= this.until) this.active = false;
    }

    trigger() {
        this.active = true;
        this.pending = true;
        this.until = this.now() + 550;
        this.onInterrupt();
    }

    forceListen() {
        const force = this.pending || (this.active && this.now() < this.until);
        this.pending = false;
        return force;
    }
}
