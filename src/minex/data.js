// Minex: a descent through the Sudbury Basin, one stop per screen.
// Facts checked against webmineral.com, the Geological Survey of Canada, SNOLAB,
// the University of Waterloo, the City of Greater Sudbury and Wikipedia (see SOURCES).

// Rock layers in the order the basin stacks them. The real basin is a tilted bowl,
// so no single shaft passes every layer; Minex stacks them into one descent.
// pal: base, alternate and accent colours for the background shader.
export const LAYERS=[
  {id:'till',name:'Glacial till',from:0,pal:['#4a3c2e','#6b5844','#8f7d64']},
  {id:'onaping',name:'Onaping Formation',from:40,pal:['#1d1c22','#2c2a31','#7d7983']},
  {id:'granophyre',name:'Granophyre',from:200,pal:['#6a372f','#8a4f45','#d6bfac']},
  {id:'gabbro',name:'Quartz gabbro',from:420,pal:['#2e3431','#434a46','#a9a69b']},
  {id:'norite',name:'Norite',from:560,pal:['#222528','#33373a','#93805a']},
  {id:'sublayer',name:'Sublayer',from:1000,pal:['#2a2824','#3d3933','#b38f58']},
  {id:'footwall',name:'Sudbury Breccia',from:1400,pal:['#2c2829','#5f5753','#958b81']},
  {id:'gneiss',name:'Footwall gneiss',from:2300,pal:['#302b2b','#5b5352','#8d837c']},
];
export const layerAt=d=>{let k=0;LAYERS.forEach((l,i)=>{if(d>=l.from)k=i;});return LAYERS[k];};

