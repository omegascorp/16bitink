# helper: python3 addunits.py  (adds/overwrites the part-5 entries in units.json)
import json
d=json.load(open('units.json'))
d['units']['cobra']={"name":"Spitting Cobra","src":"pixel/src/cobra.png","canvas":[104,112],"foot":6,"dx":-6,
 "subject":"a reared sand-brown desert cobra with a spread hood",
 "walk":"slithering in place loop: the coiled body shifts and glides in rhythm, the raised hood sways side to side, stays in the same spot, ends back at the starting pose",
 "attack":"spitting attack: the cobra rears back, then snaps its head forward to the right with the mouth wide open and spits venom, then settles back to the starting pose",
 "strike":3,"face":[70,30],"shot":[78,34]}
d['units']['lion']={"name":"Desert Lion","src":"pixel/src/lion.png","canvas":[160,112],"foot":6,"dx":-6,
 "subject":"a big tawny desert lion with a thick dark mane",
 "walk":"prowling in place loop: four legs stride in rhythm, head low, tail swings, stays in the same spot, ends back at the starting pose",
 "attack":"pounce attack: crouches, lunges forward to the right with a roar and claws out, swipes, then settles back to the starting pose",
 "strike":3,"face":[112,30]}
d['heroes']['paser']={"name":"Paser","src":"pixel/src/hero_paser.png","canvas":[176,172],"foot":6,"dx":0,
 "subject":"an egyptian chariot captain in a blue and gold war crown and scale armor with a khopesh sword, on a bay horse",
 "walk":"galloping in place loop: the horse gallops, the rider sways with the stride, stays in the same spot, ends back at the starting pose",
 "attack":"sword attack: the rider swings the sword up and across in a slash to the right, then lowers it to the starting pose; the horse stays in place",
 "strike":3,"face":[80,30]}
open('units.json','w').write(json.dumps(d,indent=1)+'\n')
