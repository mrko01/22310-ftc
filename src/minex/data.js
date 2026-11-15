// Minex content: rocks, minerals, layers and upgrades.
// Facts were checked against webmineral.com, the Geological Survey of Canada,
// Laurentian University, SNOLAB, the City of Greater Sudbury and Wikipedia (see SOURCES).
export const W=30,H=150,ROW_M=20,SEED=22310;

const rocks=[
  {key:'till',name:'Glacial till',h:1.5,pattern:'till',pal:['#5a4a3a','#7a6650','#9a8a72','#3e342a'],desc:'Sand, gravel and boulders dumped by the ice sheets that last covered Ontario.'},
  {key:'boulder',name:'Glacial erratic',h:6.5,pattern:'boulder',pal:['#4a423c','#8a7a70','#b9aea2','#5d524a'],desc:'A boulder of granite carried here by the ice sheet and left behind when it melted.'},
  {key:'onaping',name:'Onaping Formation',h:5.5,pattern:'onaping',pal:['#24232a','#34323a','#6d6a72','#8f8a7f'],desc:'Breccia that filled the crater after the impact: shattered and partly melted rock. Its Black Member is rich in carbon.'},
  {key:'granophyre',name:'Granophyre',h:6,pattern:'granophyre',pal:['#8a4f45','#a0645a','#6d3a33','#e3cdbb'],desc:'Pink quartz-and-feldspar rock that cooled at the top of the impact melt sheet.'},
  {key:'qgabbro',name:'Quartz gabbro',h:6,pattern:'gabbro',pal:['#3d4340','#4d5450','#b8b4a8','#8f8c82'],desc:'A dark transition layer in the middle of the melt sheet, between granophyre and norite.'},
  {key:'norite',name:'Norite',h:6,pattern:'norite',pal:['#2e3130','#3a3e3c','#9d978a','#7a6a4a'],desc:'The dark lower part of the Sudbury Igneous Complex, rich in pyroxene and plagioclase.'},
  {key:'sublayer',name:'Sublayer norite',h:5.5,pattern:'sublayer',pal:['#33302c','#45403a','#6a645c','#8a7d6c'],desc:'Inclusion-packed norite at the very base of the melt sheet. Sulfide liquid pooled here, forming the contact ore.'},
  {key:'breccia',name:'Sudbury Breccia',h:6,pattern:'breccia',pal:['#3a3536','#7a706c','#a49a90','#5c5250'],desc:'Footwall rock crushed by the shock of the impact. Its fractures host copper and platinum-group veins.'},
  {key:'gneiss',name:'Footwall gneiss',h:6.5,pattern:'gneiss',pal:['#3f3a3a','#6c6462','#9a918a','#2d2928'],desc:'Ancient banded rock beneath the Sudbury structure, billions of years older than the impact.'},
  {key:'quartz',name:'Quartz vein',h:7,pattern:'quartz',pal:['#cfcac0','#e8e3da','#b2aca2','#f6f2ea'],desc:'Milky quartz that grew in cracks. Hard enough to scratch glass, so it is slow to drill.'},
  {key:'diorite',name:'Quartz diorite (offset dyke)',h:6,pattern:'diorite',pal:['#4a4c4a','#6e706c','#2c2e2d','#9a9a92'],desc:'Melt from the impact that was injected outward into cracks, forming offset dykes like the Copper Cliff and Worthington offsets.'},
  {key:'rubble',name:'Rockburst rubble',h:1.5,pattern:'rubble',pal:['#2a2726','#5d5753','#79726c','#463f3b'],desc:'Loose rock thrown into a tunnel by a rockburst.'},
  {key:'shotcrete',name:'Shotcrete lining',h:4,pattern:'shotcrete',pal:['#8c9396','#9ea5a8','#7b8285','#c9a74c'],desc:'Sprayed concrete and rock bolts that line SNOLAB’s clean lab.'},
];
export const ROCKS=[null,...rocks];
export const rockIndex=Object.fromEntries(rocks.map((r,i)=>[r.key,i+1]));

