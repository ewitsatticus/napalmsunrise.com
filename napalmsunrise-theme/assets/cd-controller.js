/**
 * cd-controller.js — Pointer event glue between 3D scene and audio engine
 */

export class CDController {
  constructor(mount, scene, audio, config) {
    this.mount = mount;
    this.scene = scene;
    this.audio = audio;
    this.config = config;
    this.isDown = false;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    mount.addEventListener('pointerdown', this._onPointerDown);
    mount.addEventListener('pointermove', this._onPointerMove);
    mount.addEventListener('pointerup', this._onPointerUp);
    mount.addEventListener('pointerleave', this._onPointerUp);
  }

  _normalizePointer(e) {
    const rect = this.mount.getBoundingClientRect();
    return {
      nx: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      ny: ((e.clientY - rect.top) / rect.height) * 2 - 1,
    };
  }

  _onPointerDown(e) {
    this.isDown = true;
    this.scene.accelerate();
    this.audio.triggerChord();

    const { nx, ny } = this._normalizePointer(e);
    this.scene.setPointerPosition(nx, ny);
    this.audio.setFilterCutoff((ny + 1) / 2);
  }

  _onPointerMove(e) {
    const { nx, ny } = this._normalizePointer(e);
    this.scene.setPointerPosition(nx, ny);

    if (this.isDown) {
      this.audio.setFilterCutoff((ny + 1) / 2);
      this.audio.setReverbMix((nx + 1) / 2);
    }
  }

  _onPointerUp() {
    if (!this.isDown) return;
    this.isDown = false;
    this.scene.decelerate();
    this.audio.release();
  }

  dispose() {
    this.mount.removeEventListener('pointerdown', this._onPointerDown);
    this.mount.removeEventListener('pointermove', this._onPointerMove);
    this.mount.removeEventListener('pointerup', this._onPointerUp);
    this.mount.removeEventListener('pointerleave', this._onPointerUp);
  }
}
