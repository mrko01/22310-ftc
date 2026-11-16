// Machines, people and places for the Minex stage, modelled in metres at real proportions:
// a battery-electric LHD loader, a two-boom drill jumbo, miners in hi-vis, the SNO+ detector,
// a shatter-cone cluster, and cut-away dioramas of four Sudbury mines' deepest stations.
export function createModels(ctx){
  const {THREE,surface,KIND,rockMat,lump,rng,RoundedBoxGeometry,mergeGeometries}=ctx;
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const rbox=(w,h,d,r=.04,s=2)=>new RoundedBoxGeometry(w,h,d,s,Math.max(.001,Math.min(r,w/2.2,h/2.2,d/2.2)));
  const add=(parent,g,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;};
  // A straight member (beam, arm, rod) between two points.
  const strut=(parent,a,b,thick,m,round=false)=>{const d=b.clone().sub(a),len=d.length(),g=round?new THREE.CylinderGeometry(thick,thick,len,14):rbox(thick,len,thick,thick*.25);const o=new THREE.Mesh(g,m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());parent.add(o);return o;};

  const M={
    paint:surface(new THREE.MeshPhysicalMaterial({color:'#d8981a',metalness:.2,roughness:.5,clearcoat:.3,clearcoatRoughness:.55,envMapIntensity:.8}),KIND.paint,{b:'#3b2f22',c:'#a3a09a',scale:.9,bump:.003}),
    steel:surface(new THREE.MeshStandardMaterial({color:'#4a4744',metalness:.75,roughness:.5,envMapIntensity:.85}),KIND.faces,{scale:3,bump:.002}),
    dark:new THREE.MeshStandardMaterial({color:'#1f1e1d',metalness:.45,roughness:.6,envMapIntensity:.6}),
    chrome:new THREE.MeshStandardMaterial({color:'#d6d9dc',metalness:1,roughness:.14}),
    rubber:surface(new THREE.MeshStandardMaterial({color:'#171616',roughness:.95,envMapIntensity:.4}),KIND.tread,{scale:26,bump:.014}),
    glass:new THREE.MeshPhysicalMaterial({color:'#0c1216',metalness:0,roughness:.06,clearcoat:1,envMapIntensity:1.5}),
    led:new THREE.MeshStandardMaterial({color:'#fff6e2',emissive:'#ffe2a8',emissiveIntensity:3.2}),
    ledCool:new THREE.MeshStandardMaterial({color:'#eef6ff',emissive:'#d8eaff',emissiveIntensity:3.2}),
    ledOff:new THREE.MeshStandardMaterial({color:'#2e2c29',roughness:.4,metalness:.2}),
    amber:new THREE.MeshStandardMaterial({color:'#6a3a06',emissive:'#ff9a1a',emissiveIntensity:1.2}),
    tail:new THREE.MeshStandardMaterial({color:'#4a0b06',emissive:'#ff2a14',emissiveIntensity:1.8}),
    green:new THREE.MeshStandardMaterial({color:'#0d3a1a',emissive:'#38ff7a',emissiveIntensity:1.6}),
    hivis:surface(new THREE.MeshStandardMaterial({color:'#ff6a1a',roughness:.82}),KIND.paint,{b:'#4a3424',c:'#ffb07a',scale:1.4,bump:.002}),
    reflect:new THREE.MeshStandardMaterial({color:'#dcdcdc',emissive:'#a5a5a5',emissiveIntensity:.45,roughness:.35,metalness:.3}),
    pants:new THREE.MeshStandardMaterial({color:'#262830',roughness:.88}),
    hat:new THREE.MeshPhysicalMaterial({color:'#f2efe8',roughness:.32,clearcoat:.7}),
    skin:new THREE.MeshStandardMaterial({color:'#b88a6a',roughness:.7}),
    duct:surface(new THREE.MeshStandardMaterial({color:'#e3a238',roughness:.86}),KIND.ribs,{scale:110,bump:.008}),
    beam:new THREE.MeshBasicMaterial({color:'#ffe2a8',transparent:true,opacity:.07,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}),
    mesh:new THREE.LineBasicMaterial({color:'#8a8580',transparent:true,opacity:.28}),
  };

  // ---------- battery-electric load-haul-dump loader (about 10.7 m long) ----------
  function loader({auto=false}={}){
    const body=new THREE.Group(),parts={};
    add(body,rbox(4.4,1.05,2.5,.12),M.paint,2.5,1.2,0);
    add(body,rbox(3,1.2,2.42,.1),M.dark,2.65,2.3,0);
    for(let i=0;i<7;i++)add(body,rbox(.07,1.1,2.5,.02),M.steel,1.35+i*.43,2.3,0);
    add(body,rbox(.75,1.65,2.56,.2),M.paint,4.75,1.4,0);
    for(const z of[-.86,.86])add(body,rbox(.06,.16,.42,.02),M.tail,5.14,1.95,z);
    for(const z of[-1.28,1.28])add(body,rbox(2.1,.14,.86,.05),M.paint,3.1,1.86,z);
    add(body,new THREE.CylinderGeometry(.42,.42,1.15,24),M.steel,.15,1.2,0);
    add(body,rbox(3.3,.95,2.2,.12),M.paint,-1.75,1.1,0);
    // Side-seated operator compartment with a canopy.
    add(body,rbox(1.5,1.05,.98,.1),M.paint,.92,2.12,.98);
    add(body,rbox(1.22,.5,.02,.01),M.glass,.88,2.24,1.48);add(body,rbox(.02,.5,.72,.01),M.glass,.16,2.24,.98);
    add(body,rbox(1.8,.12,1.18,.05),M.paint,.92,2.72,.98);
    for(const[x,z]of[[.12,.5],[1.72,.5],[.12,1.46],[1.72,1.46]])add(body,new THREE.CylinderGeometry(.045,.045,.5,10),M.steel,x,2.43,z);
    for(const z of[.72,1.24])add(body,rbox(.05,.08,.34,.02),M.led,.04,2.6,z);
    for(const z of[-.8,.8])add(body,rbox(.05,.12,.4,.02),M.led,-3.42,1.3,z);
    // Lift arms, lift cylinders and the tilt link.
    for(const z of[-.98,.98]){strut(body,V(-.55,1.75,z),V(-3.65,1.0,z),.36,M.paint);
      const a=V(-1.0,.95,z*.92),b=V(-2.55,1.58,z*.92),m=a.clone().lerp(b,.55);strut(body,a,m,.13,M.dark,true);strut(body,m,b,.07,M.chrome,true);}
    strut(body,V(-1.3,2.05,0),V(-3.55,1.85,0),.11,M.chrome,true);strut(body,V(-1.2,2.0,0),V(-2.2,2.0,0),.17,M.dark,true);
    // Bucket: a curved shell with a cutting lip and teeth.
    const s=new THREE.Shape();s.moveTo(0,1.32);s.quadraticCurveTo(-.12,.3,-.5,0);s.lineTo(-2.1,.04);s.lineTo(-2.12,.2);s.lineTo(-.62,.16);s.quadraticCurveTo(-.34,.5,-.16,1.26);s.closePath();
    const bucket=new THREE.Group();add(bucket,new THREE.ExtrudeGeometry(s,{depth:2.62,bevelEnabled:true,bevelThickness:.03,bevelSize:.03,bevelSegments:2,curveSegments:10}),M.paint,0,0,-1.31);
    for(let i=0;i<7;i++)add(bucket,rbox(.26,.09,.16,.03),M.steel,-2.2,.1,-1.08+i*.36);
    bucket.position.set(-3.55,.12,0);body.add(bucket);parts.bucket=bucket;
    // Wheels: lugged mining tyres on steel rims.
    const tyre=new THREE.CylinderGeometry(.9,.9,.78,48,1);tyre.rotateX(Math.PI/2);const rim=new THREE.CylinderGeometry(.52,.52,.8,24);rim.rotateX(Math.PI/2);const hub=new THREE.CylinderGeometry(.2,.2,.84,16);hub.rotateX(Math.PI/2);
    parts.wheels=[];for(const x of[3.1,-2.05])for(const z of[-1.3,1.3]){const w=new THREE.Group();add(w,tyre,M.rubber);add(w,rim,M.steel);add(w,hub,M.chrome);w.position.set(x,.9,z);body.add(w);parts.wheels.push(w);}
    if(auto){parts.beacon=add(body,new THREE.CylinderGeometry(.12,.14,.22,16),new THREE.MeshStandardMaterial({color:'#6a3a06',emissive:'#ffa020',emissiveIntensity:0}),1.4,2.95,.98);
      add(body,new THREE.CylinderGeometry(.14,.14,.12,20),M.dark,.2,2.84,.98);}
    const g=new THREE.Group();body.position.x=.22;g.add(body);g.userData.parts=parts;return g;
  }

  // ---------- two-boom drill jumbo (about 11 m with booms) ----------
  function jumbo(){
    const body=new THREE.Group(),parts={feeds:[],steels:[]};
    add(body,rbox(6.2,.95,2.3,.12),M.paint,.3,1.05,0);add(body,rbox(2.4,1.25,2.2,.1),M.dark,2.3,2.1,0);
    add(body,rbox(2.4,.12,2.4,.05),M.paint,-.9,2.95,0);for(const[x,z]of[[-2,-1.1],[.2,-1.1],[-2,1.1],[.2,1.1]])add(body,new THREE.CylinderGeometry(.05,.05,1.4,10),M.steel,x,2.25,z);
    add(body,rbox(.6,.8,.6,.08),M.dark,-.9,1.95,.3);
    for(const z of[-.6,.6])add(body,rbox(.05,.1,.36,.02),M.led,-2.15,2.85,z);
    const tyre=new THREE.CylinderGeometry(.72,.72,.62,40);tyre.rotateX(Math.PI/2);const rim=new THREE.CylinderGeometry(.4,.4,.64,20);rim.rotateX(Math.PI/2);
    for(const x of[2.3,-1.7])for(const z of[-1.2,1.2]){const w=new THREE.Group();add(w,tyre,M.rubber);add(w,rim,M.steel);w.position.set(x,.72,z);body.add(w);}
    for(const[z,lift]of[[-.62,.25],[.62,-.15]]){
      strut(body,V(-2.6,1.6,z),V(-5.2,1.75+lift,z*.85),.28,M.paint);
      const feed=new THREE.Group();feed.position.set(-5.3,1.75+lift,z*.85);body.add(feed);
      add(feed,rbox(4.2,.2,.2,.04),M.steel,-1.9,0,0);
      const drill=new THREE.Group();add(drill,rbox(.55,.36,.32,.06),M.dark,0,.02,0);drill.position.x=-.3;feed.add(drill);parts.feeds.push(drill);
      const steel=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,3.1,8),M.chrome);steel.rotation.z=Math.PI/2;steel.position.set(-1.8,0,0);drill.add(steel);parts.steels.push(steel);}
    const g=new THREE.Group();body.position.x=.4;g.add(body);g.userData.parts=parts;return g;
  }

  // ---------- a miner in hi-vis with a cap lamp (1.75 m) ----------
  function miner({beam=true}={}){
    const g=new THREE.Group(),legs=[],arms=[];
    for(const x of[-.11,.11]){const hip=new THREE.Group();hip.position.set(x,.9,0);add(hip,rbox(.17,.88,.2,.05),M.pants,0,-.44,0);add(hip,rbox(.18,.05,.21,.02),M.reflect,0,-.62,0);add(hip,rbox(.18,.12,.27,.04),M.dark,0,-.88,.04);g.add(hip);legs.push(hip);}
    add(g,rbox(.46,.64,.29,.09),M.hivis,0,1.22,0);for(const y of[1.1,1.34])add(g,rbox(.47,.05,.3,.02),M.reflect,0,y,0);for(const x of[-.13,.13])add(g,rbox(.05,.62,.3,.02),M.reflect,x,1.22,0);
    add(g,rbox(.17,.12,.09,.03),M.dark,0,.98,-.17);
    for(const x of[-.3,.3]){const sh=new THREE.Group();sh.position.set(x,1.48,0);add(sh,rbox(.12,.58,.14,.05),M.hivis,0,-.29,0);add(sh,new THREE.SphereGeometry(.06,10,8),M.skin,0,-.6,0);g.add(sh);arms.push(sh);}
    add(g,new THREE.SphereGeometry(.11,16,12),M.skin,0,1.66,0);
    add(g,new THREE.SphereGeometry(.142,20,12,0,Math.PI*2,0,Math.PI/2),M.hat,0,1.7,0);add(g,new THREE.CylinderGeometry(.18,.18,.02,24),M.hat,0,1.7,0);
    add(g,rbox(.06,.05,.04,.015),M.led,0,1.76,.14);
    if(beam){const cone=new THREE.ConeGeometry(.42,1.8,24,1,true);cone.translate(0,-.9,0);cone.rotateX(-Math.PI/2-.18);add(g,cone,M.beam,0,1.76,.16);}
    g.userData={legs,arms,walk(t,amt=1){legs[0].rotation.x=Math.sin(t)*.42*amt;legs[1].rotation.x=-Math.sin(t)*.42*amt;arms[0].rotation.x=-Math.sin(t)*.32*amt;arms[1].rotation.x=Math.sin(t)*.32*amt;}};
    return g;
  }

  // ---------- SNO+: acrylic sphere and neck inside a geodesic frame of light sensors ----------
  function snolab(){
    const g=new THREE.Group(),R=.8;
    add(g,new THREE.SphereGeometry(R,64,48),new THREE.MeshPhysicalMaterial({color:'#c6e4ee',metalness:0,roughness:.04,clearcoat:1,transparent:true,opacity:.26,envMapIntensity:2.2,depthWrite:false}));
    add(g,new THREE.SphereGeometry(R*.97,48,32),new THREE.MeshStandardMaterial({color:'#0d2c3a',emissive:'#0b3348',emissiveIntensity:.55,transparent:true,opacity:.42,depthWrite:false}));
    add(g,new THREE.CylinderGeometry(.12,.12,.6,32),new THREE.MeshPhysicalMaterial({color:'#c6e4ee',roughness:.05,clearcoat:1,transparent:true,opacity:.35,envMapIntensity:2}),0,R+.25,0);
    add(g,new THREE.TorusGeometry(.14,.025,10,32),M.steel,0,R+.55,0).rotation.x=Math.PI/2;
    // Stainless geodesic support structure.
    const frame=new THREE.IcosahedronGeometry(1.16,1).attributes.position,edges=new Map(),key=v=>v.toArray().map(n=>n.toFixed(3)).join();
    for(let i=0;i<frame.count;i+=3)for(let k=0;k<3;k++){const a=V().fromBufferAttribute(frame,i+k),b=V().fromBufferAttribute(frame,i+(k+1)%3),id=[key(a),key(b)].sort().join('|');if(!edges.has(id))edges.set(id,[a,b]);}
    const strutGeo=new THREE.CylinderGeometry(.011,.011,1,6),struts=new THREE.InstancedMesh(strutGeo,M.steel,edges.size),o=new THREE.Object3D();let n=0;
    for(const[a,b]of edges.values()){const d=b.clone().sub(a);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),d.clone().normalize());o.scale.set(1,d.length(),1);o.updateMatrix();struts.setMatrixAt(n++,o.matrix);}
    g.add(struts);
    // Light sensors (PMTs): reflective cups facing the centre, dark glass inside.
    const pts=new THREE.IcosahedronGeometry(1.1,3).attributes.position,seen=new Set(),pos=[];for(let i=0;i<pts.count;i++){const v=V().fromBufferAttribute(pts,i),k=key(v);if(!seen.has(k)&&!(v.y>.9&&Math.hypot(v.x,v.z)<.3)){seen.add(k);pos.push(v);}}
    const cupGeo=new THREE.CylinderGeometry(.03,.046,.05,10,1,true),domeGeo=new THREE.SphereGeometry(.026,10,6);
    const cups=new THREE.InstancedMesh(cupGeo,new THREE.MeshStandardMaterial({color:'#c9a75a',metalness:.9,roughness:.28,side:THREE.DoubleSide}),pos.length),domes=new THREE.InstancedMesh(domeGeo,M.glass,pos.length);
    pos.forEach((v,i)=>{o.position.copy(v);o.quaternion.setFromUnitVectors(V(0,1,0),v.clone().normalize().negate());o.scale.set(1,1,1);o.updateMatrix();cups.setMatrixAt(i,o.matrix);o.position.copy(v).multiplyScalar(.985);o.updateMatrix();domes.setMatrixAt(i,o.matrix);});
    g.add(cups,domes);g.userData={size:.95};return g;
  }

  // ---------- a cluster of shatter cones in a slab of footwall rock ----------
  function striatedCone(h,r,seed){
    let geo=new THREE.ConeGeometry(r,h,96,28);geo.deleteAttribute('normal');geo.deleteAttribute('uv');geo=ctx.mergeVertices(geo);
    const p=geo.attributes.position,v=V(),col=new Float32Array(p.count*3),c=new THREE.Color(),base=new THREE.Color('#7d756c'),R=rng(seed),ph=R()*6;
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const a=Math.atan2(v.z,v.x),k=Math.max(0,(h/2-v.y)/h),ridge=Math.abs(Math.sin(a*20+ph+v.y*2.4+Math.sin(a*4+ph)*.9));
      const s=1+ridge*.11*k-Math.sin(a*6+v.y*3+ph)*.05*k;if(v.y>-h/2+.01){v.x*=s;v.z*=s;}p.setXYZ(i,v.x,v.y,v.z);c.copy(base).multiplyScalar(.42+.8*ridge);col.set([c.r,c.g,c.b],i*3);}
    geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.computeVertexNormals();return geo;
  }
  function shatterCone(){
    const g=new THREE.Group(),m=rockMat('#7a7269',{extra:{vertexColors:true},scale:12});
    const slab=new THREE.Mesh(lump(1.05,5,81,{amp:.12,cuts:5,cutDepth:.5}),rockMat('#4a443e',{b:'#8a8379',c:'#141210',scale:46,bump:.008}));slab.scale.set(1.45,.6,1);slab.position.y=-.55;g.add(slab);
    for(const[h,r,x,y,z,rx,rz,seed]of[[1.7,.62,0,.12,0,0,-.12,1],[1.15,.42,-.62,-.12,.22,.1,.32,2],[.9,.34,.58,-.2,-.18,-.08,-.38,3],[.55,.2,.18,-.32,.55,.25,.1,4]]){
      const cone=new THREE.Mesh(striatedCone(h,r,seed),m);cone.position.set(x,y,z);cone.rotation.set(rx,0,rz);g.add(cone);}
    g.rotation.z=-.08;return g;
  }

  // ---------- a mine's deepest station, cut away ----------
  function diorama(kind){
    const g=new THREE.Group(),u={size:.86,narrow:1.25,shift:.24,baseX:.22,baseY:-.5,spinRate:.35,idle:0,sway:.1,lights:[],spot:null};
    const X0=-1.5,X1=1.5,Y0=-.95,Y1=1.05,Z0=-.5,Z1=.45,dx0=-1.34,dx1=1.34,dy0=-.72,dy1=-.17,dzb=-.32,sx0=.24,sx1=.64;
    // Rock block: six boxes merged into one, the outside broken up so it reads as a cut chunk of rock.
    const pieces=[[X0,X1,Y0,dy0,Z0,Z1],[X0,X1,dy0,Y1,Z0,dzb],[X0,dx0,dy0,dy1,dzb,Z1],[dx1,X1,dy0,dy1,dzb,Z1],[X0,sx0,dy1,Y1,dzb,Z1],[sx1,X1,dy1,Y1,dzb,Z1]];
    const geos=pieces.map(([a,b,c,d,e,f])=>{const k=16,geo=new THREE.BoxGeometry(b-a,d-c,f-e,Math.max(1,Math.round((b-a)*k)),Math.max(1,Math.round((d-c)*k)),Math.max(1,Math.round((f-e)*k)));geo.translate((a+b)/2,(c+d)/2,(e+f)/2);geo.deleteAttribute('uv');return geo;});
    const rockGeo=mergeGeometries(geos),p=rockGeo.attributes.position,v=V(),eq=(a,b)=>Math.abs(a-b)<1e-4;
    const nz=(x,y,z)=>Math.sin(x*7.1+Math.sin(z*5.3)*1.6)*.5+Math.sin(y*6.3+x*3.7)*.3+Math.sin(z*11+y*9)*.2;
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=nz(v.x,v.y,v.z);
      if(eq(v.x,X0))v.x-=.06+n*.06;else if(eq(v.x,X1))v.x+=.06+n*.06;
      if(eq(v.y,Y1))v.y+=.08+n*.09;else if(eq(v.y,Y0))v.y-=.04+n*.04;
      if(eq(v.z,Z0))v.z-=.03+n*.03;
      if(!eq(v.z,Z1)&&!eq(v.x,X0)&&!eq(v.x,X1)&&!eq(v.y,Y0)&&!eq(v.y,Y1)&&!eq(v.z,Z0)){v.x+=n*.008;v.y+=nz(v.z,v.x,v.y)*.008;v.z+=nz(v.y,v.z,v.x)*.008;}
      p.setXYZ(i,v.x,v.y,v.z);}
    rockGeo.computeVertexNormals();
    const rockColor={nrs:'#3a3632',garson:'#3d3936',creighton:'#36322f',onaping:'#3a3634'}[kind];
    g.add(new THREE.Mesh(rockGeo,rockMat(rockColor,{b:'#8d867b',c:'#0f0e0d',scale:70,bump:.008})));
    // Roadway, rock bolts and screen mesh.
    add(g,new THREE.BoxGeometry(dx1-dx0,.016,Z1-dzb),rockMat('#3a3632',{b:'#6a645c',c:'#121110',scale:120,bump:.01}),0,dy0+.008,(Z1+dzb)/2);
    const plates=[];for(let x=dx0+.1;x<dx1-.05;x+=.16){if(x>sx0-.05&&x<sx1+.05)continue;for(let z=dzb+.08;z<Z1-.05;z+=.16)plates.push([x,dy1-.002,z,0]);for(let y=dy0+.14;y<dy1-.04;y+=.14)plates.push([x,y,dzb+.002,1]);}
    const bolts=new THREE.InstancedMesh(new THREE.BoxGeometry(.034,.006,.034),M.steel,plates.length),o=new THREE.Object3D();
    plates.forEach(([x,y,z,wall],i)=>{o.position.set(x,y,z);o.rotation.set(wall?Math.PI/2:0,0,0);o.updateMatrix();bolts.setMatrixAt(i,o.matrix);});g.add(bolts);
    const grid=[];for(let x=dx0;x<=dx1;x+=.055){grid.push(x,dy0+.03,dzb+.004,x,dy1,dzb+.004);}for(let y=dy0+.03;y<=dy1;y+=.055)grid.push(dx0,y,dzb+.004,dx1,y,dzb+.004);
    const gm=new THREE.BufferGeometry();gm.setAttribute('position',new THREE.Float32BufferAttribute(grid,3));g.add(new THREE.LineSegments(gm,M.mesh));
    // Ventilation duct, service pipes and the shaft's steel.
    const duct=new THREE.CylinderGeometry(.06,.06,dx1-dx0-.04,20,1);duct.rotateZ(Math.PI/2);add(g,duct,M.duct,0,dy1-.09,dzb+.1);
    for(let x=dx0+.15;x<dx1;x+=.32)add(g,new THREE.BoxGeometry(.008,.05,.008),M.steel,x,dy1-.025,dzb+.1);
    for(const[y,c]of[[dy0+.13,M.steel],[dy0+.18,M.dark]]){const pipe=new THREE.CylinderGeometry(.013,.013,dx1-dx0-.02,10);pipe.rotateZ(Math.PI/2);add(g,pipe,c,0,y,dzb+.03);}
    for(const x of[sx0+.07,sx1-.07])add(g,new THREE.BoxGeometry(.03,Y1-dy1+.1,.03),M.steel,x,(Y1+dy1)/2,.02);
    for(let y=dy1+.12;y<Y1;y+=.2)add(g,new THREE.BoxGeometry(sx1-sx0,.028,.04),M.steel,(sx0+sx1)/2,y,-.06);
    // The cage and its hoist rope.
    const cage=new THREE.Group(),cw=.3,ch=.36,cd=.3;
    for(const[x,z]of[[-1,-1],[1,-1],[-1,1],[1,1]])add(cage,new THREE.BoxGeometry(.016,ch,.016),M.steel,x*cw/2,ch/2,z*cd/2);
    for(const y of[0,ch])add(cage,new THREE.BoxGeometry(cw,.02,cd),M.steel,0,y,0);
    for(let i=1;i<6;i++)add(cage,new THREE.BoxGeometry(cw,.006,.006),M.steel,0,i*ch/6,cd/2);
    add(cage,new THREE.BoxGeometry(.05,.012,.05),M.led,0,ch-.016,0);
    const cageY0=dy0+.02,cageY1=Y1-ch-.05;cage.position.set((sx0+sx1)/2,cageY0,.06);g.add(cage);
    const rope=add(g,new THREE.CylinderGeometry(.006,.006,1,6),M.chrome,(sx0+sx1)/2,0,.06);
    const lamps=[-1.02,-.38,.98].map(x=>{const fx=add(g,new THREE.CapsuleGeometry(.018,.09,4,8),kind==='nrs'?M.ledOff:kind==='onaping'?M.ledCool:M.led,x,dy1-.035,-.02);fx.rotation.z=Math.PI/2;const a=new THREE.Object3D();a.position.set(x,dy1-.09,.05);g.add(a);return a;});
    const warm=0xffc58a,cool=0xdde9ff;
    let tick=()=>{};
    if(kind==='nrs'){
      // Idle since 2024: one amber work light, a parked cage, a barricade across the drift.
      const lamp=add(g,new THREE.SphereGeometry(.03,12,8),M.amber,-.6,dy0+.06,dzb+.06);const a=new THREE.Object3D();a.position.set(-.6,dy0+.2,0);g.add(a);
      u.lights=[{anchor:a,color:0xff9a3a,intensity:.6,distance:1.4}];
      for(const z of[dzb+.08,Z1-.08])add(g,new THREE.CylinderGeometry(.014,.014,.26,10),M.paint,.95,dy0+.13,z);
      const pts=[];for(let i=0;i<=16;i++){const t=i/16;pts.push(V(.95,dy0+.24-Math.sin(t*Math.PI)*.05,dzb+.08+t*(Z1-dzb-.16)));}
      add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.006,6),M.steel);
      add(g,new THREE.BoxGeometry(.004,.08,.12),new THREE.MeshStandardMaterial({color:'#c8281e',roughness:.6}),.95,dy0+.18,(Z1+dzb)/2);
      tick=t=>{lamp.material.emissiveIntensity=1+Math.sin(t*1.7)*.15;rope.scale.y=Y1-cageY0-ch;rope.position.y=cageY0+ch+(Y1-cageY0-ch)/2;};
      u.dim=true;
    }else{
      u.lights=lamps.map(a=>({anchor:a,color:kind==='onaping'?cool:warm,intensity:1.4,distance:1.15}));
    }
    if(kind==='garson'){
      const j=jumbo();j.scale.setScalar(.092);j.position.set(-.62,dy0+.016,.07);g.add(j);
      const op=miner();op.scale.setScalar(.105);op.position.set(-.02,dy0+.016,.25);op.rotation.y=-Math.PI/2+.4;g.add(op);
      const dust=new THREE.InstancedMesh(new THREE.SphereGeometry(.02,8,6),new THREE.MeshStandardMaterial({color:'#9a9086',transparent:true,opacity:.35,roughness:1,depthWrite:false}),24),d=new THREE.Object3D(),R=rng(5),seeds=Array.from({length:24},()=>[R(),R(),R()]);g.add(dust);
      tick=(t,dt)=>{const{feeds,steels}=j.userData.parts;feeds.forEach((f,i)=>{const c=(Math.sin(t*.9+i*1.7)*.5+.5);f.position.x=-.3-c*1.6;steels[i].rotation.x+=dt*40;});
        seeds.forEach(([a,b,c2],i)=>{const k=(t*.4+a)%1;d.position.set(dx0+.04+k*.25,dy0+.12+b*.22+k*.08,-.05+c2*.3);d.scale.setScalar(.6+k*2.2);d.updateMatrix();dust.setMatrixAt(i,d.matrix);});dust.instanceMatrix.needsUpdate=true;dust.material.opacity=.28;
        rope.scale.y=Y1-cageY0-ch;rope.position.y=cageY0+ch+(Y1-cageY0-ch)/2;};
    }
    if(kind==='creighton'||kind==='onaping'){
      const auto=kind==='onaping',l=loader({auto});l.scale.setScalar(.09);l.position.set(0,dy0+.016,.07);g.add(l);
      const head=new THREE.Object3D();head.position.set(-.55,.15,0);l.add(head);const aim=new THREE.Object3D();aim.position.set(-6,.0,0);l.add(aim);
      if(auto)u.spot={anchor:head,target:aim,color:cool,intensity:3,distance:1.6,angle:.55};
      const miners=auto?[]:[miner(),miner()];miners.forEach((m,i)=>{m.scale.setScalar(.105);g.add(m);});
      if(miners[1]){miners[1].position.set(.44,dy0+.016,.3);miners[1].rotation.y=Math.PI*.95;}
      let cam=null;if(auto){add(g,new THREE.BoxGeometry(.06,.04,.04),M.dark,1.16,dy1-.07,dzb+.03);cam=add(g,new THREE.SphereGeometry(.008,8,6),M.tail,1.13,dy1-.07,dzb+.055);
        add(g,new THREE.BoxGeometry(.008,.22,.16),M.dark,dx1-.004,dy0+.13,.05);add(g,new THREE.BoxGeometry(.01,.16,.02),M.green,dx1-.008,dy0+.13,.0);}
      tick=(t,dt)=>{
        // The loader shuttles along the drift; mining LHDs drive both ways without turning.
        const c=Math.sin(t*.32),x=c*.72;l.position.x=x;l.userData.parts.wheels.forEach(w=>w.rotation.z=-x/(.9*.09));l.userData.parts.bucket.rotation.z=Math.max(0,-Math.cos(t*.32))*.18;
        if(auto){const b=l.userData.parts.beacon;b.material.emissiveIntensity=(Math.sin(t*6)>0)?2.4:.15;cam.material.emissiveIntensity=(t%2<.15)?2.5:.4;}
        if(miners[0]){const w=Math.sin(t*.22),mx=-.75+w*.42;miners[0].position.set(mx,dy0+.016,-.16);miners[0].rotation.y=Math.cos(t*.22)>0?Math.PI/2:-Math.PI/2;miners[0].userData.walk(t*5.2);}
        // The cage rides the shaft: waits at the station, then climbs out of view and returns.
        const cyc=(t*.08)%1,s=cyc<.35?0:cyc<.5?(cyc-.35)/.15:cyc<.85?1:1-(cyc-.85)/.15,e=s*s*(3-2*s);cage.position.y=cageY0+(cageY1-cageY0)*e;
        rope.scale.y=Math.max(.01,Y1-cage.position.y-ch);rope.position.y=cage.position.y+ch+rope.scale.y/2;};
    }
    u.tick=(dt,now)=>tick(now,dt);g.userData=u;return g;
  }

  return{loader,jumbo,miner,snolab,shatterCone,diorama,M};
}
