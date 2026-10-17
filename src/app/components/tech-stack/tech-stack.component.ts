import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { TechStackSceneService } from './tech-stack-scene.service';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-tech-stack',
  templateUrl: './tech-stack.component.html',
  styleUrls: ['./tech-stack.component.css'],
  standalone: true,
})
export class TechStackComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container') containerRef!: ElementRef<HTMLElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('heading') headingRef!: ElementRef<HTMLHeadingElement>;

  private scrollTriggerInstance: ScrollTrigger | null = null;

  constructor(private sceneService: TechStackSceneService) {}

  ngAfterViewInit() {
    if (typeof window === 'undefined') return;

    this.initScene();
    this.setupScrollAnimation();
  }

  private async initScene() {
    await this.sceneService.initialize(
      this.canvasRef.nativeElement,
      this.containerRef.nativeElement,
    );
  }

  private setupScrollAnimation() {
    this.scrollTriggerInstance = ScrollTrigger.create({
      trigger: this.containerRef.nativeElement,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 0.5,
      onUpdate: (self) => {
        this.sceneService.setScrollProgress(self.progress);
      },
    });
  }

  @HostListener('window:resize')
  onResize() {
    if (this.containerRef?.nativeElement) {
      this.sceneService.onResize(this.containerRef.nativeElement);
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(event: MouseEvent) {
    if (this.containerRef?.nativeElement) {
      const rect = this.containerRef.nativeElement.getBoundingClientRect();
      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        this.sceneService.onPointerMove(
          event as unknown as PointerEvent,
          this.containerRef.nativeElement,
        );
      } else {
        this.sceneService.onPointerLeave();
      }
    }
  }

  onPointerMove(event: PointerEvent) {
    if (this.containerRef?.nativeElement) {
      this.sceneService.onPointerMove(event, this.containerRef.nativeElement);
    }
  }

  onPointerLeave() {
    this.sceneService.onPointerLeave();
  }

  ngOnDestroy() {
    this.sceneService.destroy();
    if (this.scrollTriggerInstance) {
      this.scrollTriggerInstance.kill();
    }
  }
}
