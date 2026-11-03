"""Causal lower-face stabilization without retaining frames for playback."""
import cv2
import numpy as np


class FaceStabilizer:
    def __init__(self, strength=0.22):
        self.strength = float(np.clip(strength, 0.0, 0.35))
        self.previous = None
        self.index = None
        self.mask = None

    def reset(self):
        self.previous = None
        self.index = None

    def process(self, index, frame):
        if self.strength <= 0:
            return frame
        low = cv2.GaussianBlur(frame.astype(np.float32), (0, 0), 1.2)
        previous = self.previous
        contiguous = self.index is not None and index == self.index + 1
        self.previous = low
        self.index = index
        if not contiguous or previous is None or previous.shape != low.shape:
            return frame
        h, w = frame.shape[:2]
        if self.mask is None or self.mask.shape[:2] != (h, w):
            y, x = np.mgrid[0:h, 0:w].astype(np.float32)
            # Leave eyes/upper face untouched and taper across cheeks/chin.
            mask = np.exp(-2.0 * (((x/w-.5)/.37)**2 + ((y/h-.74)/.20)**2))
            mask[y/h < .5] = 0
            self.mask = mask[..., None]
        movement = float(np.mean(abs(low[h//2:]-previous[h//2:])))
        # Preserve fast, genuine phonetic changes. Only the broad component
        # is stabilized; current-frame teeth and lip edge detail stay sharp.
        strength = self.strength * min(1.0, 4.0/max(4.0, movement))
        result = frame.astype(np.float32) + self.mask * strength * (previous-low)
        return np.clip(np.rint(result), 0, 255).astype(np.uint8)


def overlap_length(pending, start, total):
    """Use the previous segment's actual lookahead, including final tails."""
    count = 0
    while count < total and start + count in pending:
        count += 1
    return count