const minerals=[
  {key:'pyrrhotite',name:'Pyrrhotite',formula:'Fe<sub>1−x</sub>S',metal:'Iron (carries Ni)',group:'iron',h:[3.5,4],sg:'4.6',color:'Bronze',luster:'Metallic',streak:'Grey-black',streakHex:'#3a3a38',magnetic:'strong',system:'Monoclinic or hexagonal',habit:'Massive',value:6,
    art:{pat:'massive',base:'#a8875a',hi:'#e6cfa0',lo:'#5e4a30'},where:'The most common sulfide in Sudbury ore, especially in contact ore at the base of the Sublayer.',uses:'Mostly rejected as waste, but it carries nickel and platinum-group metals locked in its grains.',
    facts:['It is magnetic, so mills can pull it away from pentlandite, which is not.','Its formula has a “1−x” because the crystal is missing some iron atoms.']},
  {key:'pentlandite',name:'Pentlandite',formula:'(Fe,Ni)<sub>9</sub>S<sub>8</sub>',metal:'Nickel',group:'nickel',h:[3.5,4],sg:'4.6–5.0',color:'Bronze-yellow',luster:'Metallic',streak:'Greenish-black',streakHex:'#2b3326',magnetic:'none',system:'Isometric',habit:'Granular, in pyrrhotite',value:40,
    art:{pat:'flames',base:'#c9a868',hi:'#f3e2b0',lo:'#7a6338'},where:'The main nickel ore in Sudbury. It grows as grains and “flames” inside pyrrhotite, in contact and footwall ore.',uses:'Nickel for stainless steel (about two-thirds of nickel use) and EV battery cathodes.',
    facts:['It averages about 35% nickel by weight.','Much of Sudbury’s cobalt and palladium sits inside pentlandite grains.'],hosts:['pyrrhotite']},
  {key:'chalcopyrite',name:'Chalcopyrite',formula:'CuFeS<sub>2</sub>',metal:'Copper',group:'copper',h:[3.5,3.5],sg:'4.1–4.3',color:'Brass-yellow, tarnishes iridescent',luster:'Metallic',streak:'Greenish-black',streakHex:'#2e3424',magnetic:'none',system:'Tetragonal',habit:'Massive',value:28,
    art:{pat:'tarnish',base:'#c8a838',hi:'#f7e48a',lo:'#6e5a18'},where:'Throughout the ore, and dominant in the copper-rich footwall veins (Coleman, McCreedy East, Morrison).',uses:'Copper for wiring, motors and EVs. An electric car uses far more copper than a petrol car.',
    facts:['Its tarnish can shimmer purple and blue, so tarnished pieces are sometimes sold as “peacock ore”.','Softer than a steel knife, unlike pyrite, the brassy mineral it is often confused with.']},
  {key:'magnetite',name:'Magnetite',formula:'Fe<sub>3</sub>O<sub>4</sub>',metal:'Iron',group:'iron',h:[5.5,6],sg:'5.1–5.2',color:'Iron-black',luster:'Metallic',streak:'Black',streakHex:'#151515',magnetic:'strong',system:'Isometric',habit:'Octahedra',value:6,
    art:{pat:'octahedra',base:'#3a3a3e',hi:'#9a9aa4',lo:'#121214'},where:'An accessory mineral in contact ore and in the melt sheet above it.',uses:'An iron ore elsewhere in the world. In Sudbury it is a by-product.',
    facts:['It is the most magnetic natural mineral on Earth.','Its crystals often form perfect eight-sided octahedra.']},
  {key:'pyrite',name:'Pyrite',formula:'FeS<sub>2</sub>',metal:'None (gangue)',group:'iron',h:[6,6.5],sg:'5.0',color:'Pale brass',luster:'Metallic',streak:'Greenish-black',streakHex:'#2c2f25',magnetic:'none',system:'Isometric',habit:'Cubes',value:4,
    art:{pat:'cubes',base:'#cdb870',hi:'#f6eab8',lo:'#6e6134'},where:'Scattered through many Sudbury rocks, from the crater fill down to the footwall.',uses:'Little value as an ore; once used to make sulfuric acid.',
    facts:['Nicknamed “fool’s gold”, but it is much harder than real gold and scratches glass.','It often grows in near-perfect cubes.']},
  {key:'cubanite',name:'Cubanite',formula:'CuFe<sub>2</sub>S<sub>3</sub>',metal:'Copper',group:'copper',h:[3.5,3.5],sg:'4.0–4.7',color:'Brass to bronze-yellow',luster:'Metallic',streak:'Black',streakHex:'#141414',magnetic:'strong',system:'Orthorhombic',habit:'Blades and lamellae',value:24,
    art:{pat:'blades',base:'#bf9a50',hi:'#ecd496',lo:'#6a5226'},where:'Grows with chalcopyrite in the copper-rich footwall veins.',uses:'Mined together with chalcopyrite for copper.',
    facts:['Named after Cuba, where it was first described.','It looks like chalcopyrite but is strongly magnetic, so a magnet tells them apart.']},
  {key:'millerite',name:'Millerite',formula:'NiS',metal:'Nickel',group:'nickel',h:[3,3.5],sg:'5.3–5.5',color:'Brass-yellow',luster:'Metallic',streak:'Greenish-black',streakHex:'#2b3226',magnetic:'none',system:'Trigonal',habit:'Needles',value:50,
    art:{pat:'needles',base:'#cbb35a',hi:'#f5e7a4',lo:'#6d5f28'},where:'Found in footwall veins, for example in the Morrison deposit.',uses:'A high-grade nickel ore: much more nickel per tonne than pentlandite.',
    facts:['It often grows as sprays of hair-thin needles.','It is about 65% nickel by weight.']},
  {key:'gersdorffite',name:'Gersdorffite',formula:'NiAsS',metal:'Nickel',group:'nickel',h:[5.5,5.5],sg:'5.9–6.3',color:'Silver-white to grey',luster:'Metallic',streak:'Grey-black',streakHex:'#2e2e30',magnetic:'none',system:'Isometric',habit:'Small crystals',value:45,
    art:{pat:'tiny',base:'#b8b8bc',hi:'#f4f4f8',lo:'#5a5a60'},where:'With cobaltite as a major ore mineral in South Range contact ore.',uses:'Nickel, plus palladium carried in its crystals.',
    facts:['Together, cobaltite and gersdorffite hold about 23% of the palladium in some South Range ore.','They grew at roughly 500–600 °C as the ore cooled.'],hosts:['pentlandite','pyrrhotite']},
  {key:'cobaltite',name:'Cobaltite',formula:'CoAsS',metal:'Cobalt',group:'nickel',h:[5.5,5.5],sg:'6.3',color:'Reddish silver-white',luster:'Metallic',streak:'Grey-black',streakHex:'#2f2c2e',magnetic:'none',system:'Orthorhombic (looks cubic)',habit:'Cube-like crystals',value:60,
    art:{pat:'tiny',base:'#c4b2b4',hi:'#fbf0f2',lo:'#64575a'},where:'Grows with gersdorffite in South Range contact ore.',uses:'Cobalt for battery cathodes and jet-engine superalloys.',
    facts:['Its crystals look cubic, but they are actually slightly distorted orthorhombic crystals.','Cobalt is named after kobold, a German goblin miners blamed for toxic ores.'],hosts:['pentlandite','pyrrhotite']},
  {key:'sperrylite',name:'Sperrylite',formula:'PtAs<sub>2</sub>',metal:'Platinum',group:'pgm',h:[6,7],sg:'10.6',color:'Tin-white',luster:'Brilliant metallic',streak:'Black',streakHex:'#111',magnetic:'none',system:'Isometric',habit:'Tiny cubes',value:240,
    art:{pat:'tiny',base:'#d8dade',hi:'#ffffff',lo:'#7a7e86'},where:'First described from Sudbury’s Vermilion mine. Found in copper- and PGE-rich footwall ore.',uses:'Platinum for catalytic converters, fuel cells, medical devices and jewellery.',
    facts:['First described in 1889 and named after Francis Sperry, a chemist at the Canadian Copper Company.','Very dense: about 10.6 times heavier than water, more than twice pyrite.'],hosts:['chalcopyrite','pentlandite']},
  {key:'michenerite',name:'Michenerite',formula:'(Pd,Pt)BiTe',metal:'Palladium',group:'pgm',h:[2.5,2.5],sg:'~9.5–10.5',color:'Silver-white',luster:'Metallic',streak:'Black',streakHex:'#111',magnetic:'none',system:'Isometric',habit:'Microscopic grains',value:160,
    art:{pat:'grains',base:'#c6c4c0',hi:'#fbfaf6',lo:'#6a6864'},where:'A palladium telluride in footwall ore, first identified in Frood mine concentrates.',uses:'Palladium for catalytic converters and electronics.',
    facts:['Named in 1958 after C.E. Michener, who first detected it.','The original sample was used up completely by the scientists analyzing it.'],hosts:['chalcopyrite']},
  {key:'froodite',name:'Froodite',formula:'PdBi<sub>2</sub>',metal:'Palladium',group:'pgm',h:[2.5,2.5],sg:'~11.5–12.6',color:'Grey',luster:'Metallic',streak:'Black',streakHex:'#111',magnetic:'none',system:'Monoclinic',habit:'Microscopic grains',value:150,
    art:{pat:'grains',base:'#9a9a9e',hi:'#e6e6ea',lo:'#4c4c50'},where:'Named after Sudbury’s Frood mine, its type locality.',uses:'Palladium for catalytic converters and electronics.',
    facts:['It is one of the minerals named after a Sudbury mine.','Described in 1958, alongside michenerite.'],hosts:['chalcopyrite']},
  {key:'sudburyite',name:'Sudburyite',formula:'(Pd,Ni)Sb',metal:'Palladium',group:'pgm',h:[4.5,4.5],sg:'~9.0',color:'Silver-grey',luster:'Metallic',streak:'Grey',streakHex:'#3a3a3a',magnetic:'none',system:'Hexagonal',habit:'Microscopic grains',value:170,
    art:{pat:'grains',base:'#aeb0b2',hi:'#f2f4f6',lo:'#56585a'},where:'Type material came from the Copper Cliff South and Frood mines.',uses:'Palladium for catalytic converters and electronics.',
    facts:['Named after the Sudbury district itself.','Approved as a new mineral in 1974.'],hosts:['chalcopyrite','pentlandite']},
  {key:'gold',name:'Native gold',formula:'Au',metal:'Gold',group:'pgm',h:[2.5,3],sg:'15–19.3',color:'Golden yellow',luster:'Metallic',streak:'Golden yellow',streakHex:'#d4a72c',magnetic:'none',system:'Isometric',habit:'Nuggets and flakes',value:280,
    art:{pat:'nuggets',base:'#e0b030',hi:'#fff1a8',lo:'#8a6410'},where:'Tiny grains in copper- and PGE-rich footwall deposits, such as Broken Hammer.',uses:'Electronics, jewellery and savings. Sudbury’s gold is recovered as a by-product.',
    facts:['Its streak is gold, which instantly tells it apart from pyrite (greenish-black).','It is soft (Mohs 2.5–3), so it bends and dents instead of shattering.'],hosts:['chalcopyrite','millerite']},
];
export const MINERALS=[null,...minerals];
export const mineralIndex=Object.fromEntries(minerals.map((m,i)=>[m.key,i+1]));
export const GROUPS={nickel:'Nickel & cobalt',copper:'Copper',pgm:'Platinum, palladium & gold',iron:'Iron & gangue'};

