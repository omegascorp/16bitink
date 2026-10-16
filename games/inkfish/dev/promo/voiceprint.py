# Dev helper: a rough "voiceprint" of narration takes, to catch the narrator's
# voice drifting from the one used in the published shorts.
#   python3 games/inkfish/dev/promo/voiceprint.py <file.mp3> ...
# Prints the median pitch (F0), the pitch range (90th - 10th percentile) and the
# median spectral centroid (brightness). Reference values are in
# docs/shorts-playbook.md ("The narrator's voice").
import sys, subprocess, numpy as np
def load(p):
    raw=subprocess.run(['ffmpeg','-v','error','-i',p,'-ac','1','-ar','16000','-f','s16le','-'],capture_output=True).stdout
    return np.frombuffer(raw,dtype=np.int16).astype(np.float32)/32768
def f0s(x,sr=16000,win=1024,hop=256):
    out=[];cent=[]
    for i in range(0,len(x)-win,hop):
        fr=x[i:i+win]*np.hanning(win)
        if np.sqrt((fr**2).mean())<0.01: continue
        ac=np.correlate(fr,fr,'full')[win-1:]
        lo,hi=int(sr/300),int(sr/70)
        k=lo+np.argmax(ac[lo:hi])
        if ac[k]>0.4*ac[0]: out.append(sr/k)
        sp=np.abs(np.fft.rfft(fr));fq=np.fft.rfftfreq(win,1/sr)
        cent.append((sp*fq).sum()/sp.sum())
    return np.array(out),np.array(cent)
for p in sys.argv[1:]:
    f,c=f0s(load(p))
    print(f"{p.split('/')[-2] if 'voice.mp3' in p else p.split('/')[-1]:28s} F0 median {np.median(f):6.1f} Hz  F0 spread(p90-p10) {np.percentile(f,90)-np.percentile(f,10):6.1f}  centroid {np.median(c):6.0f} Hz")
