import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { InstructorDto, SectionDto, SubjectDto } from '../../../core/models/admin.models';
import { ClassOfferingDto } from '../../../core/models/dean.models';
import { Icon } from '../../../shared/components/icon/icon';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Modal } from '../../../shared/components/modal/modal';
import { AdminInstructorsService } from '../../admin/services/admin-instructors.service';
import { AdminSectionsService } from '../../admin/services/admin-sections.service';
import { AdminSubjectsService } from '../../admin/services/admin-subjects.service';
import { DeanClassesService } from '../../dean/services/dean-classes.service';

@Component({
  selector: 'app-guidance-rosters',
  imports: [RouterLink, ReactiveFormsModule, Icon, PageHeader, Modal],
  templateUrl: './guidance-rosters.html',
  styleUrl: './guidance-rosters.css',
})
export class GuidanceRosters implements OnInit {
  private readonly classesService = inject(DeanClassesService);
  private readonly subjectsService = inject(AdminSubjectsService);
  private readonly sectionsService = inject(AdminSectionsService);
  private readonly instructorsService = inject(AdminInstructorsService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly offerings = signal<ClassOfferingDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly department = signal('');
  protected readonly status = signal('Active');
  protected readonly subjects = signal<SubjectDto[]>([]);
  protected readonly sections = signal<SectionDto[]>([]);
  protected readonly instructors = signal<InstructorDto[]>([]);
  protected readonly catalogLoading = signal(true);
  protected readonly catalogError = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly selectedSectionId = signal('');
  protected readonly selectedDepartment = computed(() =>
    this.sections().find(s => s.id === this.selectedSectionId())?.departmentId,
  );
  protected readonly availableSubjects = computed(() => this.subjects().filter(s =>
    !s.departmentId || s.departmentId === this.selectedDepartment(),
  ));
  protected readonly availableInstructors = computed(() => this.instructors().filter(i =>
    i.departmentId === this.selectedDepartment(),
  ));
  protected readonly assignmentForm = this.formBuilder.nonNullable.group({
    sectionId: ['', Validators.required],
    subjectId: ['', Validators.required],
    term: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    instructorId: ['', Validators.required],
  });
  protected readonly assigningFor = signal<ClassOfferingDto | null>(null);
  protected readonly assignInstructorId = signal('');
  protected readonly assignSaving = signal(false);
  protected readonly assignError = signal<string | null>(null);
  protected readonly assignInstructors = computed(() => this.instructors().filter(i =>
    i.departmentId === this.assigningFor()?.departmentId,
  ));
  protected readonly departments = computed(() =>
    [...new Map(this.offerings().map(o => [o.departmentId, o.departmentName])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1])),
  );
  protected readonly visibleOfferings = computed(() => {
    const search = this.search().trim().toLowerCase();
    return this.offerings().filter(o =>
      (!this.department() || o.departmentId === this.department()) &&
      (!this.status() || o.status === this.status()) &&
      [o.subjectCode, o.subjectTitle, o.sectionCode, o.term, o.instructorName, o.departmentName]
        .some(value => value?.toLowerCase().includes(search)),
    );
  });

  ngOnInit(): void {
    this.assignmentForm.controls.sectionId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(id => {
      this.selectedSectionId.set(id);
      this.assignmentForm.controls.subjectId.setValue('');
      this.assignmentForm.controls.instructorId.setValue('');
    });
    this.refresh();
    this.loadCatalog();
  }

  protected loadCatalog(): void {
    this.catalogLoading.set(true);
    this.catalogError.set(null);
    forkJoin({ subjects: this.subjectsService.list(), sections: this.sectionsService.list(), instructors: this.instructorsService.list() })
      .subscribe({
        next: catalog => {
          this.subjects.set(catalog.subjects.filter(s => s.isActive));
          this.sections.set(catalog.sections.filter(s => s.isActive));
          this.instructors.set(catalog.instructors.filter(i => i.isActive));
          this.catalogLoading.set(false);
        },
        error: () => {
          this.catalogError.set('Could not load subjects, sections, and instructors.');
          this.catalogLoading.set(false);
        },
      });
  }

  protected openAssignment(): void {
    this.assignmentForm.reset({ sectionId: '', subjectId: '', term: '', instructorId: '' });
    this.saveError.set(null);
    this.creating.set(true);
  }

  protected saveAssignment(): void {
    if (this.saving() || this.catalogLoading() || this.catalogError()) return;
    if (this.assignmentForm.invalid) {
      this.assignmentForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    const request = this.assignmentForm.getRawValue();
    this.classesService.create({ ...request, term: request.term.trim() }).subscribe({
      next: offering => {
        this.saving.set(false);
        this.creating.set(false);
        this.router.navigate(['/guidance/rosters', offering.id], { queryParams: { upload: 'true' } });
      },
      error: (error: HttpErrorResponse) => {
        this.saveError.set(error.error?.detail ?? 'Could not save the subject assignment.');
        this.saving.set(false);
      },
    });
  }

  protected openInstructor(offering: ClassOfferingDto): void {
    this.assigningFor.set(offering);
    this.assignInstructorId.set(offering.instructorId ?? '');
    this.assignError.set(null);
  }

  protected saveInstructor(): void {
    const offering = this.assigningFor();
    if (!offering || this.assignSaving() || this.catalogLoading() || this.catalogError()) return;
    if (!this.assignInstructorId()) {
      this.assignError.set('Select an instructor.');
      return;
    }
    this.assignSaving.set(true);
    this.assignError.set(null);
    this.classesService.assignInstructor(offering.id, { instructorId: this.assignInstructorId() }).subscribe({
      next: updated => {
        this.offerings.update(offerings => offerings.map(o => o.id === updated.id ? updated : o));
        this.assignSaving.set(false);
        this.assigningFor.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.assignError.set(error.error?.detail ?? 'Could not assign the instructor.');
        this.assignSaving.set(false);
      },
    });
  }

  protected refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.classesService.list().subscribe({
      next: offerings => { this.offerings.set(offerings); this.loading.set(false); },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.error?.detail ?? 'Could not load student rosters.');
        this.loading.set(false);
      },
    });
  }

  protected downloadTemplate(): void {
    const url = URL.createObjectURL(new Blob(['StudentNumber\r\n'], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'class-masterlist-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
}
