import * as CANNON from "cannon-es"

export class Physic {
  private lastTime: number
  constructor(
    public readonly world: CANNON.World,
    public readonly ballMaterial: CANNON.Material,
    public readonly groundMaterial: CANNON.Material
  ) {
    this.init()
    this.lastTime = performance.now()
  }


  animate() {
    let time = performance.now();
    let delta = (time - this.lastTime) / 1000;  // Convert to seconds
    this.lastTime = time;
    // this.world.step(1/60, delta, 10)

    
    // (this.world.solver as CANNON.GSSolver).iterations = 10
    requestAnimationFrame(this.animate.bind(this))
    this.world.fixedStep(1/160, 10);
  }

  init() {
    this.world.defaultContactMaterial.restitution = 0.5;
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.allowSleep = true;
    let sphereGroundContact = new CANNON.ContactMaterial(this.groundMaterial, this.ballMaterial, {
      restitution: 0
    });
    this.world.addContactMaterial(sphereGroundContact);
  }

  start() {
    this.animate();
  }

  static create(): Physic {
    return new Physic(new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0), // m/s²
    }),
      new CANNON.Material({ restitution: 1, friction: 0.1 }), // balls
      new CANNON.Material({ restitution: 0.3, friction: 0.2 }) // ground
    )
  }
}