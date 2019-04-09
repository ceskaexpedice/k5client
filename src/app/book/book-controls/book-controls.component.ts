import { BookService } from './../../services/book.service';
import { Component, OnInit, Input} from '@angular/core';
import { AnalyticsService } from '../../services/analytics.service';


@Component({
  selector: 'app-book-controls',
  templateUrl: './book-controls.component.html'})
export class BookControlsComponent implements OnInit {


  constructor(public bookService: BookService, public analytics: AnalyticsService) {
  }

  ngOnInit() {
  }

}
