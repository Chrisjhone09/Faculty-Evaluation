import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClassOfferingDto } from '../../../core/models/dean.models';
import { InstructorClassesService } from '../services/instructor-classes.service';

@Component({
  selector: 'app-instructor-classes',
  imports: [RouterLink],
  templateUrl: './instructor-classes.html',
})
export class InstructorClasses implements OnInit {
  private readonly classesService = inject(InstructorClassesService);

  protected readonly offerings = signal<ClassOfferingDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.classesService.listMine().subscribe({
      next: (offerings) => {
        this.offerings.set(offerings);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load your classes.');
        this.loading.set(false);
      },
    });
  }
}
