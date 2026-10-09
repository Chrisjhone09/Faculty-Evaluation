import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnChanges, OnDestroy, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-profile-avatar',
  imports: [Icon],
  template: `
    <div class="avatar-wrap">
      <span class="profile-picture" [class.large]="size === 'large'">
        @if (photo()) { <img [src]="photo()" [alt]="name + ' photo'" (error)="clearPhoto()" /> }
        @else { <span [attr.aria-label]="name">{{ initials() }}</span> }
        @if (editable && profileId) {
          <button type="button" class="photo-action" [attr.aria-label]="'Update photo for ' + name"
            [title]="'Update photo for ' + name" [disabled]="uploading()" (click)="fileInput.click()">
            <app-icon [name]="uploading() ? 'clock' : 'camera'" size="sm" />
          </button>
          <input #fileInput type="file" accept="image/png,image/jpeg" hidden
            [attr.aria-label]="'Photo file for ' + name" (change)="upload($event)" />
        }
      </span>
      @if (error()) { <span class="photo-error" role="alert">{{ error() }}</span> }
    </div>
  `,
  styles: [`
    :host { display: inline-flex; flex-shrink: 0; }
    .avatar-wrap { display: flex; align-items: center; gap: 8px; }
    .profile-picture { width: 42px; height: 42px; position: relative; display: grid; place-items: center;
      border-radius: 50%; background: #e2efed; color: #12635e; font-size: 13px; font-weight: 700; }
    .profile-picture.large { width: 76px; height: 76px; font-size: 23px; }
    img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
    .photo-action { position: absolute; right: -4px; bottom: -3px; width: 24px; height: 24px;
      display: grid; place-items: center; border-radius: 50%; border: 1px solid #d6dfdd;
      color: #475653; background: white; cursor: pointer; }
    .photo-action:hover { background: #eff8f6; color: #0f766e; }
    .photo-action:focus-visible { outline: 2px solid #0f766e; outline-offset: 2px; }
    .photo-error { color: #b42318; font-size: 12px; max-width: 140px; overflow-wrap: anywhere; }
  `],
})
export class ProfileAvatar implements OnChanges, OnDestroy {
  @Input() profileId: string | null = null;
  @Input() kind: 'students' | 'instructors' = 'students';
  @Input() name = '';
  @Input() editable = false;
  @Input() size: 'normal' | 'large' = 'normal';
  private readonly http = inject(HttpClient);
  private request?: Subscription;
  private saveRequest?: Subscription;
  protected readonly photo = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly uploading = signal(false);
  protected initials(): string { return this.name.trim().split(/\s+/).filter(Boolean).map(n => n[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase() || '?'; }

  ngOnChanges(): void { this.load(); }
  ngOnDestroy(): void { this.request?.unsubscribe(); this.saveRequest?.unsubscribe(); this.clearPhoto(); }
  protected clearPhoto(): void {
    const url = this.photo();
    if (url) URL.revokeObjectURL(url);
    this.photo.set(null);
  }
  private load(): void {
    this.request?.unsubscribe(); this.clearPhoto();
    if (!this.profileId) return;
    this.request = this.http.get(`${API_BASE_URL}/profile-photos/${this.kind}/${this.profileId}`, { responseType: 'blob' }).subscribe({
      next: blob => this.photo.set(URL.createObjectURL(blob)),
      error: () => this.clearPhoto(),
    });
  }
  protected upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; input.value = '';
    if (!file || !this.profileId || this.uploading()) return;
    this.error.set('');
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.error.set('Choose a JPEG or PNG, up to 5 MB.'); return;
    }
    const body = new FormData(); body.append('file', file);
    this.uploading.set(true);
    this.saveRequest = this.http.post(`${API_BASE_URL}/profile-photos/${this.kind}/${this.profileId}`, body).subscribe({
      next: () => { this.uploading.set(false); this.load(); },
      error: (e: HttpErrorResponse) => { this.uploading.set(false); this.error.set(e.error?.detail ?? 'Photo upload failed.'); },
    });
  }
}
