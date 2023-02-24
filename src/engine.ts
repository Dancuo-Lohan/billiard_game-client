import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module"

export type EngineOptions = {
    readonly canvas? : string | HTMLCanvasElement
    readonly cameraFov?: number
    readonly cameraNearest?: number
    readonly cameraFarest?: number
    readonly setup: (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void
    readonly computeFrame: (currentTime: number) => void
}

export class Engine {
    private stats: Stats = Stats()
    constructor (
        public readonly canvas: HTMLCanvasElement,
        public readonly scene: THREE.Scene,
        public readonly camera: THREE.PerspectiveCamera,
        public readonly renderer: THREE.WebGLRenderer,
        public readonly setup: (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void,
        public readonly computeFrame: (currentTime: number) => void,
        public readonly showStats: boolean
    ) {
        this._init()
    }

    private _resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.camera.aspect = this.canvas.width / this.canvas.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.canvas.width, this.canvas.height);
    }

    private _init() {
        this._resizeCanvas();
        window.onresize = () => this._resizeCanvas()   
        if (this.showStats) {
            document.body.appendChild(this.stats.dom)
        }     
    }

    private run(currentTime: number = 0) {
        this.computeFrame(currentTime)
        this.renderer.render(this.scene, this.camera)
        if (this.showStats) {
            this.stats.update()
        }
        requestAnimationFrame(this.run.bind(this))
    }

    start() {
        this.setup(this.scene, this.camera);
        this.run();
    }

    static create(opts: EngineOptions): Engine {
        let canvas: HTMLCanvasElement | null = null;
        if (typeof opts.canvas === "object" && opts.canvas !== null && opts.canvas.nodeName === "CANVAS") {
            canvas = opts.canvas
        } else if (typeof opts.canvas === "string") {
            const elt: HTMLElement | null = document.getElementById(opts.canvas)
            if (elt !== null && elt.nodeName === "CANVAS") {
                canvas = elt as HTMLCanvasElement
            }
        }

        let renderer;
        if (canvas) {
            renderer = new THREE.WebGLRenderer({canvas, antialias: true})
        } else {
            renderer = new THREE.WebGLRenderer({ antialias: true });
            canvas = renderer.domElement;
            document.body.appendChild(canvas);
        }

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            opts.cameraFov?? 55,
            canvas.width / canvas.height,
            opts.cameraNearest ?? 0.1,
            opts.cameraFarest ?? 3000
        )
        
        return new Engine(
            canvas,
            scene,
            camera,
            renderer,
            opts.setup,
            opts.computeFrame,
            true
        );
    }
}