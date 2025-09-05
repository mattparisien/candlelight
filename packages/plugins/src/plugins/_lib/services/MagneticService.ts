import gsap from "gsap";
import PluginService from "./PluginService";

interface IMagneticService {
  magneticStrength: number;
  setMagneticStrength(strength: number): void;
  applyMagneticEffect(el: HTMLElement, clientX: number, clientY: number): void;
  removeMagneticEffect(el: HTMLElement): void;
}

class MagneticService extends PluginService implements IMagneticService {
  magneticStrength: number = 100;

  setMagneticStrength(strength: number): void {
    this.magneticStrength = strength;
  }

  applyMagneticEffect(el: HTMLElement, clientX: number, clientY: number): void {
    const { left, top, width, height } = el.getBoundingClientRect();
    const strength = this.magneticStrength;

    gsap.to(el, {
      duration: 1.5,
      x: ((clientX - left) / width - 0.5) * strength,
      y: ((clientY - top) / height - 0.5) * strength,
      rotate: "0.001deg",
      ease: "Power4.easeOut",
    });
  }

  removeMagneticEffect(el: HTMLElement): void {
    gsap.to(el, {
      duration: 1.5,
      x: 0,
      y: 0,
      ease: "Elastic.easeOut",
    });
  }
  init(): void {}
}

export default MagneticService;
