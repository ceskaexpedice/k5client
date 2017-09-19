import { LibrarySearchService } from './services/library-search.service';
import { ModsParserService } from './services/mods-parser.service';
import { BookService } from './services/book.service';
import { Http, HttpModule } from '@angular/http';
import { KrameriusApiService } from './services/kramerius-api.service';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterializeModule } from 'ng2-materialize';
import { FormsModule } from '@angular/forms';



import { AppComponent } from './app.component';
import { NavbarComponent } from './navbar/navbar.component';
import { ViewerComponent } from './book/viewer/viewer.component';
import { RouterModule, Routes } from '@angular/router';

import { BookComponent } from './book/book.component';
import { HelpComponent } from './help/help.component';
import { HomeComponent } from './home/home.component';
import { BrowseComponent } from './browse/browse.component';
import { CollectionsComponent } from './collections/collections.component';
import { NavigationComponent } from './book/navigation/navigation.component';
import { MetadataComponent } from './book/metadata/metadata.component';
import { NavigationItemComponent } from './book/navigation/navigation-item/navigation-item.component';

import { Ng2CompleterModule } from 'ng2-completer';


const ROUTES: Routes = [
  { path: '', component: HomeComponent },
  { path: 'collections', component: CollectionsComponent },
  { path: 'browse', component: BrowseComponent },
  { path: 'help', component: HelpComponent },
  { path: 'documents/:uuid', component: BookComponent },
  { path: 'documents', component: BookComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    ViewerComponent,
    BookComponent,
    HelpComponent,
    HomeComponent,
    BrowseComponent,
    CollectionsComponent,
    NavigationComponent,
    MetadataComponent,
    NavigationItemComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpModule,
    FormsModule,
    Ng2CompleterModule,
    MaterializeModule.forRoot(),
    RouterModule.forRoot(ROUTES)
  ],
  providers: [
    KrameriusApiService,
    BookService,
    ModsParserService,
    LibrarySearchService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