// One stop per screen. kind: layer | mineral | find. Copy stays short on purpose.
export const STORY=[
  {kind:'layer',depth:20,title:'Glacial till',text:'Sand and boulders dropped by the last ice sheet. In 1883, a railway blacksmith noticed rusty rock in a cut near here. That was the start.'},
  {kind:'layer',depth:120,title:'Onaping Formation',text:'Shattered rock that rained back into the crater after the impact. In the middle of the basin it is up to a kilometre and a half thick.'},
  {kind:'mineral',depth:170,key:'pyrite',title:'Pyrite',formula:'FeS<sub>2</sub>',text:'Fool’s gold. Brassy cubes scattered through Sudbury’s rock, worth almost nothing.',note:'Hard enough to scratch glass. Real gold is soft.'},
  {kind:'layer',depth:300,title:'Granophyre',text:'The impact melted the crust into a sea of molten rock that cooled in layers. This pink rock is its top.'},
  {kind:'mineral',depth:380,key:'magnetite',title:'Magnetite',formula:'Fe<sub>3</sub>O<sub>4</sub>',text:'The most magnetic mineral on Earth, growing as small black eight-sided crystals.',note:'In 1856 a surveyor recorded strange compass readings near here.'},
  {kind:'layer',depth:720,title:'Norite',text:'The dark bottom of the melt sheet. As it cooled, heavy liquid full of metal sank through it like drops of oil in water.'},
  {kind:'machine',depth:914,key:'teleop',title:'Remote control',text:'In 1993, at Inco’s Copper Cliff North Mine, an operator on the surface drove a loader on the 914-metre level. Our robot spends two minutes of every FTC match driven the same way.',note:'Today Vale watches its five Ontario mines from one remote operating centre in Sudbury.'},
  {kind:'layer',depth:1000,title:'The contact',text:'At the base of the melt sheet that liquid pooled and froze into ore. Sudbury was built on what is down here.'},
  {kind:'mineral',depth:1060,key:'pyrrhotite',title:'Pyrrhotite',formula:'Fe<sub>1−x</sub>S',text:'The most common mineral in the ore. Bronze, plate-shaped, and magnetic.',note:'Mostly iron, but it carries nickel and platinum metals.'},
  {kind:'mineral',depth:1160,key:'pentlandite',title:'Pentlandite',formula:'(Fe,Ni)<sub>9</sub>S<sub>8</sub>',text:'The nickel. Pale grains that grow inside pyrrhotite. A magnet grabs the pyrrhotite and leaves these behind.',note:'About 35% nickel. Most nickel becomes stainless steel.'},
  {kind:'mineral',depth:1280,key:'chalcopyrite',title:'Chalcopyrite',formula:'CuFeS<sub>2</sub>',text:'The copper. Brass-yellow, tarnishing to blue and purple.',note:'Copper for wiring, motors and electric cars.'},
  {kind:'layer',depth:1400,title:'The footwall',text:'Below the melt sheet, rock crushed by the impact’s shock wave. Copper- and platinum-rich liquid leaked down into its cracks.'},
  {kind:'find',depth:1500,key:'cone',title:'Shatter cone',text:'Rock split into nested cones by a shock wave. They only form in impacts. This is how geologists proved Sudbury is a crater.',note:'Reported here by Robert Dietz in 1964.'},
  {kind:'mineral',depth:1650,key:'millerite',title:'Millerite',formula:'NiS',text:'Nickel again, this time as sprays of hair-thin brassy needles.',note:'About 65% nickel by weight.'},
  {kind:'mine',depth:1720,mine:'nrs',title:'Nickel Rim South',text:'Glencore mined contact and footwall ore here, from about 1,100 m down to 1,720 m. Since July 2024 the mine has been on care and maintenance.'},
  {kind:'mineral',depth:1900,key:'sperrylite',title:'Sperrylite',formula:'PtAs<sub>2</sub>',text:'Platinum. First described in 1889 from Sudbury’s Vermilion mine, and named after the chemist Francis Sperry.',note:'10.6 times heavier than water.'},
  {kind:'mine',depth:1980,mine:'garson',title:'Garson Mine',text:'Vale works a contact deposit here that was folded and sheared after it formed. One ore zone runs from the surface to about 1,980 m.',note:'Depth approximate.'},
  {kind:'find',depth:2070,key:'snolab',title:'SNOLAB',text:'A clean physics lab two kilometres down, inside Creighton Mine. The rock overhead blocks cosmic rays so detectors can catch neutrinos.',note:'Work here shared the 2015 Nobel Prize in Physics.'},
  {kind:'mineral',depth:2250,key:'froodite',title:'Froodite',formula:'PdBi<sub>2</sub>',text:'Palladium, in grains too small to see without a microscope. Named after Sudbury’s Frood mine.',note:'Shown many times larger than life.'},
  {kind:'mine',depth:2380,mine:'creighton',title:'Creighton Mine',text:'Mined since 1901 and still going deeper. Its No. 9 shaft is 2,176 m deep, and ore now comes from 2,380 m, more than four CN Towers down.'},
  {kind:'mineral',depth:2450,key:'gold',title:'Native gold',formula:'Au',text:'Specks of gold among the copper ore, recovered as a by-product.',note:'The rock down here is about 46 °C.'},
  {kind:'mine',depth:2600,mine:'onaping',title:'Onaping Depth',text:'Glencore’s newest mine reached ore about 2,600 m down in August 2026. It was built to be monitored and run from the surface, with an all-electric fleet.',note:'Depth approximate.'},
  {kind:'machine',depth:2600,key:'auto',title:'Autonomous',text:'Vale plans to let Creighton’s battery-electric loaders run on their own between shifts. Every FTC match starts the same way: 30 seconds where our robot drives itself.',note:'EDIT Saffron’s robot, designed in Fusion and built at Lo-Ellen Park Secondary School.'},
];


export const SOURCES=[
  ['webmineral.com','https://webmineral.com/'],
  ['Geological Survey of Canada','https://publications.gc.ca/collections/collection_2026/rncan-nrcan/m183-2/M183-2-7331-eng.pdf'],
  ['University of Waterloo','https://uwaterloo.ca/earth-sciences-museum/resources/mining-canada/mining-history-sudbury-area'],
  ['SNOLAB','https://www.snolab.ca/about/about-snolab/'],
  ['Sudbury Basin','https://en.wikipedia.org/wiki/Sudbury_Basin'],
  ['Creighton Mine','https://en.wikipedia.org/wiki/Creighton_Mine'],
  ['Garson Mine','https://miningdataonline.com/property/41/Garson-Mine.aspx'],
  ['Vale battery-electric loaders at Creighton','https://im-mining.com/?p=94337'],
  ['CIM, LHD teleoperation (1993)','https://onemine.org/documents/lhd-teleoperation-and-guidance-proven-productivity-improvement-tools'],
  ['CIM Magazine, Vale remote operations','https://magazine.cim.org/en/news/2024/vale-goes-remote-en'],
  ['Glencore, Onaping Depth','https://www.glencore.com/media-and-insights/insights/2026-09-glencore-canada-onaping-depth-project-milestone'],
];
