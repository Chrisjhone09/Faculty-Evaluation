import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../../core/auth/auth.service';
import { AdminEvaluationFormsService } from '../../services/admin-evaluation-forms.service';
import { AdminEvaluationFormDetail } from './admin-evaluation-form-detail';

describe('Evaluation form ordering', () => {
  function setup(fail = false) {
    const questions = ['a', 'b', 'c'].map((id, displayOrder) => ({
      id, text: id, questionType: 'Likert1to5', displayOrder, isReverseScored: id === 'b',
    }));
    const form = { id: 'form', name: 'Form', description: null, isActive: false,
      categories: [{ id: 'category', name: 'Category', displayOrder: 0, questions }] };
    const service = {
      getById: vi.fn(() => of(form)),
      updateQuestion: vi.fn(() => fail ? throwError(() => new Error('offline')) : of({})),
      updateCategory: vi.fn(() => of({})),
    };
    TestBed.configureTestingModule({ providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'form' } } } },
      { provide: AuthService, useValue: { currentUser: () => ({ roles: ['Guidance'] }) } },
      { provide: AdminEvaluationFormsService, useValue: service },
    ] });
    const component = TestBed.runInInjectionContext(() => new AdminEvaluationFormDetail());
    component.ngOnInit();
    return { component: component as any, service };
  }

  it('saves the new question order with consecutive positions and preserves reverse scoring', () => {
    const { component, service } = setup();
    component.moveBy('b', -1, 'category');
    expect(service.updateQuestion.mock.calls.map((call: any[]) => [call[2], call[3].displayOrder]))
      .toEqual([['b', 0], ['a', 1], ['c', 2]]);
    expect((service.updateQuestion.mock.calls[0] as any[])[3].isReverseScored).toBe(true);
    expect(service.getById).toHaveBeenCalledTimes(2);
    expect(component.orderStatus()).toBe('Order saved.');
  });

  it('reloads persisted order and reports an interrupted save', () => {
    const { component, service } = setup(true);
    component.moveBy('b', -1, 'category');
    expect(service.updateQuestion).toHaveBeenCalledTimes(1);
    expect(service.getById).toHaveBeenCalledTimes(2);
    expect(component.reordering()).toBe(false);
    expect(component.errorMessage()).toContain('Could not finish saving');
  });
});
