import { Engine } from "../engine"
import { ClientSocketHandler } from "../webSocket"
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { MeshBasicMaterial, SpotLightHelper } from "three";
import { loadGLBModel, randomColor } from "../utils";
import { Body, Box, ConvexPolyhedron, Cylinder, Heightfield, Material, Plane, Sphere, Vec3, World, Trimesh, Ray, RaycastResult } from "cannon-es";
import { Physic } from "./Physics"
import CannonDebugRenderer from "./CannonDebugRenderer";


class Billard {
    private engine: Engine
    private clientSocketHandler: ClientSocketHandler
    private balls: any[]
    private controller: OrbitControls
    private physic: Physic
    private plane: any
    private table: any
    private cue: any
    private cannonDebugRenderer: CannonDebugRenderer
    private ray: Ray[]
    private focusWhiteBall: boolean
    constructor() {
        this.engine = Engine.create({
            canvas: document.getElementById('canvas')! as HTMLCanvasElement,
            computeFrame: this.computeFrame.bind(this),
            setup: this.setup.bind(this)
        });

        this.focusWhiteBall = false;

        this.clientSocketHandler = new ClientSocketHandler()
        document.querySelector("#invite")?.addEventListener("click", () => {
            let playerInvitedPseudo: string = window.prompt("Choose a player to invite :")
            if (playerInvitedPseudo != "undefined" && playerInvitedPseudo != null) 
                this.clientSocketHandler.inviteInCurrentGame(playerInvitedPseudo)
        })
        document.querySelector("#leave")?.addEventListener("click", () => {
            this.clientSocketHandler.leaveGame()
            console.log({clientSocketHandler})
        })

        document.querySelector("#accept")?.addEventListener("click", () => {
            this.clientSocketHandler.acceptGameInvitation(document.querySelector("#hote").textContent)
            document.querySelector("#invitation").style.display = "none";
        })

        document.querySelector("#refuse")?.addEventListener("click", () => {
            document.querySelector("#invitation").style.display = "none";
        })

        function join(PlayerHostPseudo: string) {
            this.clientSocketHandler.acceptGameInvitation(playerHostPseudo)
        }

        this.balls = [];
        this.controller = new OrbitControls(this.engine.camera, this.engine.canvas);
        this.physic = Physic.create();
        this.cannonDebugRenderer = new CannonDebugRenderer(this.engine.scene, this.physic.world)
        this.ray = []
    }

