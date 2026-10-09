import { Component } from '@angular/core';

/**
 * Mock data matches the Instructor Dashboard mockup in the architecture doc
 * (§11). Wire up to /api/instructors/me/* once evaluations exist (Phase 4-5).
 */
interface MockCategoryRating {
  category: string;
  rating: number;
}

@Component({
  selector: 'app-instructor-dashboard',
  templateUrl: './instructor-dashboard.html',
})
export class InstructorDashboard {
  protected readonly overallRating = 4.42;
  protected readonly evaluationsReceived = 86;
  protected readonly completionRate = 92;

  protected readonly categories: MockCategoryRating[] = [
    { category: 'Teaching Effectiveness', rating: 4.5 },
    { category: 'Communication', rating: 4.35 },
    { category: 'Subject Knowledge', rating: 4.61 },
    { category: 'Professionalism', rating: 4.32 },
  ];

  protected readonly comments: string[] = [
    'Explains the lessons clearly.',
    'Very approachable.',
    'Could provide more examples.',
  ];
}