// A simplified composite section. The real basin is a tilted bowl, so no single
// shaft passes every layer; the order top-to-bottom follows the basin's stratigraphy.
export const ZONES=[
  {id:'overburden',num:'01',name:'Overburden',rock:'till',from:0,to:40,color:'#7a6650',toast:'Glacial till: left by the ice sheets. Sudbury’s rock was scraped bare, which is how rusty ore was spotted in an 1883 railway cut.'},
  {id:'onaping',num:'02',name:'Onaping Formation',rock:'onaping',from:40,to:200,color:'#6d6a72',ores:{pyrite:6,pyrrhotite:1},density:.025,pod:3,features:[{rock:'quartz',count:4,len:6}],toast:'The Onaping Formation filled the crater after the impact, about 1.85 billion years ago.'},
  {id:'granophyre',num:'03',name:'Granophyre',rock:'granophyre',from:200,to:420,color:'#a0645a',ores:{pyrite:4,magnetite:3},density:.03,pod:3,features:[{rock:'quartz',count:5,len:8}],toast:'You are now in the impact melt sheet: rock melted by the impact, which cooled into layers. Granophyre is its pink top.'},
  {id:'qgabbro',num:'04',name:'Quartz gabbro',rock:'qgabbro',from:420,to:560,color:'#8f8c82',ores:{magnetite:4,pyrite:2,pyrrhotite:2},density:.04,pod:3,toast:'Quartz gabbro: the middle of the melt sheet. Sulfide liquid was already sinking through here as it cooled.'},
  {id:'norite',num:'05',name:'Norite',rock:'norite',from:560,to:1000,color:'#7a6a4a',ores:{pyrrhotite:6,pentlandite:3,chalcopyrite:3,magnetite:1},density:.07,pod:4,features:[{rock:'quartz',count:6,len:8}],toast:'Norite: the dark lower melt sheet. Look for bronze sulfides — they get richer the deeper you go.'},
  {id:'sublayer',num:'06',name:'Sublayer · contact ore',rock:'sublayer',from:1000,to:1400,color:'#a98a52',ores:{pyrrhotite:45,chalcopyrite:22,pentlandite:24,magnetite:9},density:.3,pod:7,rare:{gersdorffite:5,cobaltite:5},features:[{rock:'norite',count:8,len:5},{rock:'gneiss',count:6,len:4}],toast:'Contact ore: sulfide liquid separated from the melt like oil from water and pooled here. Pyrrhotite, pentlandite and chalcopyrite.'},
  {id:'footwall',num:'07',name:'Footwall · Sudbury Breccia',rock:'breccia',from:1400,to:2300,color:'#a49a90',ores:{chalcopyrite:40,cubanite:14,millerite:12,pentlandite:12,pyrrhotite:8},density:.15,pod:6,rare:{sperrylite:6,michenerite:4,froodite:4,sudburyite:4,gold:5},features:[{rock:'gneiss',count:14,len:12},{rock:'quartz',count:6,len:7}],toast:'The footwall: shock-crushed rock beneath the melt sheet. Copper- and platinum-rich liquid escaped down into its cracks.'},
  {id:'deep',num:'08',name:'Deep footwall gneiss',rock:'gneiss',from:2300,to:3000,color:'#9a918a',ores:{chalcopyrite:10,millerite:6,pentlandite:4,cubanite:3},density:.05,pod:4,rare:{sperrylite:4,gold:4,sudburyite:2},features:[{rock:'breccia',count:12,len:10},{rock:'quartz',count:8,len:8}],toast:'Deep frontier. Creighton mines ore around 2.4 km; Glencore’s Onaping Depth reaches about 2.6 km.'},
];

