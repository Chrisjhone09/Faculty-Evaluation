import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClassRequestDto, ClassRequestStatus } from '../../../core/models/dean.models';
import { Modal } from '../../../shared/components/modal/modal';
import { DeanClassRequestsService } from '../services/dean-class-requests.service';

@Component({
  selector: 'app-dean-class-requests',
  imports: [ReactiveFormsModule, Modal],
  templateUrl: './dean-class-requests.html',
})
export class DeanClassRequests implements OnInit {
  private readonly requestsService = inject(DeanClassRequestsService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly Status = ClassRequestStatus;

  protected readonly requests = signal<ClassRequestDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly busyId = signal<string | null>(null);

  protected readonly pending = computed(() => this.requests().filter((r) => r.status === ClassRequestStatus.Pending));
  protected readonly reviewed = computed(() => this.requests().filter((r) => r.status !== ClassRequestStatus.Pending));

  protected readonly rejectingRequest = signal<ClassRequestDto | null>(null);
  protected readonly rejectSubmitting = signal(false);
  protected readonly rejectError = signal<string | null>(null);
  protected readonly rejectForm = this.formBuilder.nonNullable.group({
    reason: ['', [Validators.required, Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    this.refresh();
  }

  private refresh(): void {
    this.loading.set(true);
    this.requestsService.list().subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load class requests.');
        this.loading.set(false);
      },
    });
  }

  protected approve(request: ClassRequestDto): void {
    if (!confirm(`Approve ${request.subjectCode} / ${request.sectionCode} (${request.term}) requested by ${request.instructorName}? This creates the class offering and adds the proposed students.`)) {
      return;
    }

    this.busyId.set(request.id);
    this.errorMessage.set(null);

    this.requestsService.approve(request.id).subscribe({
      next: (updated) => {
        this.requests.update((requests) => requests.map((r) => (r.id === updated.id ? updated : r)));
        this.busyId.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.error?.detail ?? 'Could not approve this request.');
        this.busyId.set(null);
      },
    });
  }

  protected openReject(request: ClassRequestDto): void {
    this.rejectingRequest.set(request);
    this.rejectForm.reset({ reason: '' });
    this.rejectError.set(null);
  }

  protected submitReject(): void {
    const request = this.rejectingRequest();
    if (!request || this.rejectForm.invalid) {
      this.rejectForm.markAllAsTouched();
      return;
    }

    this.rejectSubmitting.set(true);
    this.rejectError.set(null);

    this.requestsService.reject(request.id, this.rejectForm.getRawValue()).subscribe({
      next: (updated) => {
        this.requests.update((requests) => requests.map((r) => (r.id === updated.id ? updated : r)));
        this.rejectSubmitting.set(false);
        this.rejectingRequest.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.rejectSubmitting.set(false);
        this.rejectError.set(error.error?.detail ?? 'Could not reject this request.');
      },
    });
  }
}