    computeFrame(currentTime: number) {
        this.balls.forEach((ball, index) => {
            ball.object.position.copy(ball.physic.position)
            ball.object.quaternion.copy(ball.physic.quaternion)
            if (this.clientSocketHandler.socket.readyState == 1) {
                this.clientSocketHandler.updateObjectPosition(index, ball.physic.position, ball.physic.quaternion)
                if(this.clientSocketHandler.getBallPosition(index) != false && typeof(this.clientSocketHandler.getBallPosition(index)) != 'undefined') {
                    let position = this.clientSocketHandler.getBallPosition(index)
                    let quaternion = this.clientSocketHandler.getBallQuaternion(index)
                    position = new Vec3(position.x, position.y, position.z)
                    ball.object.position.copy(position)

                    ball.object.quaternion.x = quaternion.x
                    ball.object.quaternion.y = quaternion.y
                    ball.object.quaternion.z = quaternion.z
                    ball.object.quaternion.w = quaternion.w
                }
            }
            if (this.focusWhiteBall && ball.object.name.includes("White")) {
                this.engine.camera.lookAt(ball.object.position)
            }
        })

        if (this.cue) {
            const camPosition = this.engine.camera.position;
            const camQuaternion = this.engine.camera.quaternion;
            this.cue.position.set(camPosition.x, camPosition.y - 1, camPosition.z)
            this.cue.quaternion.copy(camQuaternion)
        }

        if (this.plane) {
            if (this.plane.object) {
                this.plane.object.quaternion.copy(this.plane.physic.quaternion)
                this.plane.object.position.copy(this.plane.physic.position)
            }
        }

        if (this.table) {
            if (this.table.object) {
                this.table.object.quaternion.copy(this.table.physic.quaternion)
                this.table.object.position.copy(this.table.physic.position)
            }
        }

        this.ray.forEach(ray => {
            let result = new RaycastResult();
            this.physic.world.raycastClosest(ray.from, ray.to, {}, result);

            // If the ray hits an object, create a Three.js line to represent the ray
            if (result.hasHit) {
                let hitPoint = result.hitPointWorld;
                let lineGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ray.from.x, ray.from.y, ray.from.z), new THREE.Vector3(hitPoint.x, hitPoint.y, hitPoint.z)]);
                let lineMaterial = new THREE.LineBasicMaterial({ color: randomColor() });
                let line = new THREE.Line(lineGeometry, lineMaterial);
                this.engine.scene.add(line);

                const ballHit = this.balls.filter(ball => ball.physic === result.body) // Récupère la balle qui a été détectée

                if (!ballHit[0].object.name.includes("White")) {
                    this.physic.world.removeBody(result.body as Body);
                    this.engine.scene.remove(ballHit[0].object)
                }
            }
        })

        // if (this.ray) {
        //     // Use the ray to check for collisions with other objects in the world
        //     let result = new RaycastResult();
        //     this.physic.world.raycastClosest(this.ray.from, this.ray.to, {}, result);

        //     // If the ray hits an object, create a Three.js line to represent the ray
        //     if (result.hasHit) {
        //         let hitPoint = result.hitPointWorld;
        //         let lineGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(this.ray.from.x, this.ray.from.y, this.ray.from.z), new THREE.Vector3(hitPoint.x, hitPoint.y, hitPoint.z)]);
        //         let lineMaterial = new THREE.LineBasicMaterial({ color: randomColor() });
        //         let line = new THREE.Line(lineGeometry, lineMaterial);
        //         this.engine.scene.add(line);

        //         const ballHit = this.balls.filter(ball => ball.physic === result.body) // Récupère la balle qui a été détectée

        //         if (!ballHit[0].object.name.includes("White")) {
        //             this.physic.world.removeBody(result.body as Body);
        //             this.engine.scene.remove(ballHit[0].object)
        //         }
        //     }
        // }

        // this.cannonDebugRenderer.update()
    }

    async setup(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
        const ballsAndCue = await loadGLBModel('../balls_and_cue.glb');



        const table = await loadGLBModel('../table.glb');

        table.scale.set(0.014, 0.014, 0.014)
        table.receiveShadow = true;
        table.castShadow = true;
        scene.add(table)


        // const vertices = [];
        // for (let i = 0; i < table.children[0].children[1].children[0].geometry.attributes.position.array.length; i += 3) {
        //     const vertex = new Vec3(
        //         table.children[0].children[1].children[0].geometry.attributes.position.array[i],
        //         table.children[0].children[1].children[0].geometry.attributes.position.array[i + 1],
        //         table.children[0].children[1].children[0].geometry.attributes.position.array[i + 2]
        //     );
        //     vertices.push(vertex);
        // }

        // const shape = new ConvexPolyhedron({
        //     vertices,
        //     faces: [],
        // });

        // const tableBody = new Body({
        //     mass: 0,
        //     shape,
        // });

        // this.table = {
        //     object: table.children[0].children[1],
        //     physic: tableBody
        // }

        // tableBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)

        // this.physic.world.addBody(tableBody)

        // scene.add(table);

        const groundBody = new Body({
            mass: 0,
            shape: new Box(new Vec3(5, 5, 10)),
            type: Body.STATIC,
            material: this.physic.groundMaterial
        })
        groundBody.quaternion.setFromEuler(Math.PI / 2, 0, 0)
        groundBody.position.set(0, 0.08, 0)

        this.plane = {
            object: new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshStandardMaterial({ color: 0x575757, side: THREE.DoubleSide })),
            physic: groundBody
        }

        this.physic.world.addBody(groundBody)
        // scene.add(this.plane.object)

        const wall1 = new Body({
            mass: 0,
            shape: new Box(new Vec3(1.5, 0.5, 0.2)),
            type: Body.STATIC,
            material: this.physic.groundMaterial
        })
        wall1.position.set(1.6, 10, 1.72)
        this.physic.world.addBody(wall1)


        const wall2 = new Body({
            mass: 0,
            shape: new Box(new Vec3(1.5, 0.5, 0.2)),
            type: Body.STATIC,
            material: this.physic.groundMaterial
        })
        wall2.position.set(-1.6, 10, 1.72)
        this.physic.world.addBody(wall2)

        const wall3 = new Body({
            mass: 0,
            shape: new Box(new Vec3(1.8, 0.5, 0.2)),
            type: Body.STATIC,
            material: this.physic.groundMaterial
        })
        wall3.position.set(3.1, 10, 0)
        wall3.quaternion.setFromEuler(0, Math.PI / 2, 0)
        this.physic.world.addBody(wall3)

        const wall4 = new Body({
            mass: 0,
            shape: new Box(new Vec3(1.5, 0.5, 0.2)),
            type: Body.STATIC,
            material: this.physic.groundMaterial
        })
        wall4.position.set(-1.6, 10, -1.72)
        this.physic.world.addBody(wall4)

        const wall5 = new Body({
            mass: 0,
            shape: new Box(new Vec3(1.5, 0.5, 0.2)),
            type: Body.STATIC,
            material: this.physic.groundMaterial
        })
        wall5.position.set(1.6, 10, -1.72)
        this.physic.world.addBody(wall5)

        const wall6 = new Body({
            mass: 0,
            shape: new Box(new Vec3(1.8, 0.5, 0.2)),
            type: Body.STATIC,
            material: this.physic.groundMaterial
        })
        wall6.position.set(-3.1, 10, 0)
        wall6.quaternion.setFromEuler(0, -Math.PI / 2, 0)
        this.physic.world.addBody(wall6)

        const wall7 = new Body({
            mass: 0,
            shape: new Box(new Vec3(0.5, 0.15, 0.2)),
            type: Body.STATIC,
            material: this.physic.groundMaterial
        })
        wall7.position.set(0, 10, 1.82)
        wall7.quaternion.setFromEuler(0, 0, Math.PI / 2)
        this.physic.world.addBody(wall7)

        const wall8 = new Body({
            mass: 0,
            shape: new Box(new Vec3(0.5, 0.15, 0.2)),
            type: Body.STATIC,
            material: this.physic.groundMaterial
        })
        wall8.position.set(0, 10, -1.82)
        wall8.quaternion.setFromEuler(0, 0, Math.PI / 2)
        this.physic.world.addBody(wall8)

        // const hole1 = new Body({
        //     mass: 0,
        //     shape: new Cylinder(1, 1, 1, 2),
        //     type: Body.STATIC,
        //     material: this.physic.groundMaterial
        // })
        // this.physic.world.addBody(hole1)


        scene.add(new THREE.AmbientLight('#fff', 40))

        const light = new THREE.SpotLight("#fff", 20, 20, 1, 0)
        light.position.y = 20
        light.castShadow = true
        light.shadow.mapSize.width = 512
        light.shadow.mapSize.height = 512
        scene.add(light)

        // Create a new Cannon.js ray
        this.ray.push(new Ray(new Vec3(-0.15, 10.15, -1.55), new Vec3(0.15, 10.15, -1.55)));
        this.ray.push(new Ray(new Vec3(3, 10.15, 1.55), new Vec3(-0.15, 10.15, 1.55)));
        this.ray.push(new Ray(new Vec3(-2.95, 10.15, -1.4), new Vec3(-2.80, 10.15, -1.58)));
        this.ray.push(new Ray(new Vec3(2.95, 10.15, 1.4), new Vec3(2.80, 10.15, 1.58)));
        this.ray.push(new Ray(new Vec3(-2.95, 10.15, 1.4), new Vec3(-2.80, 10.15, 1.58)));
        this.ray.push(new Ray(new Vec3(2.95, 10.15, -1.4), new Vec3(2.80, 10.15, -1.58)));

        setTimeout(() => {
            // Init balls
            this.initBalls(ballsAndCue);
            this.initCue(ballsAndCue);

            // Init event shoot button
            let lockBtn = document.getElementById("lockBtn") as HTMLElement;
            lockBtn.addEventListener('click', function () {
                // GET WHITE BALL
                const whiteBall = this.balls.filter(ball => ball.object.name.includes("White"))[0]

                this.engine.camera.position.set(whiteBall.physic.position.x + 2, whiteBall.physic.position.y + 1, whiteBall.physic.position.z)
                this.engine.camera.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)

                lockBtn.style.display = "none"

                const unlockBtn = document.getElementById("unlockBtn") as HTMLElement
                unlockBtn.style.display = "block"

                const shootBtn = document.getElementById("shootBtn") as HTMLElement
                shootBtn.style.display = "block"

                this.focusWhiteBall = true
            }.bind(this))

            const unlockBtn = document.getElementById("unlockBtn") as HTMLElement
            unlockBtn.onclick = function (e) {
                unlockBtn.style.display = "none"
                lockBtn.style.display = "block"
                shootBtn.style.display = "none"
                this.focusWhiteBall = false
            }.bind(this)

            const shootBtn = document.getElementById("shootBtn") as HTMLElement
            const shootPower = document.getElementById("jauge") as HTMLElement

            let action;
            let invert = false;
            shootBtn.onmousedown = function () {
                console.log("mouse down");

                action = setInterval(() => {
                    invert ? shootPower.value -= 1 : shootPower.value += 1;

                    if (shootPower.value === 100) {
                        invert = true;
                    }

                    if (shootPower.value === 0) {
                        invert = false;
                    }
                }, 10)
            }.bind(this)

            shootBtn.onmouseup = function () {
                console.log("mouse up");
                clearInterval(action)

                //Shoot the white ball
                const cuePosition = this.cue.position;
                const whiteBall = this.balls.filter(ball => ball.object.name.includes("White"))[0]
                const whiteBallPosition = whiteBall.object.position;

                
                const maxForce = -7;
                
                const direction = normalizeVector([cuePosition.x - whiteBallPosition.x, 0, cuePosition.z - whiteBallPosition.z])
                console.log(new Vec3((maxForce * shootPower.value / 100) * direction[0], 0, (maxForce * shootPower.value / 100) * direction[2]));
                
                whiteBall.physic.applyImpulse(new Vec3((maxForce * shootPower.value / 100) * direction[0], 0, (maxForce * shootPower.value / 100) * direction[2]));
                
                shootPower.value = 0

            }.bind(this)

            function normalizeVector(vector) {
                const x = vector[0];
                const y = vector[1];
                const z = vector[2];
              
                // Compute magnitude of the vector
                const magnitude = Math.sqrt(x * x + y * y + z * z);
              
                // Normalize the vector
                const normalized_vector = [x / magnitude, y / magnitude, z / magnitude];
              
                // Set maximum values to 1 or -1
                const normalized_vector_max = [
                  x >= 0 ? Math.min(normalized_vector[0], 1) : Math.max(normalized_vector[0], -1),
                  y >= 0 ? Math.min(normalized_vector[1], 1) : Math.max(normalized_vector[1], -1),
                  z >= 0 ? Math.min(normalized_vector[2], 1) : Math.max(normalized_vector[2], -1),
                ];
              
                return normalized_vector_max;
              }


        }, 1500);


        camera.position.z = 5
        camera.position.y = 12
        camera.rotation.x = -0.5



        // Websocket Setup
        this.clientSocketHandler.setup();

        let clientSocketHandler = this.clientSocketHandler
        var verifyWebsocket = setInterval(() => {
            if (clientSocketHandler.socket.readyState == 1 && this.clientSocketHandler.isConnected != 1) {
                clientSocketHandler.getPlayerPseudo();
                this.clientSocketHandler.isConnected = 1;
                clearInterval(verifyWebsocket)
            } else {
                console.log("WebSocket non trouvée, vérifier les paramètres dans webSocket.ts l.10")
            }
        }, 2000);

    }

    initCue(model: THREE.Mesh | THREE.Object3D) {
        const cue = model.children.filter(piece => piece.name.includes("Cue"))[0];

        cue.position.set(0, 11, 0);
        cue.scale.set(1, 1, 2)

        this.engine.scene.add(cue);
        this.cue = cue;
    }

    initBalls(model: THREE.Mesh | THREE.Object3D) {
        model.children.forEach(piece => {
            piece.scale.set(2, 2, 2)
            if (piece.name.startsWith("PoolBall")) {
                const boundingBox = new THREE.Box3().setFromObject(piece);

                const size = new THREE.Vector3();
                boundingBox.getSize(size);

                const radius = 0.0615 // m
                const ballBody = new Body({
                    mass: 0.209, // kg
                    shape: new Sphere(radius),
                    material: this.physic.ballMaterial
                })
                const firstBallPosition = { x: -1.2, y: 11, z: 0 };
                const espacementX = 0.115
                const espacementZ = 0.063
                ballBody.velocity.set(0, 0, 0);
                ballBody.quaternion.setFromEuler(3.4, 0, 1.7)

                switch (piece.userData["name"]) {
                    case "PoolBall_1":
                        ballBody.position.set(firstBallPosition["x"], firstBallPosition["y"], firstBallPosition["z"])
                        break;
                    case "PoolBall_2":
                        ballBody.position.set(firstBallPosition["x"] - espacementX, firstBallPosition["y"], firstBallPosition["z"] + espacementZ)
                        break;
                    case "PoolBall_3":
                        ballBody.position.set(firstBallPosition["x"] - (espacementX) * 2, firstBallPosition["y"], firstBallPosition["z"] + (espacementZ) * 2)
                        break;
                    case "PoolBall_4":
                        ballBody.position.set(firstBallPosition["x"] - (espacementX) * 3, firstBallPosition["y"], firstBallPosition["z"] + (espacementZ) * 3)
                        break;
                    case "PoolBall_5":
                        ballBody.position.set(firstBallPosition["x"] - (espacementX) * 4, firstBallPosition["y"], firstBallPosition["z"] - (espacementZ) * 4)
                        break;
                    case "PoolBall_6":
                        ballBody.position.set(firstBallPosition["x"] - (espacementX) * 4, firstBallPosition["y"], firstBallPosition["z"] + (espacementZ) * 2)
                        break;
                    case "PoolBall_7":
                        ballBody.position.set(firstBallPosition["x"] - (espacementX) * 3, firstBallPosition["y"], firstBallPosition["z"] - espacementZ)
                        break;
                    case "PoolBall_8":
                        ballBody.position.set(firstBallPosition["x"] - (espacementX) * 2, firstBallPosition["y"], firstBallPosition["z"])
                        break;
                    case "PoolBall_9":
                        ballBody.position.set(firstBallPosition["x"] - espacementX, firstBallPosition["y"], firstBallPosition["z"] - espacementZ)
                        break;
                    case "PoolBall_10":
                        ballBody.position.set(firstBallPosition["x"] - (espacementX) * 2, firstBallPosition["y"], firstBallPosition["z"] - (espacementZ) * 2)
                        break;
                    case "PoolBall_11":
                        ballBody.position.set(firstBallPosition["x"] - (espacementX) * 3, firstBallPosition["y"], firstBallPosition["z"] - (espacementZ) * 3)
                        ballBody.quaternion.setFromEuler(3.3, 0, 0.2)
                        break;
                    case "PoolBall_12":
                        ballBody.position.set(firstBallPosition["x"] - (espacementX) * 4, firstBallPosition["y"], firstBallPosition["z"] + (espacementZ) * 4)
                        ballBody.quaternion.setFromEuler(3.1, 0, 4.9)
                        break;
                    case "PoolBall_13":
                        ballBody.position.set(firstBallPosition["x"] - (espacementX) * 4, firstBallPosition["y"], firstBallPosition["z"] - (espacementZ) * 2)
                        break;
                    case "PoolBall_14":
                        ballBody.position.set(firstBallPosition["x"] - (espacementX) * 3, firstBallPosition["y"], firstBallPosition["z"] + espacementZ)
                        break;
                    case "PoolBall_15":
                        ballBody.position.set(firstBallPosition["x"] - (espacementX) * 4, firstBallPosition["y"], firstBallPosition["z"])
                        break;
                    case "PoolBall_White":
                        ballBody.position.set(firstBallPosition["x"] + 2.8, firstBallPosition["y"], firstBallPosition["z"])
                        setTimeout(() => {
                            ballBody.applyImpulse(new Vec3(-6, 0, 0))
                        }, 1500);
                        break;
                }

                ballBody.angularVelocity.set(0, 0, 0);
                ballBody.linearDamping = 0.5
                ballBody.angularDamping = 0.5

                console.log(piece.children[0])
                piece.children[0].receiveShadow = true


                let ball = {}
                ball = {
                    object: piece,
                    physic: ballBody
                }


                this.physic.world.addBody(ballBody)
                this.balls.push(ball)
            }

            this.clientSocketHandler.allBalls = this.balls;
        })



        this.balls.forEach(ball => {
            this.engine.scene.add(ball.object)
        })
    }

    start() {
        this.engine.start()
        this.physic.start()
    }
}

const billard = new Billard()
billard.start()

if (import.meta.hot) {
    import.meta.hot.on('vite:beforeFullReload', () => {
        throw '(skipping full reload)';
    });
}