// Approximate rock temperature in °C, fitted to about 40 °C at SNOLAB (2,070 m) and about 46 °C at 2.5 km.
export const rockTemp=d=>Math.round(8+d*.0155);

export const UPGRADES={
  drill:{name:'Drill',unit:'× speed',levels:[
    {name:'Hand steel & hammer',value:1,cost:0,note:'How Sudbury’s first miners drilled blast holes: one swing at a time.'},
    {name:'Jackleg drill',value:1.5,cost:120,note:'A compressed-air rock drill on a telescoping leg, still used in narrow stopes.'},
    {name:'Electro-hydraulic jumbo',value:2.2,cost:380,note:'A rig with drill booms that drills a whole tunnel face in one setup.'},
    {name:'Long-hole drill',value:3.2,cost:1000,note:'Drills holes tens of metres long to blast big stopes at once.'},
    {name:'Automated jumbo',value:4.5,cost:2400,note:'Remote and automated drilling lets crews work away from the face.'}]},
  battery:{name:'Battery',unit:'digs',levels:[
    {name:'Cap-lamp pack',value:60,cost:0,note:'Just enough charge for a short shift.'},
    {name:'Lead-acid pack',value:100,cost:90,note:'Heavy, but reliable.'},
    {name:'Lithium-ion pack',value:150,cost:300,note:'More energy per kilogram.'},
    {name:'Battery-electric fleet',value:220,cost:800,note:'Electric machines make no diesel exhaust, so mines need less ventilation. Glencore’s Onaping Depth runs a battery-electric fleet.'},
    {name:'Fast-charge system',value:320,cost:2000,note:'Quick charging between shifts keeps the fleet moving.'}]},
  cargo:{name:'Haulage',unit:'t',levels:[
    {name:'Ore bag',value:8,cost:0,note:'You carry what you can.'},
    {name:'Muck car',value:14,cost:80,note:'A rail car that hauls broken rock (“muck”) to the shaft.'},
    {name:'Scooptram (LHD)',value:22,cost:260,note:'A load-haul-dump loader: the workhorse of underground mines.'},
    {name:'Battery LHD',value:34,cost:700,note:'The same loader, electric. Quieter and cleaner underground.'},
    {name:'Haul truck & skip',value:50,cost:1800,note:'Trucks feed the skip, which hoists ore up the shaft.'}]},
  lamp:{name:'Lighting',unit:'cells',levels:[
    {name:'Carbide lamp',value:3.2,cost:0,note:'An open flame from water dripping on calcium carbide.'},
    {name:'Electric cap lamp',value:4,cost:60,note:'A battery on the belt, a lamp on the hard hat.'},
    {name:'LED cap lamp',value:4.8,cost:200,note:'Brighter, longer-lasting light.'},
    {name:'LED floodlights',value:5.8,cost:550,note:'Lights the whole working face.'},
    {name:'Smart lighting',value:7,cost:1300,note:'Connected lights that also help track people underground.'}]},
  vent:{name:'Ventilation',unit:'m',levels:[
    {name:'Natural airflow',value:1300,cost:0,note:'Fresh air sinks down the shaft. It isn’t enough when the rock gets hot.'},
    {name:'Auxiliary fans & ducting',value:1700,cost:250,note:'Fans push fresh air right to the working face.'},
    {name:'Bulk air cooler',value:2100,cost:700,note:'Chills air before it goes underground.'},
    {name:'Natural heat exchange',value:2500,cost:1500,note:'Creighton draws air through broken rock that cools it in summer and warms it in winter.'},
    {name:'Refrigeration plant',value:3100,cost:3000,note:'Industrial chillers keep crews safe at extreme depth.'}]},
  support:{name:'Ground support',unit:'',levels:[
    {name:'Bare rock',value:1,cost:0,note:'Nothing holds the rock if stress releases.'},
    {name:'Rock bolts',value:.65,cost:180,note:'Steel bolts pin loose rock to solid rock behind it.'},
    {name:'Mesh & bolts',value:.4,cost:500,note:'Steel mesh catches small pieces between bolts.'},
    {name:'Dynamic bolts & shotcrete',value:.2,cost:1100,note:'Yielding bolts stretch instead of snapping in a rockburst.'},
    {name:'Seismic monitoring',value:.08,cost:2400,note:'Sensors map rock stress so crews avoid risky ground. Creighton has tracked its seismic events for decades.'}]},
};

