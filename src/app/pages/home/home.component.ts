import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CharacterSceneComponent } from './character-scene.component';
import { SnowfallComponent } from './snowfall.component';
import { TechStackComponent } from '../../components/tech-stack/tech-stack.component';
import { ContributionSkylineComponent } from '../../components/contribution-skyline/contribution-skyline.component';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-home',
  imports: [
    CharacterSceneComponent,
    SnowfallComponent,
    TechStackComponent,
    RouterLink,
    ContributionSkylineComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private scrollTriggerInstance: ScrollTrigger | null = null;

  ngAfterViewInit() {
    if (typeof window === 'undefined') return;

    this.scrollTriggerInstance = ScrollTrigger.create({
      trigger: '#experience-container',
      start: 'top center',
      end: 'bottom center',
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        const line = document.getElementById('experience-line');
        const dot = document.getElementById('experience-dot');
        if (line && dot) {
          line.style.height = `${p * 100}%`;
          dot.style.top = `${p * 100}%`;
          dot.style.opacity = p > 0 ? '1' : '0';
        }
      }
    });

    const rows = document.querySelectorAll('.experience-row');
    rows.forEach((row) => {
      gsap.to(row, {
        scrollTrigger: {
          trigger: row,
          start: 'top 80%',
          end: 'top 50%',
          scrub: true,
        },
        opacity: 1,
        y: 0,
        ease: 'power2.out'
      });
    });
  }

  ngOnDestroy() {
    if (this.scrollTriggerInstance) {
      this.scrollTriggerInstance.kill();
    }
  }
}