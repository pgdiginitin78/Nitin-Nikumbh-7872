import { Component, signal, ElementRef, ViewChild, afterNextRender } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { animate, stagger } from 'motion';

@Component({
  imports: [RouterLink, NgIf],
  selector: 'app-navbar',
  styleUrl: './navbar.css',
  templateUrl: './navbar.html',
})
export class Navbar {
  isMenuOpen = signal(false);

  @ViewChild('navContainer') navContainer!: ElementRef;

  constructor() {
    afterNextRender(() => {
      animate(
        this.navContainer.nativeElement,
        { y: [-100, 0], opacity: [0, 1] },
        {
          duration: 1,
          type: 'spring',
          stiffness: 100,
          damping: 14,
          mass: 1,
        },
      );

      animate(
        '.nav-link',
        { y: [-20, 0], opacity: [0, 1] },
        {
          delay: stagger(0.1, { startDelay: 0.3 }),
          duration: 0.8,
          type: 'spring',
          stiffness: 150,
          damping: 12,
        },
      );
    });
  }


  toggleMenu() {
    this.isMenuOpen.update((value) => !value);
  }
}
