import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminDepartmentsService } from '../services/admin-departments.service';
import { AdminUsersService } from '../services/admin-users.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard implements OnInit {
  private readonly usersService = inject(AdminUsersService);
  private readonly departmentsService = inject(AdminDepartmentsService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly totalUsers = signal(0);
  protected readonly totalDepartments = signal(0);
  protected readonly usersByRole = signal<{ role: string; count: number }[]>([]);

  ngOnInit(): void {
    forkJoin({
      users: this.usersService.list(),
      departments: this.departmentsService.list(),
    }).subscribe({
      next: ({ users, departments }) => {
        this.totalUsers.set(users.length);
        this.totalDepartments.set(departments.length);

        const counts = new Map<string, number>();
        for (const user of users) {
          for (const role of user.roles) {
            counts.set(role, (counts.get(role) ?? 0) + 1);
          }
        }
        this.usersByRole.set(Array.from(counts, ([role, count]) => ({ role, count })));

        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load dashboard data.');
        this.loading.set(false);
      },
    });
  }
}
