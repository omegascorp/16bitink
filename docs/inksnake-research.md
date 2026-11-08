# InkSnake: research

Research for InkSnake, October 2026, in two parts: what the game takes from other snake games, and the real snakes and enemies behind each chapter. The game itself is in [inksnake-design.md](inksnake-design.md). Facts marked *(unverified)* come from memory, not from a source read during the research.

## Games

Nine snake games (and two from outside the genre), and what InkSnake takes from each.

| # | Game | Growth model | Standout mechanic | Taken into InkSnake |
|---|---|---|---|---|
| 1 | **Snake** (Nokia 6110, 1997; Taneli Armanto) | One segment per meal, on a grid | Always moving forward; your own body is the obstacle | ✅ Always moving, ✅ own body is the danger; ✗ grid (we steer freely) |
| 2 | **Snake II** (Nokia 7110, 1998; again on the 3310, 2000) and **Snake '97** (retro app by dsd164, date not found) | Same | Snake II added mazes, bonus "bugs" for extra points, and edges that wrap round. Snake '97 copies seven Nokia versions, dot-matrix screen and all | ✅ Walls inside the board, ✅ bonus prey that leaves soon; ✗ wrap-round edges (ours are solid) |
| 3 | **Slither.io** (Steve Howse, browser and iOS, March 25, 2016) | Mass from pellets; dead snakes turn into big pellets | **Boost** costs mass and leaves a pellet trail. A snake dies when its head hits another body, so big snakes **encircle** small ones in a tightening loop | ✅ Free steering, ✅ encircling becomes the **coil**; ✅ boost becomes the **strike** (a cooldown, no length lost) |
| 4 | **Snake.io** (Kooapps, App Store, April 21, 2016) | Slither.io's model | Slither.io for phones, short sessions | ⏳ Arena mode, if ever; ✗ ad-driven loop |
| 5 | **Snake Rivals** (Supersolid; live by December 2019) and the many **Hungry Snake** apps (no single original found) | Pellets; up to 50 players | Battle royale, plus Gold Rush: grab the most gold in 3 minutes | ✅ Rush goal (grow before the clock runs out); ✗ PvP |
| 6 | **Snakebird** (Noumenon Games, PC, May 4, 2015) | Fruit adds one segment | Snake rules with **gravity**: the body is your platform. 53 hard levels on a map | ✅ A body shape that matters (the coil loop); ✗ gravity puzzles |
| 7 | **Snake Pass** (Sumo Digital, March 28, 2017) | None | **Physics climbing**: coil tightly round a pole to grip, then spiral up | ✅ Wrapping round something is the action (coil to squeeze); ✗ 3D physics |
| 8 | **Pac-Man** (Namco, 1980) *(year unverified)* | Not a growth game | Four ghosts with readable rules: Blinky chases, Pinky aims ahead, Inky works off Blinky, Clyde backs off when close. Scatter and chase phases | ✅ One readable rule per enemy kind (diver, pouncer, chaser…), ✅ hunters that back off when scared |
| 9 | **Feeding Frenzy** (Sprout Games / PopCap, 2004) | Meter fills; growth spurts | The moment a former threat becomes food; frenzy multiplier | ✅ **Gape** grows with length, so prey once too big gets swallowed later; ⏳ combo multiplier |

**Lessons**

1. Keep Nokia's two rules untouched: you never stop, and your body is the obstacle. Everything else is added on top.
2. Slither.io's encircle is the most famous move in the genre. Ours turns it from a kill into a hunt (coil round prey), which a snake really does.
3. Every enemy needs a rule a player can read in two seconds, as Pac-Man's ghosts do.
4. No PvP, no wrap-round, no grid. The new thing in every trailer is the real animal: the lump going down, the coil, the play-dead.

