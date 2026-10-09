import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import {
  CreateEvaluationCategoryRequest,
  CreateEvaluationFormRequest,
  CreateEvaluationQuestionRequest,
  EvaluationCategoryDto,
  EvaluationFormDto,
  EvaluationQuestionDto,
  UpdateEvaluationCategoryRequest,
  UpdateEvaluationFormRequest,
  UpdateEvaluationQuestionRequest,
} from '../../../core/models/evaluation.models';

@Injectable({ providedIn: 'root' })
export class AdminEvaluationFormsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/evaluation-forms`;

  list(): Observable<EvaluationFormDto[]> {
    return this.http.get<EvaluationFormDto[]>(this.baseUrl);
  }

  getById(id: string): Observable<EvaluationFormDto> {
    return this.http.get<EvaluationFormDto>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateEvaluationFormRequest): Observable<EvaluationFormDto> {
    return this.http.post<EvaluationFormDto>(this.baseUrl, request);
  }

  update(id: string, request: UpdateEvaluationFormRequest): Observable<EvaluationFormDto> {
    return this.http.put<EvaluationFormDto>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  addCategory(formId: string, request: CreateEvaluationCategoryRequest): Observable<EvaluationCategoryDto> {
    return this.http.post<EvaluationCategoryDto>(`${this.baseUrl}/${formId}/categories`, request);
  }

  updateCategory(
    formId: string,
    categoryId: string,
    request: UpdateEvaluationCategoryRequest,
  ): Observable<EvaluationCategoryDto> {
    return this.http.put<EvaluationCategoryDto>(`${this.baseUrl}/${formId}/categories/${categoryId}`, request);
  }

  deleteCategory(formId: string, categoryId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${formId}/categories/${categoryId}`);
  }

  addQuestion(
    formId: string,
    categoryId: string,
    request: CreateEvaluationQuestionRequest,
  ): Observable<EvaluationQuestionDto> {
    return this.http.post<EvaluationQuestionDto>(`${this.baseUrl}/${formId}/categories/${categoryId}/questions`, request);
  }

  updateQuestion(
    formId: string,
    categoryId: string,
    questionId: string,
    request: UpdateEvaluationQuestionRequest,
  ): Observable<EvaluationQuestionDto> {
    return this.http.put<EvaluationQuestionDto>(
      `${this.baseUrl}/${formId}/categories/${categoryId}/questions/${questionId}`,
      request,
    );
  }

  deleteQuestion(formId: string, categoryId: string, questionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${formId}/categories/${categoryId}/questions/${questionId}`);
  }
}
