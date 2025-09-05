import * as THREE from "three";
import ThreeJsService from "./ThreeJsService"; // Assuming ThreeJsService is in the same directory

export type TUniforms<T> = { [P in keyof T]: { value: T[P] } };

export type TCallback<T> = ({mesh, uniforms}: {mesh: THREE.Mesh, uniforms: TUniforms<T>, camera: THREE.PerspectiveCamera | THREE.OrthographicCamera, devicePixelRatio: number}) => any | null;

class ShaderService<T = {}> extends ThreeJsService {
  private _uniforms: TUniforms<T> | null = null;
  private _onRenderCallback: TCallback<T> = null;
  private _onResizeCallback: TCallback<T> = null;

  constructor(
    container: HTMLElement,
    vertexShader: string,
    fragmentShader: string,
    uniforms: TUniforms<T>,
    onRender?: TCallback<T>,
    onResize?: TCallback<T>
  ) {
    super(container); // Call the parent constructor
    this._uniforms = uniforms;
    this._onRenderCallback = onRender;
    this._onResizeCallback = onResize;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true
    });

    this.geometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
    this.mesh = new THREE.Mesh(this.geometry, material);

    this.scene.add(this.mesh);
  }

  protected render(): void {
    super.render();
    this._onRenderCallback?.({mesh: this.mesh, uniforms: this._uniforms, camera: this.camera, devicePixelRatio: this.devicePixelRatio});
  }

  protected onWindowResize(): void {
    super.onWindowResize();
    this._onResizeCallback?.({mesh: this.mesh, uniforms: this._uniforms, camera: this.camera, devicePixelRatio: this.devicePixelRatio})
  }

  init(): void {
    super.init();
  }
}  

export default ShaderService;
