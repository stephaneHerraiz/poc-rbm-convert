import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewerRbmD3Component } from './viewer-rbm-d3.component';

describe('ViewerRbmD3Component', () => {
  let component: ViewerRbmD3Component;
  let fixture: ComponentFixture<ViewerRbmD3Component>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ViewerRbmD3Component ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewerRbmD3Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
