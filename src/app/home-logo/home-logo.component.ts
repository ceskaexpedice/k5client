import { AppSettings } from './../services/app-settings';
import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from '../services/analytics.service';


@Component({
  selector: 'app-home-logo',
  templateUrl: './home-logo.component.html'
})
export class HomeLogoComponent implements OnInit {

  constructor(public appSettings: AppSettings, public analytics: AnalyticsService) {
  }

  ngOnInit() {
  }

}