export const SPECIAL={
  snolab:{depth:2070,name:'SNOLAB',kicker:'Discovery · 2,070 m',body:'You’ve reached SNOLAB, a clean physics lab 2 km down inside Vale’s Creighton Mine. Two kilometres of rock block cosmic rays, so scientists can catch neutrinos and hunt for dark matter.',facts:['Arthur McDonald shared the 2015 Nobel Prize in Physics for neutrino discoveries made here.','About 5,000 m² of clean space, with rock temperatures near 40 °C.']},
  cone:{depth:1500,name:'Shatter cone',kicker:'Discovery · impact evidence',body:'A shatter cone: rock fractured into nested cones by an enormous shock wave. They only form in meteorite impacts, which is how geologists proved Sudbury is an impact crater.',facts:['Shatter cones at Sudbury were reported by Robert Dietz in 1964, and they point toward the centre of the basin.','The impactor was roughly 10–15 km across, and the original crater may have been about 200 km wide.']},
  burst:{name:'Rockburst',kicker:'Hazard · deep mining',body:'Rockburst! At depth, the weight of the rock above builds huge stress. When it releases suddenly, rock can be thrown into tunnels. Upgrade ground support to reduce the damage.',facts:['Creighton recorded 123 seismic events of magnitude 0–4 between 2000 and 2013.','A 1984 rockburst at Falconbridge killed four miners and led to the first Workers’ Memorial Day in 1985.']},
};

