import { Injectable } from '@angular/core';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

@Injectable({
  providedIn: 'root'
})
export class TechStackPhysicsService {
  world: RAPIER.World | null = null;
  rigidBodies: Map<string, RAPIER.RigidBody> = new Map();
  homePositions: Map<string, THREE.Vector3> = new Map();
  
  // Cursor
  cursorTarget = new THREE.Vector3(999, 999, 100);
  currentCursorPos = new THREE.Vector3(999, 999, 100);

  async initialize() {
    await RAPIER.init();
    // Zero gravity world - restoring springs keep cluster together
    this.world = new RAPIER.World({ x: 0.0, y: 0.0, z: 0.0 });
  }

  createSphere(id: string, radius: number, mass: number, position: THREE.Vector3) {
    if (!this.world) return;

    this.homePositions.set(id, position.clone());

    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(2.0)
      .setAngularDamping(2.0);
      
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);
    
    const colliderDesc = RAPIER.ColliderDesc.ball(radius)
      .setMass(mass)
      .setRestitution(0.3)
      .setFriction(0.4);
      
    this.world.createCollider(colliderDesc, rigidBody);
    this.rigidBodies.set(id, rigidBody);
  }

  setCursorTarget(target: THREE.Vector3) {
    this.cursorTarget.copy(target);
  }

  updateCursor(dt: number, smoothing: number = 12) {
    // Frame-rate independent exponential smoothing
    const alpha = 1 - Math.exp(-smoothing * dt);
    this.currentCursorPos.lerp(this.cursorTarget, alpha);
  }

  applyRestoringForces(dt: number) {
    if (!this.world) return;
    
    const baseStiffness = 8.0;
    const baseDamping = 4.0;
    const interactionRadius = 3.2;

    this.rigidBodies.forEach((body, id) => {
      const home = this.homePositions.get(id);
      if (!home) return;

      const pos = body.translation();
      const vel = body.linvel();
      
      // Calculate 2D distance to cursor
      const dx = pos.x - this.currentCursorPos.x;
      const dy = pos.y - this.currentCursorPos.y;
      const dist2D = Math.sqrt(dx * dx + dy * dy);
      
      let pushForceX = 0;
      let pushForceY = 0;
      let pushForceZ = 0;
      let stiffness = baseStiffness;

      if (dist2D < interactionRadius && dist2D > 0.001) {
        // Soften spring when cursor is active near sphere
        const factor = dist2D / interactionRadius;
        stiffness *= (0.2 + 0.8 * factor);
        
        // Controlled radial push away from cursor
        const pushStrength = (interactionRadius - dist2D) * 12.0;
        const nx = dx / dist2D;
        const ny = dy / dist2D;
        
        pushForceX = nx * pushStrength;
        pushForceY = ny * pushStrength;
        pushForceZ = (pos.z > 0 ? 0.3 : -0.3) * pushStrength;
        
        // Gentle torque on push so ball rotates realistically during interaction
        body.applyTorqueImpulse({
          x: -ny * pushStrength * 0.03,
          y: nx * pushStrength * 0.03,
          z: 0
        }, true);
      }

      // Restoring force towards home position (Hooke's Law + Damping)
      const forceX = stiffness * (home.x - pos.x) - baseDamping * vel.x + pushForceX;
      const forceY = stiffness * (home.y - pos.y) - baseDamping * vel.y + pushForceY;
      const forceZ = stiffness * (home.z - pos.z) - baseDamping * vel.z + pushForceZ;

      const m = body.mass();
      body.applyImpulse({ 
        x: forceX * dt * m, 
        y: forceY * dt * m, 
        z: forceZ * dt * m 
      }, true);
    });
  }

  step() {
    if (this.world) {
      this.world.step();
    }
  }

  getBodyTransform(id: string): { position: THREE.Vector3, quaternion: THREE.Quaternion } | null {
    const body = this.rigidBodies.get(id);
    if (!body) return null;

    const t = body.translation();
    const q = body.rotation();

    return {
      position: new THREE.Vector3(t.x, t.y, t.z),
      quaternion: new THREE.Quaternion(q.x, q.y, q.z, q.w)
    };
  }

  destroy() {
    if (this.world) {
      this.world.free();
      this.world = null;
    }
    this.rigidBodies.clear();
    this.homePositions.clear();
  }
}

