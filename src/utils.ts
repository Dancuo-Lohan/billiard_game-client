export function randomColor(): string {
    const r: number = Math.floor(Math.random() * 255);
    const g: number = Math.floor(Math.random() * 255);
    const b: number = Math.floor(Math.random() * 255);

    return `#${toHexaString(r)}${toHexaString(g)}${toHexaString(b)}`
}

function toHexaString(x: number) {
    return x.toString(16).padStart(2, "0");
}

import { GLTFLoader } from 'three/examples/jsm/loaders/gltfloader.js';
import * as THREE from "three";

export async function loadGLBModel(modelPath: string): Promise<THREE.Group | THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]> | THREE.Object3D<THREE.Event>> {
    const loader = new GLTFLoader();

   let newModel: THREE.Group | THREE.Mesh | THREE.Object3D = await new Promise((resolve, reject) => {
        loader.load(modelPath, function (gltf) {
            const model = gltf.scene;
            const boundingBox = new THREE.Box3().setFromObject(model);

            const size = new THREE.Vector3();
            boundingBox.getSize(size);
            model.position.y = 10

            resolve(model)

        }, undefined, function (error) {

            console.error(error);
            reject(error)
        });
    }) 

    return newModel;
}