export const SURFACE={spawn:15,shaft:4,stack:25,nickel:17,buildings:[{id:'shaft',label:'HEADFRAME',x:3,w:3,h:4},{id:'assay',label:'ASSAY',x:9,w:3,h:2},{id:'shop',label:'WORKSHOP',x:20,w:3,h:2}]};

export const FACTS=[
  {k:'1.85 Ga',t:'Age of the impact',d:'About 1.85 billion years ago (1849–1850 Ma), an asteroid or comet roughly 10–15 km across struck what is now Sudbury.'},
  {k:'~200 km',t:'Original crater',d:'Estimates of the original crater run from about 130 to 280 km wide. Today’s basin is a squeezed oval, about 62 × 30 km.'},
  {k:'1883',t:'The discovery',d:'CPR blacksmith Thomas Flanagan spotted rusty sulfide in a railway rock cut, leading to the Murray Mine.'},
  {k:'2,070 m',t:'SNOLAB',d:'A clean physics lab inside Creighton Mine. Its neutrino research won the 2015 Nobel Prize in Physics.'},
  {k:'10.4 M',t:'Trees replanted',d:'Since 1978, Sudbury’s Regreening Program has planted more than 10.4 million seedlings on land damaged by smelting.'},
  {k:'381 m',t:'The Superstack',d:'The world’s tallest chimney from 1971 to 1987. Retired in 2020, it is now being taken down.'},
  {k:'9 m',t:'The Big Nickel',d:'A giant replica of the 1951 Canadian nickel, unveiled in 1964. It now stands at Dynamic Earth.'},
  {k:'1971',t:'Apollo training',d:'Apollo 16 astronauts trained on Sudbury’s impact rocks. On the Moon, John Young said one rock looked like “a Sudbury breccia”.'},
];

export const SOURCES=[
  ['webmineral.com mineral data','https://webmineral.com/'],
  ['Geological Survey of Canada, Sudbury ore mineralogy','https://publications.gc.ca/collections/collection_2026/rncan-nrcan/m183-2/M183-2-7331-eng.pdf'],
  ['University of Waterloo, Mining history of the Sudbury area','https://uwaterloo.ca/earth-sciences-museum/resources/mining-canada/mining-history-sudbury-area'],
  ['SNOLAB, About SNOLAB','https://www.snolab.ca/about/about-snolab/'],
  ['City of Greater Sudbury, Regreening Program','https://www.greatersudbury.ca/live/environment-and-sustainability1/regreening-program/'],
  ['Sudbury Basin (Wikipedia)','https://en.wikipedia.org/wiki/Sudbury_Basin'],
  ['Creighton Mine (Wikipedia)','https://en.wikipedia.org/wiki/Creighton_Mine'],
  ['MIRARCO, Natural Heat Exchange','https://mirarco.org/nheet/'],
  ['RRUFF, froodite and michenerite (Hawley & Berry, 1958)','https://rruff.info/rruff_1.0/uploads/CM6_200.pdf'],
];
