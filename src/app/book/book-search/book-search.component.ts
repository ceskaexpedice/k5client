import { Subscription } from 'rxjs/Subscription';
import { BookService } from './../../services/book.service';
import { Component, OnInit, Input} from '@angular/core';
import { OnDestroy } from '@angular/core/src/metadata/lifecycle_hooks';
import { AnalyticsService } from '../../services/analytics.service';


@Component({
  selector: 'app-book-search',
  templateUrl: './book-search.component.html'})
export class BookSearchComponent implements OnInit, OnDestroy {

  fulltextQuery: string;
  // allPages: boolean;
  pageSubscription: Subscription;

  constructor(public bookService: BookService, public analytics: AnalyticsService) {
  }

  ngOnInit() {
    this.pageSubscription = this.bookService.watchPage().subscribe(
      pages => {
        this.fulltextQuery = this.bookService.getFulltextQuery();
      }
    );
  }


  onKeyUp(event) {
    if (event.keyCode === 13) {
      this.analytics.sendEvent('search phrase', 'viewer-by-return', this.fulltextQuery);
      this.changeQuery();
    }
    event.stopPropagation();
  }

  onMagnifyIconClick() {
    this.analytics.sendEvent('search phrase', 'viewer-by-icon', this.fulltextQuery);
    this.changeQuery();
  }

  changeQuery() {
    this.bookService.fulltextChanged(this.fulltextQuery);
  }

  ngOnDestroy(): void {
    this.pageSubscription.unsubscribe();
  }

  cleanQuery() {
    this.analytics.sendEvent('viewer', 'cancel-search');
    this.fulltextQuery = '';
    this.bookService.fulltextChanged(this.fulltextQuery);
  }

  checkboxChanged() {
   this.bookService.fulltextAllPagesChanged();
  }


}
