import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClassOfferingDto } from '../../../core/models/dean.models';
import { InstructorClassesService } from '../services/instructor-classes.service';
import { Pagination } from '../../../shared/tables/table-parts';
import { createTableState } from '../../../shared/tables/table-state';

@Component({
  selector: 'app-instructor-classes',
  imports: [RouterLink, Pagination],
  templateUrl: './instructor-classes.html',
})
export class InstructorClasses implements OnInit {
  private readonly classesService = inject(InstructorClassesService);

  protected readonly offerings = signal<ClassOfferingDto[]>([]);
  protected readonly table = createTableState(this.offerings, { searchFields: offering => [offering.subjectCode, offering.subjectTitle, offering.sectionCode, offering.term], initialSort: { key: 'subjectCode', direction: 'asc' }, pageSize: 50 });
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
