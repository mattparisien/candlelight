import * as THREE from "three";
import PluginService from "./PluginService";

type TViewport = {
  width: number;
  height: number;
  aspect: number;
};

type TGeometry = THREE.BoxGeometry | THREE.PlaneGeometry;

class ThreeJsService extends PluginService {
  
  protected container: HTMLElement;
  protected width: number;
  protected height: number;
  protected devicePixelRatio: number;
  protected scene: THREE.Scene;
  protected camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  protected mesh: THREE.Mesh;
  protected geometry: TGeometry
  protected perspective: number;
  protected renderer: THREE.WebGLRenderer;
  protected viewport: TViewport;

  constructor(container: HTMLElement) {
    super();
    this.container = container; // The DOM element to attach the renderer to

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.devicePixelRatio = window.devicePixelRatio;

    this.scene = new THREE.Scene();
    this.setupCamera();
  }

  protected setupCamera() {
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000)
    this.camera.position.z = 5

    if (this.container instanceof HTMLCanvasElement) {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.container });
    } else {
      this.renderer = new THREE.WebGLRenderer();
    }
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(this.devicePixelRatio, 2))
  }

  protected onWindowResize(): void {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.devicePixelRatio = window.devicePixelRatio

    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = this.width / this.height
    }

    this.camera.updateProjectionMatrix()

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(this.devicePixelRatio, 2))
  }

  private start(): void {
    requestAnimationFrame(() => this.start());
    this.render();
  }

  protected render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public getThree() {
    return THREE;
  }

  init(): void {
    // When the container is not a canvas, append the renderer's DOM element
    if (!(this.container instanceof HTMLCanvasElement)) {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.container.appendChild(this.renderer.domElement);
    }

    window.addEventListener("resize", this.onWindowResize.bind(this), false);
    this.start();
  }
}

export default ThreeJsService;
    