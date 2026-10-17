import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './pages/navbar/navbar';
import { HomeComponent } from './pages/home/home.component';

@Component({
  imports: [Navbar, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('angular-learning');
}
