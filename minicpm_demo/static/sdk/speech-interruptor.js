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

    update(rms, speaking, muted = false) {
        const now = this.now();
        if (muted) {
            this.speechSince = null;
            return;
        }
        if (!speaking && !this.active) {
            if (rms < Math.max(0.007, this.noise * 1.8)) {
                this.noise = 0.98 * this.noise + 0.02 * rms;
            }
            this.speechSince = null;
            return;
        }
        const threshold = Math.max(0.014, Math.min(0.045, this.noise * 3.5));
        if (rms >= threshold) {
            if (this.speechSince === null) this.speechSince = now;
            if (!this.active && now - this.speechSince >= 180) this.trigger();
            if (this.active) this.until = now + 550;
        } else {
            this.speechSince = null;
            if (this.active && now >= this.until) this.active = false;
        }
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
