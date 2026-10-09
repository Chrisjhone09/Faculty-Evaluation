import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { InstructorDto, SectionDto, SubjectDto } from '../../../core/models/admin.models';
import { ClassOfferingDto, ClassOfferingStatus } from '../../../core/models/dean.models';
import { TableSearch } from '../../../shared/tables/table-parts';
import { Modal } from '../../../shared/components/modal/modal';
import { AdminInstructorsService } from '../../admin/services/admin-instructors.service';
import { AdminSectionsService } from '../../admin/services/admin-sections.service';
import { AdminSubjectsService } from '../../admin/services/admin-subjects.service';
import { DeanClassesService } from '../services/dean-classes.service';

@Component({
  selector: 'app-dean-classes',
  imports: [ReactiveFormsModule, Modal, RouterLink, TableSearch],
  templateUrl: './dean-classes.html',
})
export class DeanClasses implements OnInit {
  private readonly classesService = inject(DeanClassesService);
  private readonly subjectsService = inject(AdminSubjectsService);
  private readonly sectionsService = inject(AdminSectionsService);
  private readonly instructorsService = inject(AdminInstructorsService);
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly Status = ClassOfferingStatus;
  protected readonly isGuidance = this.authService.currentUser()?.roles.includes('Guidance') ?? false;
  protected readonly workspaceRoot = this.isGuidance ? '/guidance' : '/dean';
  protected readonly search = signal('');
  protected readonly departmentFilter = signal('');
  protected readonly visibleOfferings = computed(() => this.offerings().filter(o =>
    (!this.departmentFilter() || o.departmentId === this.departmentFilter()) &&
    [o.subjectCode, o.subjectTitle, o.sectionCode, o.instructorName, o.term, o.departmentName]
      .some(value => value?.toLowerCase().includes(this.search().toLowerCase()))));
  protected readonly departmentOptions = computed(() => [...new Map(this.sections().map(s => [s.departmentId, s.departmentName])).entries()]);
  protected readonly selectedSectionId = signal('');
  protected readonly createInstructors = computed(() => {
    const section = this.sections().find(s => s.id === this.selectedSectionId());
    return this.instructors().filter(i => i.isActive && section?.departmentId === i.departmentId);
  });
  protected readonly assignInstructors = computed(() => this.instructors().filter(i =>
    i.isActive && i.departmentId === this.assigningFor()?.departmentId));

  protected readonly offerings = signal<ClassOfferingDto[]>([]);
  protected readonly subjects = signal<SubjectDto[]>([]);
  protected readonly sections = signal<SectionDto[]>([]);
  protected readonly instructors = signal<InstructorDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly busyId = signal<string | null>(null);

  protected readonly showCreateModal = signal(false);
  protected readonly createSubmitting = signal(false);
  protected readonly createError = signal<string | null>(null);

  protected readonly assigningFor = signal<ClassOfferingDto | null>(null);
  protected readonly assignInstructorId = signal<string>('');
  protected readonly assignSubmitting = signal(false);
  protected readonly assignError = signal<string | null>(null);

  protected readonly createForm = this.formBuilder.nonNullable.group({
    subjectId: ['', [Validators.required]],
    sectionId: ['', [Validators.required]],
    term: ['', [Validators.required, Validators.maxLength(100)]],
    instructorId: [''],
  });

  ngOnInit(): void {
    this.createForm.controls.sectionId.valueChanges.subscribe(id => {
      this.selectedSectionId.set(id);
      this.createForm.controls.instructorId.setValue('');
    });
    this.refresh();

    this.subjectsService.list().subscribe({ next: (subjects) => this.subjects.set(subjects.filter(s => s.isActive)) });

    const departmentId = this.isGuidance ? undefined : this.authService.currentUser()?.departmentId ?? undefined;
    this.sectionsService.list().subscribe({
      next: (sections) => this.sections.set(sections.filter((s) => s.isActive && (!departmentId || s.departmentId === departmentId))),
    });
    this.instructorsService.list().subscribe({
      next: (instructors) =>
        this.instructors.set(instructors.filter((i) => !departmentId || i.departmentId === departmentId)),
    });
  }

  private refresh(): void {
    this.loading.set(true);
    this.classesService.list().subscribe({
      next: (offerings) => {
        this.offerings.set(offerings);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load class offerings.');
        this.loading.set(false);
      },
    });
  }

  protected openCreateModal(): void {
    this.createForm.reset({ subjectId: '', sectionId: '', term: '', instructorId: '' });
    this.createError.set(null);
    this.showCreateModal.set(true);
  }

  protected submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.createSubmitting.set(true);
    this.createError.set(null);
    const raw = this.createForm.getRawValue();

    this.classesService.create({ ...raw, instructorId: raw.instructorId || null }).subscribe({
      next: (offering) => {
        this.offerings.update((offerings) => [offering, ...offerings]);
        this.createSubmitting.set(false);
        this.showCreateModal.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.createSubmitting.set(false);
        this.createError.set(error.error?.detail ?? 'Could not create class offering.');
      },
    });
  }

  protected openAssignInstructor(offering: ClassOfferingDto): void {
    this.assigningFor.set(offering);
    this.assignInstructorId.set(offering.instructorId ?? '');
    this.assignError.set(null);
  }

  protected submitAssignInstructor(): void {
    const offering = this.assigningFor();
    if (!offering || !this.assignInstructorId()) {
      this.assignError.set('Select an instructor first.');
      return;
    }

    this.assignSubmitting.set(true);
    this.assignError.set(null);

    this.classesService.assignInstructor(offering.id, { instructorId: this.assignInstructorId() }).subscribe({
      next: (updated) => {
        this.offerings.update((offerings) => offerings.map((o) => (o.id === updated.id ? updated : o)));
        this.assignSubmitting.set(false);
        this.assigningFor.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.assignSubmitting.set(false);
        this.assignError.set(error.error?.detail ?? 'Could not assign instructor.');
      },
    });
  }

  protected archive(offering: ClassOfferingDto): void {
    if (!confirm(`Archive ${offering.subjectCode} / ${offering.sectionCode} (${offering.term})?`)) return;

    this.busyId.set(offering.id);
    this.errorMessage.set(null);

    this.classesService.archive(offering.id).subscribe({
      next: (updated) => {
        this.offerings.update((offerings) => offerings.map((o) => (o.id === updated.id ? updated : o)));
        this.busyId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.error?.detail ?? 'Could not archive this offering.');
        this.busyId.set(null);
      },
    });
  }
}
