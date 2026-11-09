from PIL import Image
import sys
def down(im, s):
    w,h=im.size; nw,nh=round(w*s),round(h*s)
    # premultiplied resize
    px=im.load(); pm=Image.new('RGBA',im.size)
    p2=pm.load()
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]; p2[x,y]=(r*a//255,g*a//255,b*a//255,a)
    r=pm.resize((nw,nh),Image.BOX)
    ro=r.load(); out=Image.new('RGBA',(nw,nh)); o=out.load()
    for y in range(nh):
        for x in range(nw):
            R,G,B,A=ro[x,y]
            if A>=128: o[x,y]=(min(255,R*255//A),min(255,G*255//A),min(255,B*255//A),255)
    return out
for n,s in (('paser',0.7),('sethi',0.68)):
    im=Image.open(f'src/hero_{n}.png').convert('RGBA'); d=down(im,s)
    nf=Image.open('src/hero_neferet.png').convert('RGBA')
    m=Image.new('RGBA',(520,230),(120,140,110,255)); m.alpha_composite(d,(0,230-d.height)); m.alpha_composite(nf,(200,230-nf.height)); m.alpha_composite(im.resize((im.width//2,im.height//2),Image.NEAREST),(370,230-im.height//2))
    m=m.resize((m.width*2,m.height*2),Image.NEAREST); m.save(f'cand8/_s_{n}.png')
