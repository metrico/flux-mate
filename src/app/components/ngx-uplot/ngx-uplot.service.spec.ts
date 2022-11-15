import { TestBed } from '@angular/core/testing';

import { NgxUplotService } from './ngx-uplot.service';

describe('NgxUplotService', () => {
  let service: NgxUplotService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NgxUplotService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