Sources: [Nokia history: Snake](https://blogs.windows.com/devices/2009/01/20/history-of-nokia-part-2-snake/), [Snake II (Wikipedia)](https://en.wikipedia.org/wiki/Snake_II), [Snake '97 (App Store)](https://apps.apple.com/us/app/snake-97-retro-phone-classic/id438052745), [Slither.io (Wikipedia)](https://en.wikipedia.org/wiki/Slither.io), [Snake.io (App Store)](https://apps.apple.com/app/1104692136), [Snake Rivals (God is a Geek, Dec 2019)](https://godisageek.com/2019/12/christmas-is-coming-to-free-to-play-game-snake-rivals/), [Snake Rivals (GuruGamer)](https://gurugamer.com/mobile-games/battle-royale-snake-game-snake-rivals-out-now-for-mobile-7333/amp), [Snakebird (Wikipedia)](https://en.wikipedia.org/wiki/Snakebird_(video_game)), [Snake Pass (Nintendo World Report)](https://nintendoworldreport.com/preview/44260), [The Pac-Man Dossier](https://www.gamedeveloper.com/game-platforms/feature-the-i-pac-man-i-dossier), [Feeding Frenzy (Wikipedia)](https://en.wikipedia.org/wiki/Feeding_Frenzy_(video_game)).

## Snakes

One snake per chapter. Metric first, US units after.

### 1. Corn snake (*Pantherophis guttatus*): The Farm

| | |
|---|---|
| Length | Most adults 76–122 cm (2.5–4 ft); record 188 cm (6.2 ft). Hatchlings 20–30 cm (8–12 in) |
| Lifespan | No good wild data; captive record just over 32 years |
| Range & habitat | Southeastern US, southern New Jersey to the Florida Keys, west to Louisiana. Open pine woods, old fields, hardwood hammocks, farm edges; often round barns and sheds, where the rodents are |
| Prey | Over half rodents (cotton rats, white-footed mice); also birds, bird eggs (raids quail and songbird nests), bats; young ones eat frogs and lizards. Kills by constriction; small prey is often swallowed alive |
| Predators | Kingsnakes and racers, birds of prey (hawks), opossums, raccoons, foxes, feral cats |
| Venom | None. Harmless to people and pets |
| Look | Orange to red-brown with red saddles edged in black; black-and-white chequered belly |
| Behaviour | Mostly out at dusk and night; climbs well. Cornered, it forms an S, buzzes its tail tip in dry leaves like a rattlesnake, and may strike |

**The name.** Two stories, and neither is settled. The National Zoo says the chequered belly looks like the kernels of Indian corn. The Florida Museum says the snakes hunted rodents in corn cribs. Give both.

**Hens' eggs.** The Florida Museum lists "chicken snake" as one of its names, and its diet includes "birds and their eggs". Coop raids in farmers' reports are mostly by bigger rat snakes, and no source checked tells of corn snakes in coops. Fine for a game level; in a video say "it eats birds' eggs, and some farmers call it the chicken snake".

**Hawks and crows.** Sources name "hawks" and "birds of prey" as corn snake predators, but none names the red-tailed hawk. Red-tails do take many snakes (41% of prey items in one Washington study), and a Virginia paper records one fighting an eastern rat snake, a close cousin. American crows eat small snakes, but no record of a crow killing a corn snake was found. In the game the crow nips the tail; don't claim crows kill corn snakes.

**Video fact:** Flip a corn snake over and its belly is a black-and-white chequerboard, like a cob of Indian corn. That may be where the name comes from.

Sources: [Florida Museum](https://www.floridamuseum.ufl.edu/florida-snake-id/snake/red-cornsnake/), [Savannah River Ecology Lab](https://srelherp.uga.edu/snakes/corn-snake/), [Animal Diversity Web](https://animaldiversity.org/accounts/Pantherophis_guttatus/), [Smithsonian National Zoo](https://www.nationalzoo.si.edu/animals/eastern-corn-snake), [Chattahoochee Nature Center](https://chattnaturecenter.org/visit/experience/wildlife/animal-facts/corn-snake), [Red-tailed hawk snake diet (Raptor Research)](https://sora.unm.edu/sites/default/files/journals/jrr/v010n04/p00108-p00111.pdf), [Red-tail vs rat snake (Banisteria)](https://biodiversitylibrary.org/part/298282), [American crow diet (ABC)](https://abcbirds.org/news/something-to-crow-about-the-amazing-diet-eating-habits-of-american-crows/).

### 2. Eastern hognose (*Heterodon platirhinos*): The Pine Barrens

| | |
|---|---|
| Length | Typical 51–84 cm (1.7–2.8 ft); max 116 cm (3.8 ft) |
| Lifespan | 5–6 years in captivity |
| Range & habitat | Eastern and central US and southern Ontario; sandy soils |
| Prey | Mainly toads |
| Predators | Raccoons, Virginia opossums, red foxes, hawks, kingsnakes |
| Venom | Enlarged rear fangs; mild venom, harmless to people |
| Defence | Flattens its neck and hisses. Then plays dead: belly-up, mouth open, tongue out, with a musky smell. Turned right side up, it rolls belly-up again |

**Video fact:** A "dead" hognose turned right way up flips straight back onto its back.

Sources: [Animal Diversity Web](https://animaldiversity.org/accounts/Heterodon_platirhinos/), [Missouri Dept. of Conservation](https://mdc.mo.gov/discover-nature/field-guide/eastern-hog-nosed-snake).

### 3. Sidewinder (*Crotalus cerastes*): The Dunes

| | |
|---|---|
| Length | 43–80 cm (1.4–2.6 ft); the NPS says usually 45 cm (1.5 ft) or less |
| Weight | 94–304 g (3.3–10.7 oz) |
| Lifespan | 5–13 years wild |
| Range & habitat | Mojave and Sonoran deserts; sandy flats and dunes |
| Prey | Lizards over 50% of the diet, small mammals over 40% (kangaroo rats, pocket mice) |
| Predators | Kingsnakes, coyotes, red-tailed hawks; roadrunners kill rattlesnakes in general |
| Venom | Pit viper, venomous |
| Behaviour | Sidewinds, leaving J-shaped tracks. Buries itself in the sand ("cratering") to wait for prey. Top burst speed 3.7 km/h (2.3 mph) (Secor, Jayne & Bennett 1992) |

**Video fact:** The sidewinder throws its body sideways across the sand and leaves a row of J-shaped tracks.

Sources: [Animal Diversity Web](https://animaldiversity.org/accounts/Crotalus_cerastes/), [Death Valley NPS](https://home.nps.gov/deva/learn/nature/sidewinder.htm).

### 4. Common egg-eater (*Dasypeltis scabra*): The Savanna

| | |
|---|---|
| Length | Typical 60–75 cm (2–2.5 ft); max about 96 cm (3.1 ft) in Kruger, up to 100–120 cm (3.3–3.9 ft) reported |
| Range & habitat | Sub-Saharan Africa and SW Arabia; savanna, scrub, open woodland, grassland |
| Prey | Birds' eggs only |
| Predators | Not documented. Secretary birds and mongooses eat snakes in general |
| Venom | None; almost toothless |
| Behaviour | Spines on the backbone inside the throat (hypapophyses) crack the egg; the shell is spat out. To scare, it rasps its scales like a saw-scaled viper and gapes its black mouth |

**Video fact:** It swallows an egg far wider than its head, cracks it inside its throat, and spits out the folded shell.

Sources: [African Snakebite Institute](https://www.africansnakebiteinstitute.com/snake/african-snake-common-egg-eater/), [Smithsonian Magazine](https://www.smithsonianmag.com/smart-news/small-snake-eat-meals-many-times-larger-head-180982866/).

### 5. Paradise flying snake (*Chrysopelea paradisi*): The Rainforest

| | |
|---|---|
| Length | About 90 cm (3 ft); max 1.2–1.3 m (3.9–4.3 ft) |
| Range & habitat | Southeast Asia; moist forest, mangroves, gardens |
| Prey | Geckos and other lizards, frogs, bats, birds |
| Predators | Crested serpent eagle, Malayan water monitor (thin records) |
| Venom | Rear-fanged, mildly venomous |
| Gliding | Flattens its body into a triangle shape and undulates in the air. In Socha's tests, glides averaged about 10 m (33 ft) from a 9.6 m (31 ft) tower; the best was 21 m (69 ft) from 15 m (49 ft) |

**Video fact:** It jumps from a tree, flattens its body, and swims through the air up to 21 m (69 ft).

Sources: [Science News](https://www.sciencenews.org/article/slithering-air-flying-snakes-glide-through-treetops), [Singapore Biodiversity Online](https://singapore.biodiversity.online/species/A-Vert-Reptilia-000058).

### 6. Banded sea krait (*Laticauda colubrina*): The Reef

| | |
|---|---|
| Length | Males about 88 cm (2.9 ft), females about 142 cm (4.7 ft); max about 1.7 m (5.6 ft) |
| Range & habitat | Eastern Indian Ocean and western Pacific; coral reefs and the islets beside them |
| Prey | Eels (morays, congers) |
| Predators | Tiger sharks and white-bellied sea eagles eat sea snakes |
| Venom | Potent neurotoxin, but docile |
| Behaviour | Comes ashore to digest, shed, mate and lay eggs. Dives typically 15–30 min (some sea snakes up to about 2 h); breathes partly through its skin. Its tail looks like a second head |

**Video fact:** It hunts eels at sea but has to crawl back onto land to digest, shed and lay its eggs.

Sources: [Ineich et al. 2007 (Macquarie)](https://researchers.mq.edu.au), [SeaLifeBase (Lyle & Timms 1987)](https://www.sealifebase.ca), [Australian Museum: white-bellied sea eagle](https://australian.museum/learn/animals/birds/white-bellied-sea-eagle/).

### 7. Spider-tailed horned viper (*Pseudocerastes urarachnoides*): The Mountains

| | |
|---|---|
| Length | About 53–86 cm (1.7–2.8 ft) |
| Range & habitat | Western Iran (Ilam, Kermanshah, Khuzestan) and eastern Iraq; limestone crevices of the western Zagros |
| Prey | Birds: Isabelline shrike, warblers, larks, some migrants |
| Predators | Unknown |
| Venom | Viper, venomous |
| Status | Described in 2006 (Bostanchi et al.); Near Threatened; CITES Appendix II |
| Lure | The tail ends in a bulb fringed with long scales, like a spider. It waves it in a figure of eight, about 4× faster when a bird appears |

**Video fact:** Its tail looks like a spider, and it wiggles it to call birds down to their death.

Sources: [Reptile Database](https://reptile-database.reptarium.cz/species?genus=Pseudocerastes&species=urarachnoides), [Wikipedia](https://en.wikipedia.org/wiki/Spider-tailed_horned_viper).

### 8. European adder (*Vipera berus*): The Heath

| | |
|---|---|
| Length | About 60 cm (2 ft); max 80–87 cm (2.6–2.9 ft) in the UK, 104 cm (3.4 ft) in Scandinavia |
| Weight | 50–100 g (1.8–3.5 oz) |
| Lifespan | 10–15 years wild |
| Range & habitat | Britain east to the Pacific; heath and moor |
| Prey | Voles, mice, shrews, lizards, frogs, nestlings |
| Predators | Foxes, badgers, buzzards, owls, herons, crows. Hedgehogs resist its venom and adder remains turn up in them, but kills are rarely seen |
| Venom | Britain's only venomous snake |
| Behaviour | Lives farther north than any other snake, inside the Arctic Circle. Hibernates in groups; basks in the sun. Zigzag stripe down the back |

**Video fact:** No snake lives farther north: the adder is found inside the Arctic Circle.

Sources: [Animal Diversity Web](https://animaldiversity.org/accounts/Vipera_berus/), [British Wildlife Centre](https://britishwildlifecentre.co.uk/planyourvisit/animals/adder/).

### 9. King cobra (*Ophiophagus*): The Jungle

| | |
|---|---|
| Length | Typical 3–4 m (10–13 ft); max "nearly 6 m" (20 ft): 5.71 m (18.7 ft) at London Zoo in 1939 is documented, 5.85 m (19.2 ft) is often cited |
| Weight | About 6 kg (13 lb); heaviest 12 kg (26 lb) |
| Range & habitat | South and Southeast Asia; forests near streams. Since the 2024 split, the Western Ghats snake is *O. kaalinga* and the northern and eastern Indian one is *O. hannah* |
| Prey | Mainly snakes: rat snakes, cobras, kraits, pythons up to about 3 m (10 ft) |
| Predators | Mongooses (they resist cobra neurotoxin through a receptor mutation, shown in *Herpestes*) |
| Venom | Venomous; the longest venomous snake |
| Behaviour | Rears up about a third of its body. Growls at about 600 Hz. The female builds a nest of leaves |

**Video fact:** The king cobra eats other snakes, and it growls.

Sources: [Guinness World Records](https://www.guinnessworldrecords.com/world-records/70265-longest-venomous-snake), [Animal Diversity Web](https://animaldiversity.org/accounts/Ophiophagus_hannah/), [Mongabay: four king cobra species](https://news.mongabay.com).

### 10. Green anaconda (*Eunectes murinus*): The Flooded Forest

| | |
|---|---|
| Length | Females mostly 3–5 m (10–16 ft); largest verified 5.21 m (17.1 ft) in a sample of 780 |
| Weight | 97.5 kg (215 lb) verified, the heaviest snake |
| Lifespan | About 10 years wild |
| Range & habitat | Amazon and Orinoco basins; swamps, flooded forest, the llanos. A 2024 split names a northern species, *E. akayima* (contested) |
| Prey | Fish, birds, caimans, capybaras, deer, turtles; kills by constriction |
| Predators | Caimans and jaguars take young snakes and males; big females eat smaller anacondas |
| Venom | None |
| Behaviour | Eyes and nostrils sit on top of the head, so it can hide with only those above water. Gives birth to 20–40 live young |

**Video fact:** The heaviest snake ever weighed was a green anaconda of 97.5 kg (215 lb).

Sources: [Animal Diversity Web](https://animaldiversity.org/accounts/Eunectes_murinus/), [Guinness World Records](https://www.guinnessworldrecords.com/world-records/70277-heaviest-species-of-snake).

## Predators and enemies

What is known about each game enemy, and how the in-game guide should say it.

| Ch | Enemy | What's verified | Guide wording |
|---|---|---|---|
| 1 | Red-tailed hawk | Red-tails eat many snakes; one fought an eastern rat snake. No record names corn snakes | "Red-tailed hawks hunt snakes." |
| 1 | Crow | American crows eat small snakes; nothing on corn snakes | "Crows will peck at anything that moves." Not "crows kill corn snakes" |
| 1 | Old Tomcat | Feral cats are listed corn snake predators | "Farm cats kill snakes." |
| 2 | Raccoon, red fox | Listed hognose predators | As is |
| 2 | Virginia opossum *(new)* | Listed hognose predator. Opossums also play dead (thanatosis: the classic case, likely involuntary, with a foul smell) | "The opossum plays dead too, so it isn't fooled." The last part is a game joke; say so if used in a video |
| 3 | Coyote, kingsnake | Listed sidewinder predators. Kingsnakes are **resistant** to rattlesnake venom | "Kingsnakes resist rattlesnake venom." Not "immune" |
| 3 | Roadrunner | Kills rattlesnakes and beats them on rocks | "Roadrunners kill rattlesnakes." |
| 4 | Banded mongoose, secretary bird | No egg-eater predators documented. Mongooses eat snakes; the secretary bird kicks with about 5× its body weight in about 15 ms (Portugal et al. 2016) | "Secretary birds stamp snakes to death." Don't say they hunt egg-eaters |
| 5 | Water monitor, crested serpent eagle | Serpent eagle is a snake specialist; monitor records are thin | "The crested serpent eagle lives on snakes." |
| 6 | Tiger shark, white-bellied sea eagle | Both eat sea snakes | As is |
| 6 | Box jellyfish *(new hazard)* | *Chironex* box jellies live only in the Indo-Pacific, including the Philippines and Singapore | A hazard, not a hunter: "Box jellies sting anything that brushes them." Never "they eat kraits" |
| 7 | Short-toed snake eagle | Up to 92.5% snakes; breeds across Iran in summer | "Its diet is almost all snakes." |
| 7 | Wild boar | Lives in the oak forests of the Zagros; big males top 250 kg (550 lb) with long tusks; dangerous when cornered | A dangerous animal on the hillside. Not a viper-eater |
| 8 | Buzzard, badger, hedgehog | Buzzards and badgers eat adders; hedgehogs resist the venom, kills rarely seen | "Hedgehogs resist adder venom." |
| 8 | Grey heron *(new)* | Herons are named among adder predators by the British Wildlife Centre and the earlier check; BTO names birds of prey and crows. No study found | "Herons will spear an adder." Keep it light; don't call it a main predator |
| 9 | Grey mongoose | *Herpestes* mongooses resist cobra neurotoxin through a receptor mutation | "Mongooses resist cobra venom." |
| 9 | Honey badger *(new)* | Lives in India (Indian ratel, *M. c. indica*). In the Kalahari, cobras were a large part of what it ate. No record found of one killing a cobra in India | "Honey badgers hunt cobras." Don't claim a king cobra kill |
| 10 | Black caiman | Caimans take young anacondas | As is |
| 10 | Bigger anaconda *(new)* | Big females strangle and eat smaller anacondas, mostly males (Rivas & Owens 2000; about four cases by 2017) | "Big anacondas sometimes eat smaller ones." |
| 10 | Jaguar | Killed 62% of the dead caimans found in a Pantanal study. Anaconda kills are rarely seen; the famous 2017 photos (Chris Brunskill, Cuiabá River) show a **yellow** anaconda | "Jaguars kill caimans, and now and then an anaconda." |

Not checked yet: weaver birds mobbing a snake at their nests, and hornbills eating small snakes. Treat them as game choices until checked. (Wild turkey, giant grouper, white stork, Indian peafowl and giant otters were dropped from the design for weak evidence.)

Sources: [opossums play dead (Reconnect With Nature)](https://www.reconnectwithnature.org/headlines/news/nature-curiosity-why-do-opossums-play-dead), [Apparent death (Wikipedia)](https://en.wikipedia.org/wiki/Apparent_death), [box jellyfish in the Philippines (UP Diliman)](https://science.upd.edu.ph/venomous-jellyfish-found-in-ph-waters-biologists-confirm/), [*Chironex* in Singapore (Raffles Bulletin of Zoology)](https://lkcnhm.nus.edu.sg/wp-content/uploads/sites/11/2026/05/RBZ-2026-0026.pdf), [*Chironex fleckeri* (SeaLifeBase)](https://www.sealifebase.ca/summary/speciessummary.php?id=45444), [boar in Iran (Encyclopaedia Iranica)](https://www.iranicaonline.org/articles/boar-sus-scrofa-pers), [adder predators (BTO)](https://bto.org/cy/node/62515), [honey badger (Wikipedia)](https://en.wikipedia.org/wiki/Honey_badger), [honey badger in India (J. Threatened Taxa)](https://threatenedtaxa.org/index.php/JoTT/article/view/9209), [anaconda cannibalism (anacondas.org)](https://anacondas.org/anacondas.org/canib.htm), [female anaconda kills male (National Geographic)](https://www.nationalgeographic.com/animals/article/anacondas-sex-death-brazil-mating), [jaguar and yellow anaconda (Getty Images)](https://www.gettyimages.com/detail/news-photo/jaguar-stalks-and-kills-a-yellow-anaconda-on-the-cuiaba-news-photo/857776718), [secretary bird kick (RVC)](https://www.rvc.ac.uk), [roadrunner (All About Birds)](https://www.allaboutbirds.org/guide/Greater_Roadrunner/food), [crested serpent eagle (Peregrine Fund)](https://peregrinefund.org).

## Wording rules for the guide and videos

- Kingsnakes, mongooses and hedgehogs are **resistant** to venom, never "immune". (The design doc's "kingsnake, immune to venom" should read "resists venom".)
- King cobra: "nearly 6 m (20 ft)". Don't say 6 m or more.
- Anaconda: 97.5 kg (215 lb) is the verified weight. Length: "over 5 m (16 ft)", not the 9 m legends.
- Sidewinder: top speed 3.7 km/h (2.3 mph). It is not fast; don't say it is.
- Flying snake: glides "about 10 m (33 ft), up to 21 m (69 ft)". It glides; it doesn't fly.
- Corn snake name: give both stories (belly like corn kernels, rodents in corn cribs).
- Corn snakes eat birds' eggs; don't claim they raid hen coops as fact.
- Crows peck; don't say crows kill corn snakes.
- Box jellies are a hazard, not a predator of kraits.
- Wild boar is a danger on the hillside, not a viper-eater.
- The 2017 jaguar kill was a yellow anaconda, not a green one.
- Use the 2024 names only where they matter: *O. kaalinga* (Western Ghats), *O. hannah* (north and east India); *E. akayima* is contested.
- Every number gets US units after it: m and ft, kg and lb, cm and in.
