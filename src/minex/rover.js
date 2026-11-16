// The team's robot driving along the Ramsey Lake shore on the hero skyline.
// A small transparent canvas of its own, layered just above the skyline, so trees and
// buildings never hide it. It only renders while the surface is on screen.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
export function createRover(canvas,robotPromise,onMove){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setClearColor(0x000000,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  const pmrem=new THREE.PMREMGenerator(renderer),scene=new THREE.Scene();scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;pmrem.dispose();
  scene.environmentIntensity=.45;
  // Dusk light: a warm glow from the sunset on the right, a cool sky from above.
  scene.add(new THREE.HemisphereLight(0x5a5878,0x2a160c,.9));
  const sun=new THREE.DirectionalLight(0xffa868,2.6);sun.position.set(6,2.5,4);scene.add(sun);
  const rim=new THREE.DirectionalLight(0x8fa6ff,.9);rim.position.set(-5,4,-4);scene.add(rim);
  const camera=new THREE.OrthographicCamera(-1,1,1,0,-20,20);camera.position.set(0,0,10);

  // A soft contact shadow so the robot sits on the ground rather than floating over it.
  const shadowTex=(()=>{const c=document.createElement('canvas');c.width=128;c.height=32;const x=c.getContext('2d'),g=x.createRadialGradient(64,16,2,64,16,62);g.addColorStop(0,'rgba(0,0,0,.75)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,128,32);return new THREE.CanvasTexture(c);})();
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.9,.32),new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}));shadow.position.set(0,.02,-.4);
  const rover=new THREE.Group();rover.add(shadow);scene.add(rover);
  const body=new THREE.Group();rover.add(body);
  let ready=false,active=false,raf=0,last=0,halfW=1,x=-.5,dir=1,turn=0,yaw=0,t=0;
  robotPromise.then(r=>{if(!r)return;const m=r.clone(true);m.rotation.set(0,0,0);m.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(m),size=box.getSize(new THREE.Vector3()),s=1/size.y;m.scale.multiplyScalar(s);m.updateMatrixWorld(true);
    const b2=new THREE.Box3().setFromObject(m),c=b2.getCenter(new THREE.Vector3());m.position.x-=c.x;m.position.z-=c.z;m.position.y-=b2.min.y;
    body.add(m);body.rotation.x=.16;ready=true;resize();kick();});

  function resize(){
    const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(w,h,false);
    // One world unit is the robot's height: about 4.5% of the viewport, never in your face.
    const px=Math.max(26,Math.min(54,innerHeight*.045)),units=h/px;halfW=w/px/2;
    camera.left=-halfW;camera.right=halfW;camera.top=units-.25;camera.bottom=-.25;camera.updateProjectionMatrix();
    if(x<-halfW||x>halfW)x=-halfW*.2;
  }
  addEventListener('resize',()=>{resize();kick();});
  function frame(now){
    raf=0;if(!active||!ready)return;
    const dt=Math.min(.05,(now-(last||now))/1000);last=now;
    if(!reduced.matches){
      t+=dt;
      // Drive along the shore; at either edge, slow down and make a U-turn.
      const edge=halfW*.86;
      if(turn>0){turn=Math.max(0,turn-dt/1.6);yaw+=(dir*Math.PI/2-yaw)*(1-Math.exp(-dt*5));}
      else{x+=dir*dt*.62;if((dir>0&&x>edge)||(dir<0&&x<-edge)){dir=-dir;turn=1;}yaw+=(dir*Math.PI/2-yaw)*(1-Math.exp(-dt*5));}
    }else{yaw=Math.PI/2;}
    rover.position.x=x;body.rotation.y=yaw;body.position.y=reduced.matches?0:Math.abs(Math.sin(t*11))*.012;
    renderer.render(scene,camera);onMove?.((x+halfW)/(2*halfW),canvas.clientHeight/(camera.top-camera.bottom));
    if(!reduced.matches)raf=requestAnimationFrame(frame);
  }
  function kick(){if(active&&ready&&!raf){last=0;raf=requestAnimationFrame(frame);}}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else kick();});
  resize();
  return{setActive(v){if(v===active)return;active=v;if(v)kick();else{cancelAnimationFrame(raf);raf=0;}}};
}
