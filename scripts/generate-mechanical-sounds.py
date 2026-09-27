"""Generate small, original mono mechanical effects; no runtime synthesis needed."""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 24000
random.seed(17)
folder = Path(__file__).resolve().parents[1] / 'assets/sounds'

def write(name, duration, sample):
    with wave.open(str(folder / name), 'wb') as output:
        output.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        output.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, sample(i / RATE))) * 26000)) for i in range(int(RATE * duration))))

def rolling(t):
    # Integer cycles keep the two-second loop seamless; small gear teeth over a low rumble.
    tooth = t % .05
    return (.12 * math.sin(2 * math.pi * 72 * t) + .07 * math.sin(2 * math.pi * 143 * t)
            + .24 * math.exp(-tooth * 180) * math.sin(2 * math.pi * 1450 * tooth)) * (.85 + .15 * math.cos(2 * math.pi * 3 * t))

def creak(t):
    envelope = math.sin(math.pi * t / .65) ** 2
    phase = 2 * math.pi * (180 * t + 120 * t * t + .8 * math.sin(2 * math.pi * 7 * t))
    return envelope * (.3 * math.sin(phase) + .12 * math.sin(phase * 3) + .045 * random.uniform(-1, 1))

def landing(t):
    hit = .55 * math.exp(-t * 32) * math.sin(2 * math.pi * 105 * t)
    click = .3 * math.exp(-t * 100) * random.uniform(-1, 1)
    ring = .15 * math.exp(-t * 19) * math.sin(2 * math.pi * 780 * t)
    latch = 0 if t < .065 else .2 * math.exp(-(t - .065) * 90) * math.sin(2 * math.pi * 410 * (t - .065))
    return (hit + click + ring + latch) * min(1, t * 1500) * min(1, (.32 - t) * 100)

write('reel-spin.wav', 2, rolling)
write('lever-creak.wav', .65, creak)
write('reel-stop.wav', .32, landing)
