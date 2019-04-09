import { CitationService } from './citation.service';
import { AppSettings } from './app-settings';
import { SolrService } from './solr.service';
import { ModsParserService } from './mods-parser.service';
import { DocumentItem } from './../model/document_item.model';
import { Metadata } from './../model/metadata.model';
import { AltoService } from './alto-service';
import { LocalStorageService } from './local-storage.service';
import { DialogPdfComponent } from './../dialog/dialog-pdf/dialog-pdf.component';
import { NotFoundError } from './../common/errors/not-found-error';
import { UnauthorizedError } from './../common/errors/unauthorized-error';
import { AppError } from './../common/errors/app-error';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { KrameriusApiService } from './kramerius-api.service';
import { Page, PagePosition, PageImageType } from './../model/page.model';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { MzModalService } from 'ngx-materialize';
import { DialogOcrComponent } from '../dialog/dialog-ocr/dialog-ocr.component';
import { forkJoin} from 'rxjs/observable/forkJoin';
import { Article } from '../model/article.model';
import { HistoryService } from './history.service';
import { SimpleDialogComponent } from '../dialog/simple-dialog/simple-dialog.component';
import { DomSanitizer} from '@angular/platform-browser';
import { PageTitleService } from './page-title.service';
import { InternalPart } from '../model/internal_part.model';
import { Translator } from 'angular-translator';
import { AnalyticsService } from './analytics.service';



@Injectable()
export class BookService {

    private fulltextQuery = null;

    private uuid;
    private subject = new Subject<Page[]>();

    private activePageIndex = 0;
    public allPages: Page[] = [];
    public pages: Page[] = [];
    private ftPages: Page[] = [];
    public doublePage = false;
    public doublePageEnabled = false;

    public pageState: BookPageState;
    public bookState: BookState;

    public fulltextAllPages = false;

    public activeMobilePanel: String;

    public metadata: Metadata;

    public pdf: string;
    public pdfPath;
    public isPrivate: boolean;

    public articles: Article[];
    public article: Article;

    public internalParts: InternalPart[];
    public internalPart: InternalPart;

    public lastIndex = -1;

    public activeNavigationTab: string; // pages | articles || internalparts
    public navigationTabsCount: number;
    public showNavigationPanel: boolean;
    public viewer: string; // image | pdf | none

    public dnntMode = false;
    public dnntFlag = false;
    public iiifEnabled = false;


    constructor(private location: Location,
        private altoService: AltoService,
        private appSettings: AppSettings,
        private pageTitle: PageTitleService,
        private analytics: AnalyticsService,
        private localStorageService: LocalStorageService,
        private krameriusApiService: KrameriusApiService,
        private modsParserService: ModsParserService,
        private translator: Translator,
        private solrService: SolrService,
        private sanitizer: DomSanitizer,
        private history: HistoryService,
        private router: Router,
        private citationService: CitationService,
        private modalService: MzModalService) {
    }

    private assignPdfPath(uuid: string) {
        this.viewer = 'pdf';
        this.bookState = BookState.Success;
        if (uuid === null) {
            this.pdf = null;
            this.pdfPath = null;
            return;
        }
        this.pdf = this.krameriusApiService.getPdfUrl(uuid);
        let url = 'assets/pdf/viewer.html?file=' + this.pdf;
        if (this.fulltextQuery) {
            url += '&query=' + this.fulltextQuery;
        }
        url += '&lang=' + this.translator.language;
        this.pdfPath = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }

    init(params: BookParams) {
        this.clear();
        this.uuid = params.uuid;
        this.fulltextQuery = params.fulltext;
        this.bookState = BookState.Loading;
        this.iiifEnabled =  this.appSettings.iiifEnabled;
        this.krameriusApiService.getItem(params.uuid).subscribe((item: DocumentItem) => {
            if (item.doctype === 'article') {
                if (params.articleUuid) {
                    return;
                }
                const issueUuid = item.getUuidFromContext('periodicalitem');
                if (issueUuid) {
                    this.history.removeCurrent();
                    this.router.navigate(['/view', issueUuid], { replaceUrl: true, queryParams: { article: params.uuid, fulltext: this.fulltextQuery } });
                }
                return;
            } else if (item.doctype === 'internalpart') {
                const parentUuid = item.getParentUuid();
                if (parentUuid) {
                    this.history.removeCurrent();
                    this.router.navigate(['/view', parentUuid], { replaceUrl: true, queryParams: { chapter: params.uuid, fulltext: this.fulltextQuery } });
                }
                return;
            }
            this.isPrivate = !item.public;
            this.krameriusApiService.getMods(item.root_uuid).subscribe(response => {
                this.metadata = this.modsParserService.parse(response, item.root_uuid);
                this.metadata.model = item.doctype;
                this.metadata.donator = item.donator;
                this.analytics.sendEvent('viewer', 'open', this.metadata.getShortTitle());
                this.pageTitle.setTitle(null, this.metadata.getShortTitle());
                if (item.doctype) {
                    if (item.doctype.startsWith('periodical')) {
                        this.metadata.doctype = 'periodical';
                    } else if (item.doctype === 'monographunit') {
                        this.metadata.doctype = 'monographbundle';
                    } else {
                        this.metadata.doctype = item.doctype;
                    }
                }
                this.metadata.addMods(this.metadata.doctype, response);
                if (item.doctype === 'periodicalitem' || item.doctype === 'supplement') {
                    const volumeUuid = item.getUuidFromContext('periodicalvolume');
                    this.loadVolume(volumeUuid);
                    this.loadIssues(item.root_uuid, volumeUuid, this.uuid);
                } else if (item.doctype === 'monographunit') {
                    this.loadMonographUnits(item.root_uuid, this.uuid);
                } else if (item.doctype === 'periodicalvolume') {
                    this.loadVolume(this.uuid);
                    this.loadVolumes(item.root_uuid, this.uuid);
                }
                this.localStorageService.addToVisited(item, this.metadata);
                if (item.pdf) {
                    this.showNavigationPanel = false;
                    this.assignPdfPath(params.uuid);
                } else {
                    this.krameriusApiService.getChildren(params.uuid).subscribe(children => {
                        if (children && children.length > 0) {
                            this.onDataLoaded(children, item.doctype, params.pageUuid, params.articleUuid, params.internalPartUuid);
                        } else {
                            // TODO: Empty document
                        }
                    });
                }
            });
        },
        error => {
            if (error instanceof NotFoundError) {
                this.router.navigateByUrl(this.appSettings.getRouteFor('404'), { skipLocationChange: true });
            }
        });

    }

    private loadVolume(uuid: string) {
        this.krameriusApiService.getItem(uuid).subscribe((item: DocumentItem) => {
            this.metadata.assignVolume(item);
        });
        this.krameriusApiService.getMods(uuid).subscribe(mods => {
            this.metadata.addMods('periodicalvolume', mods);
            const metadata = this.modsParserService.parse(mods, uuid, 'volume');
            this.metadata.volumeMetadata = metadata;
        });
    }


    private loadIssues(periodicalUuid: string, volumeUuid: string, issueUuid: string) {
        this.krameriusApiService.getPeriodicalIssues(periodicalUuid, volumeUuid, null).subscribe(response => {
            const issues = this.solrService.periodicalItems(response, 'periodicalitem');
            if (!issues || issues.length < 1) {
                return;
            }
            let index = -1;
            for (let i = 0; i < issues.length; i++) {
                if (issues[i].uuid === issueUuid) {
                    index = i;
                    break;
                }
            }
            if (index < 0) {
                return;
            }
            this.metadata.currentIssue = issues[index];
            this.pageTitle.setTitle(null, this.metadata.getShortTitleWithIssue());
            if (index > 0) {
                this.metadata.previousIssue = issues[index - 1];
            }
            if (index < issues.length - 1) {
                this.metadata.nextIssue = issues[index + 1];
            }
            this.krameriusApiService.getMods(issueUuid).subscribe(mods => {
                this.metadata.addMods('periodicalitem', mods);
                const metadata = this.modsParserService.parse(mods, issueUuid, 'issue');
                this.metadata.currentIssue.metadata = metadata;
            });
        });
    }


    private loadVolumes(periodicalUuid: string, volumeUuid: string) {
        this.krameriusApiService.getPeriodicalVolumes(periodicalUuid, null).subscribe(response => {
            const volumes = this.solrService.periodicalItems(response, 'periodicalvolume');
            if (!volumes || volumes.length < 1) {
                return;
            }
            let index = -1;
            for (let i = 0; i < volumes.length; i++) {
            if (volumes[i].uuid === volumeUuid) {
                index = i;
                break;
            }
            }
            if (index < 0) {
                return;
            }
            this.metadata.currentVolume = volumes[index];
            this.pageTitle.setTitle(null, this.metadata.getShortTitlwWithVolume());
            if (index > 0) {
                this.metadata.previousVolume = volumes[index - 1];
            }
            if (index < volumes.length - 1) {
                this.metadata.nextVolume = volumes[index + 1];
            }
        });
    }

    private loadMonographUnits(monographUuid: string, unitUud: string) {
        this.krameriusApiService.getMonographUnits(monographUuid, null).subscribe(response => {
            const units = this.solrService.periodicalItems(response, 'monographunit');
            if (!units || units.length < 1) {
                return;
            }
            let index = -1;
            for (let i = 0; i < units.length; i++) {
                if (units[i].uuid === unitUud) {
                    index = i;
                    break;
                }
            }
            if (index < 0) {
                return;
            }
            this.metadata.currentUnit = units[index];
            this.pageTitle.setTitle(null, this.metadata.getShortTitleWithUnit());
            if (index > 0) {
                this.metadata.previousUnit = units[index - 1];
            }
            if (index < units.length - 1) {
                this.metadata.nextUnit = units[index + 1];
            }
            this.krameriusApiService.getMods(unitUud).subscribe(mods => {
                this.metadata.addMods('monographunit', mods);
                const metadata = this.modsParserService.parse(mods, unitUud);
                this.metadata.currentUnit.metadata = metadata;
            });
        });
    }


    private addSupplementPages(pages: any[], supplements: any[], doctype: string, pageUuid: string, articleUuid: string, internalPartUuid: string) {
        if (supplements.length === 0) {
            this.onDataLoaded(pages, null, pageUuid, articleUuid, internalPartUuid);
            return;
        }
        const supplement = supplements.shift();
        this.krameriusApiService.getChildren(supplement['pid']).subscribe(children => {
            for (const p of children) {
                if (p['model'] === 'page') {
                    p['is_supplement'] = true;
                    pages.push(p);
                }
            }
            this.onDataLoaded(pages, doctype, pageUuid, articleUuid, internalPartUuid);
        });
    }


    private calcNavigationTabsCount() {
        let tabs = 0;
        if (this.allPages.length > 0) {
            tabs += 1;
        }
        if (this.articles.length > 0) {
            tabs += 1;
        }
        if (this.internalParts.length > 0) {
            tabs += 1;
        }
        this.navigationTabsCount = tabs;
    }

    private onDataLoaded(inputPages: any[], doctype: string, pageUuid: string, articleUuid: string, internalPartUuid: string) {
        this.pages = [];
        const pages = [];
        const supplements = [];
        for (const p of inputPages) {
            if (p['model'] === 'supplement') {
                supplements.push(p);
            } else {
                pages.push(p);
            }
        }
        if (supplements.length > 0) {
            this.addSupplementPages(pages, supplements, doctype, pageUuid, articleUuid, internalPartUuid);
            return;
        }
        const pageIndex = this.arrangePages(pages, pageUuid, doctype);
        this.bookState = BookState.Success;
        if (pageIndex === -1 || (this.pages.length === 0 && this.articles.length === 0)) {
            return;
        }
        this.showNavigationPanel = true;
        this.calcNavigationTabsCount();
        if (articleUuid || (!pageUuid && this.pages.length === 0)) {
            this.activeNavigationTab = 'articles';
            let articleForSelection = this.articles[0];
            if (articleUuid) {
                for (const article of this.articles) {
                    if (articleUuid === article.uuid) {
                        articleForSelection = article;
                        break;
                    }
                }
            }
            this.onArticleSelected(articleForSelection);
        } else if (internalPartUuid &&  this.internalParts &&  this.internalParts.length > 0) {
            this.activeNavigationTab = 'internalparts';
            let selection = this.internalParts[0];
            if (internalPartUuid) {
                for (const internalPart of this.internalParts) {
                    if (internalPartUuid === internalPart.uuid) {
                        selection = internalPart;
                        break;
                    }
                }
            }
            this.onInternalPartSelected(selection);
        } else {
            this.activeNavigationTab = 'pages';
            if (this.fulltextQuery) {
                this.fulltextChanged(this.fulltextQuery, pageUuid);
            } else {
                this.goToPageOnIndex(pageIndex, true);
            }
        }
    }


    private arrangePages(pages: any[], uuid: string, doctype: string): number {
        let index = 0;
        let firstBackSingle = -1;
        let titlePage = -1;
        let lastSingle = -1;
        let currentPage = 0;
        this.activeMobilePanel = 'viewer';
        this.doublePageEnabled = this.localStorageService.getProperty(LocalStorageService.DOUBLE_PAGE) === '1';
        const spines: Page[] = [];
        for (const p of pages) {
            if (p['model'] === 'monographunit') {
                this.history.removeCurrent();
                this.router.navigate(['/periodical', this.uuid], { replaceUrl: true, queryParams: { fulltext: this.fulltextQuery } });
                return -1;
            } else if (p['model'] === 'supplement') {
            } else if (p['model'] === 'article') {
                const article = new Article(p['pid'], p['title'], p['policy']);
                this.articles.push(article);
            } else if (p['model'] === 'internalpart') {
                const internalPart = new InternalPart(p['pid'], p['title'], p['policy']);
                this.internalParts.push(internalPart);
            } else if (p['model'] === 'page') {
                const page = new Page();
                page.uuid = p['pid'];
                page.policy = p['policy'];
                const details = p['details'];
                if (details) {
                    page.type = details['type'];
                    if (page.type) {
                        page.type = page.type.toLowerCase();
                    } else {
                        page.type = 'unknown';
                    }
                    page.number = details['pagenumber'] ? details['pagenumber'].trim() : '';
                }
                if (!page.number) {
                    page.number = p['title'];
                }
                page.thumb = this.krameriusApiService.getThumbUrl(page.uuid);
                page.position = PagePosition.Single;
                if (page.type === 'spine') {
                    spines.push(page);
                    continue;
                }
                page.index = index;
                if (uuid === page.uuid) {
                    currentPage = index;
                }
                if ((page.type === 'backcover' || p['is_supplement']) && firstBackSingle === -1) {
                    firstBackSingle = index;
                } else if (page.type === 'titlepage') {
                    titlePage = index;
                } else if (titlePage === -1 && (page.type === 'frontcover'
                            || page.type === 'cover'
                            || page.type === 'frontjacket'
                            || page.type === 'jacket'
                            || page.type === 'spine')) {
                    lastSingle = index;
                }
                this.pages.push(page);
                this.allPages.push(page);
                index += 1;
            }
        }
        for (const page of spines) {
            if (firstBackSingle === -1) {
                firstBackSingle = index;
            }
            page.index = index;
            if (uuid === page.uuid) {
                currentPage = index;
            }
            this.pages.push(page);
            this.allPages.push(page);
            index += 1;
        }
        const bounds = this.computeDoublePageBounds(this.pages.length, titlePage, lastSingle, firstBackSingle);
        if (bounds !== null) {
            for (let i = bounds[0]; i < bounds[1]; i += 2) {
                this.pages[i].position = PagePosition.Left;
                this.pages[i + 1].position = PagePosition.Right;
            }
        }
        return currentPage;
    }


    getFulltextQuery(): string {
        return this.fulltextQuery;
    }

    getPage() {
        if (this.pages && this.pages.length > this.activePageIndex) {
            return this.pages[this.activePageIndex];
        }
    }

    getRightPage() {
        if (this.doublePage) {
            return this.pages[this.activePageIndex + 1];
        } else {
            return null;
        }
    }

    watchPage(): Observable<Page[]> {
        return this.subject.asObservable();
    }

    goToPage(page: Page) {
        this.goToPageOnIndex(page.index);
    }

    goToPageWithUuid(uuid: string) {
        for (const page of this.pages) {
            if (page.uuid === uuid) {
                this.goToPageOnIndex(page.index);
                return;
            }
        }
    }

    goToNext() {
        if (this.hasNext()) {
            const n = this.doublePage ? 2 : 1;
            this.goToPageOnIndex(this.activePageIndex + n);
        }
    }

    goToPrevious() {
        if (this.hasPrevious()) {
            this.goToPageOnIndex(this.activePageIndex - 1);
        }
    }

    isEmpty(): boolean {
        return this.pages === null || this.pages.length === 0;
    }

    hasNext() {
        const n = this.doublePage ? 2 : 1;
        return this.activePageIndex < this.pages.length - n;
    }

    hasPrevious() {
        return this.activePageIndex > 0;
    }

    getPageIndex(): number {
        return this.activePageIndex;
    }


    getPageCount(): number {
        return this.pages ? this.pages.length : 0;
    }


    showQuotation() {

    }
    showOcr() {
        const requests = [];
        requests.push(this.krameriusApiService.getOcr(this.getPage().uuid));
        let citPages = this.getPage().number + '';
        if (this.getRightPage()) {
            requests.push(this.krameriusApiService.getOcr(this.getRightPage().uuid));
            citPages += '-' + this.getRightPage().number;
        }
        forkJoin(requests).subscribe(result => {
            const options = {
                ocr: result[0]
            };
            if (result.length > 1) {
                options['ocr2'] = result[1];
            }
            const citation = this.citationService.generateCitation(this.metadata, CitationService.LEVEL_PAGE);
            if (citation) {
                options['citation'] = citation;
            }
            this.modalService.open(DialogOcrComponent, options);
        });
    }


    showTextSelection(extent, width: number, height: number, right: boolean) {
        const uuid = right ? this.getRightPage().uuid : this.getPage().uuid;
        this.krameriusApiService.getAlto(uuid).subscribe(result => {
            const text = this.altoService.getTextInBox(result, extent, width, height);
            const citation = this.citationService.generateCitation(this.metadata, CitationService.LEVEL_PAGE);
            const options = {
                ocr: text,
                citation: citation
            };
            this.modalService.open(DialogOcrComponent, options);
        });
    }

    showImageCrop(extent, right: boolean) {
        if (this.pageState === BookPageState.Inaccessible) {
            this.modalService.open(SimpleDialogComponent, {
                title: 'common.warning',
                message: 'dialogs.private_document_jpeg.message',
                button: 'common.close'
            });
        } else if (this.pageState === BookPageState.Success) {
            const iiif = right ? this.getRightPage().iiif : this.getPage().iiif;
            if (!iiif) {
                return;
            }
            const url = this.krameriusApiService.getImageSelection(iiif, extent[0], extent[1], extent[2], extent[3]);
            if (url) {
                window.open(url, '_blank');
            }
        }
    }

    showJpeg() {
        if (this.pageState === BookPageState.Inaccessible) {
            this.modalService.open(SimpleDialogComponent, {
                title: 'common.warning',
                message: 'dialogs.private_document_jpeg.message',
                button: 'common.close'
            });
        } else if (this.pageState === BookPageState.Success) {

          if (this.getRightPage()) {
            window.open('downloadIMG.html#'+this.getPage().uuid+'#'+this.getRightPage().uuid, '_blank');
          } else {
            window.open('downloadIMG.html#'+this.getPage().uuid, '_blank');
          }
          /*
            window.open(this.krameriusApiService.getFullJpegUrl(this.getPage().uuid), '_blank');
            if (this.getRightPage()) {
                window.open(this.krameriusApiService.getFullJpegUrl(this.getRightPage().uuid), '_blank');
            }*/
        }
    }

    generatePdf() {
        this.showPdfDialog('generate');
    }

    prepareToPrint() {
        this.showPdfDialog('prepare');
    }

    cancelFulltext() {
        const currentPage = this.getPage();
        this.refreshPages();
        if (currentPage) {
            this.goToPageWithUuid(currentPage.uuid);
        } else {
            this.goToPageOnIndex(0);
        }
    }

    refreshPages() {
        let index = 0;
        this.pages = [];
        for (const page of this.allPages) {
            page.selected = false;
            page.hidden = false;
            page.index = index;
            index += 1;
            this.pages.push(page);
        }
    }

    fulltextAllPagesChanged(pageUuid: string = null) {
        const currentPage = this.getPage();
        let uuid;
        if (pageUuid) {
            uuid = pageUuid;
        } else if (currentPage) {
            uuid = currentPage.uuid;
        }
        if (this.fulltextAllPages) {
            this.pages = this.allPages;
        } else {
            this.pages = this.ftPages;
        }
        if (this.pages.length < 1) {
            this.location.go(this.appSettings.getPathPrefix() + '/view/' + this.uuid, 'fulltext=' + this.fulltextQuery);
            this.publishNewPages(BookPageState.NoResults);
        } else {
            let index = 0;
            let pageIndex = 0;

            for (const page of this.pages) {
                page.selected = false;
                page.index = index;
                if (uuid && page.uuid === uuid) {
                    pageIndex = index;
                }
                index += 1;
            }
            this.goToPageOnIndex(pageIndex);
        }
    }

    fulltextChanged(query: string, pageUuid: string = null) {
        this.fulltextQuery = query;
        this.fulltextAllPages = false;
        this.publishNewPages(BookPageState.Loading);
        if (!query) {
            this.cancelFulltext();
            return;
        }
        this.krameriusApiService.getFulltextUuidList(this.uuid, query).subscribe(result => {
            this.ftPages = [];
            let index = 0;
            for (const page of this.allPages) {
                page.hidden = true;
                for (const uuid of result) {
                    if (uuid === page.uuid) {
                        page.selected = false;
                        page.index = index;
                        page.hidden = false;
                        index += 1;
                        this.ftPages.push(page);
                        break;
                    }
                }
            }
            this.fulltextAllPagesChanged(pageUuid);
        });
    }


    private showPdfDialog(type: string) {
        if (this.isPrivate && this.metadata.model === 'sheetmusic') {
            this.modalService.open(SimpleDialogComponent, {
                title: 'common.warning',
                message: 'dialogs.private_sheetmusic.message',
                button: 'common.close'
            });
        } else if (this.isPageInaccessible() && type === 'generate') { //this.isPrivate
            this.modalService.open(SimpleDialogComponent, {
                title: 'common.warning',
                message: 'dialogs.private_document_pdf.message',
                button: 'common.close'
            });
        } else {
            this.modalService.open(DialogPdfComponent, {
                pageCount: this.getPageCount(),
                currentPage: this.getPage().index,
                doublePage: this.doublePage,
                maxPageCount: 60,
                uuids: this.uuids(),
                type: type,
                name: this.metadata.getShortTitle()
            });
        }
    }

    private uuids(): string[] {
        const uuids = [];
        for (const page of this.pages) {
            uuids.push(page.uuid);
        }
        return uuids;
    }

    toggleDoublePage() {
        this.doublePageEnabled = !this.doublePageEnabled;
        this.localStorageService.setProperty(LocalStorageService.DOUBLE_PAGE, this.doublePageEnabled ? '1' : '0');
        this.goToPage(this.getPage());
    }

    doublePageSupported() {
        return !this.fulltextQuery && this.getPage() && (this.getPage().position === PagePosition.Left || this.getPage().position === PagePosition.Right);
    }

    goToPageOnIndex(index: number, replaceState = false) {
        this.viewer = 'image';
        if (index >= this.pages.length) {
            return;
        }
        const lastLeftPage = this.getPage();
        if (lastLeftPage) {
            lastLeftPage.selected = false;
        }
        const lastRightPage = this.getRightPage();
        if (lastRightPage) {
            lastRightPage.selected = false;
        }
        const position = this.pages[index].position;
        if (position === PagePosition.Single || !this.doublePageEnabled || this.fulltextQuery) {
            this.activePageIndex = index;
            this.doublePage = false;
        } else if (position === PagePosition.Left) {
            this.activePageIndex = index;
            this.doublePage = true;
        } else if (position === PagePosition.Right) {
            this.activePageIndex = index - 1;
            this.doublePage = true;
        }
        const page = this.getPage();
        page.selected = true;
        let pages = page.number + '';
        const rightPage = this.getRightPage();
        let cached = page.cached();
        if (rightPage) {
            rightPage.selected = true;
            cached = cached && rightPage.cached();
            pages += '-' + rightPage.number;
        }
        if (this.metadata) {
            this.metadata.activePages = pages;
        }
        // if (!this.article) {
        let urlQuery = 'page=' + page.uuid;
        if (this.fulltextQuery) {
            urlQuery += '&fulltext=' + this.fulltextQuery;
        }
        if (replaceState) {
            this.location.replaceState(this.appSettings.getPathPrefix() + '/view/' + this.uuid, urlQuery);
        } else {
            this.location.go(this.appSettings.getPathPrefix() + '/view/' + this.uuid, urlQuery);
        }
        // }
        this.lastIndex = index;
        if (!cached) {
            this.publishNewPages(BookPageState.Loading);
            this.fetchPageData(page, rightPage);
        } else {
            if (page.imageType === PageImageType.PDF) {
                this.onPdfPageSelected(page, rightPage);
            } else {
                this.publishNewPages(BookPageState.Success);
            }
        }
    }


    isPageInaccessible() {
        return this.pageState === BookPageState.Inaccessible;
    }

    isPageFailure() {
        return this.pageState === BookPageState.Failure;
    }

    isDocLoading() {
        return this.bookState === BookState.Loading;
    }

    isPageLoading() {
        return this.pageState === BookPageState.Loading;
    }

    noFulltextResults() {
        return this.pageState === BookPageState.NoResults;
    }

    changeNavigationTab(tab: string) {
        if (this.activeNavigationTab === tab) {
            return;
        }
        if (this.metadata) {
            this.metadata.article = null;
            this.metadata.internalPart = null;
        }
        if (tab === 'pages') {
            this.article = null;
            this.internalPart = null;
            // if (this.activeNavigationTab === 'articles') {
            //     this.refreshPages();
            //     this.goToPageOnIndex(0);
            // }
        } else if (tab === 'articles') {
            this.fulltextQuery = null;
            this.fulltextAllPages = false;
            // this.onArticleSelected(this.articles[0]);
        } else if (tab === 'internalparts') {
            this.fulltextQuery = null;
            this.fulltextAllPages = false;
            // this.onInternalPartSelected(this.internalParts[0]);
        }
        this.activeNavigationTab = tab;
    }

    onInternalPartSelected(internalPart: InternalPart) {
        this.pdf = null;
        this.pdfPath = null;
        this.pageState = BookPageState.Loading;
        this.internalPart = internalPart;
        if (!internalPart.metadata) {
            forkJoin([this.krameriusApiService.getItem(internalPart.uuid), this.krameriusApiService.getMods(internalPart.uuid)]).subscribe(([item, mods]: [DocumentItem, any]) => {
                if (this.metadata) {
                    this.metadata.addMods('internalpart', mods);
                }
                this.onInternalPartLoaded(internalPart);
                internalPart.metadata = this.modsParserService.parse(mods, internalPart.uuid);
            });
        } else {
            this.onInternalPartLoaded(internalPart);
        }
    }

    private onInternalPartLoaded(internalPart: InternalPart) {
        this.metadata.internalPart = internalPart;
        if (internalPart.firstPageUuid) {
            this.pageState = BookPageState.Success;
            this.goToPageWithUuid(internalPart.firstPageUuid);
        } else {
            this.publishNewPages(BookPageState.Loading);
            this.krameriusApiService.getChildren(internalPart.uuid).subscribe(children => {
                if (children && children.length > 0) {
                    internalPart.firstPageUuid = children[0]['pid'];
                }
                this.pageState = BookPageState.Success;
                this.goToPageWithUuid(internalPart.firstPageUuid);
            });
        }
    }


    onArticleSelected(article: Article) {
        this.pdf = null;
        this.pdfPath = null;
        this.pageState = BookPageState.Loading;
        this.article = article;
        if (article.type === 'none') {
            forkJoin([this.krameriusApiService.getItem(article.uuid), this.krameriusApiService.getMods(article.uuid)]).subscribe(([item, mods]: [DocumentItem, any]) => {
                if (this.metadata) {
                    this.metadata.addMods('article', mods);
                }
                article.type = item.pdf ? 'pdf' : 'pages';
                this.onArticleLoaded(article);
                article.metadata = this.modsParserService.parse(mods, article.uuid);
            });
        } else {
            this.onArticleLoaded(article);
        }
    }

    private onArticleLoaded(article: Article) {
        this.metadata.article = article;
        if (article.type === 'pdf') {
            let urlQuery = 'article=' + article.uuid;
            if (this.fulltextQuery) {
                urlQuery += '&fulltext=' + this.fulltextQuery;
            }
            this.location.go(this.appSettings.getPathPrefix() + '/view/' + this.uuid, urlQuery);
            this.assignPdfPath(article.uuid);
        } else if (article.type === 'pages') {
            if (article.firstPageUuid) {
                this.pageState = BookPageState.Success;
                this.goToPageWithUuid(article.firstPageUuid);
            } else {
                this.publishNewPages(BookPageState.Loading);
                this.krameriusApiService.getChildren(article.uuid).subscribe(children => {
                    if (children && children.length > 0) {
                        article.firstPageUuid = children[0]['pid'];
                    }
                    this.pageState = BookPageState.Success;
                    this.goToPageWithUuid(article.firstPageUuid);
                });
            }
        }
    }

    private fetchPageData(leftPage: Page, rightPage: Page) {
        const itemRequests = [];
        itemRequests.push(this.krameriusApiService.getPageItem(leftPage.uuid));
        if (rightPage) {
            itemRequests.push(this.krameriusApiService.getPageItem(rightPage.uuid));
        }
        forkJoin(itemRequests).subscribe(result => {
            leftPage.assignPageData(result[0]);
            if (rightPage) {
                rightPage.assignPageData(result[1]);
            }
            this.dnntMode = leftPage.providedByDnnt || (rightPage && rightPage.providedByDnnt);
            this.dnntFlag = leftPage.dnntFlag || (rightPage && rightPage.dnntFlag);
            // this.iiifEnabled = !!leftPage.iiif;
            if (leftPage.imageType === PageImageType.None) {
                this.publishNewPages(BookPageState.Failure);
            } else if (leftPage.imageType === PageImageType.PDF) {
                this.onPdfPageSelected(leftPage, rightPage);
            } else if (leftPage.imageType === PageImageType.ZOOMIFY) {
                this.fetchZoomifyData(leftPage, rightPage);
            } else if (leftPage.imageType === PageImageType.JPEG) {
                this.fetchJpegData(leftPage, rightPage, true);
            }
        },
        (error: AppError)  => {
            if (error instanceof UnauthorizedError) {
                this.publishNewPages(BookPageState.Inaccessible);
            } else {
                this.publishNewPages(BookPageState.Failure);
            }
        });
    }


    private onPdfPageSelected(leftPage: Page, rightPage: Page) {
        if (rightPage) {
            rightPage.selected = false;
        }
        this.doublePageEnabled = false;
        this.assignPdfPath(leftPage.uuid);
    }


    private fetchJpegData(leftPage: Page, rightPage: Page, left: boolean) {
        const page = left ? leftPage : rightPage;
        const url = this.krameriusApiService.getScaledJpegUrl(page.uuid, 3000);
        const image = new Image();
        image.onload = (() => {
            page.assignJpegData(image.width, image.height, url);
            if (left && rightPage && rightPage.imageType === PageImageType.JPEG) {
                this.fetchJpegData(leftPage, rightPage, false);
            } else {
                this.publishNewPages(BookPageState.Success);

            }
        });
        image.onerror = (() => {
            image.onerror = null;
            this.publishNewPages(BookPageState.Inaccessible);
        });
        image.src = url;
    }


    private fetchZoomifyData(leftPage: Page, rightPage: Page) {
        const zRequests = [];
        zRequests.push(this.krameriusApiService.getZoomifyProperties(leftPage.url));
        if (rightPage && rightPage.imageType === PageImageType.ZOOMIFY) {
            zRequests.push(this.krameriusApiService.getZoomifyProperties(rightPage.url));
        }
        forkJoin(zRequests).subscribe(zResult => {
            leftPage.assignZoomifyData(zResult[0]);
            if (rightPage && zResult.length >= 2) {
                rightPage.assignZoomifyData(zResult[1]);
            }
            this.publishNewPages(BookPageState.Success);
        },
        (error: AppError)  => {
            if (error instanceof UnauthorizedError) {
                if (this.doublePage && rightPage) {
                    this.doublePageEnabled = false;
                    this.goToPageOnIndex(this.lastIndex);
                } else {
                    this.publishNewPages(BookPageState.Inaccessible);
                }
            } else {
                this.publishNewPages(BookPageState.Failure);
            }
        });
    }


    private publishNewPages(state: BookPageState) {
        const leftPage = this.getPage();
        const rightPage = this.getRightPage();
        if (leftPage) {
            leftPage.altoBoxes = null;
        }
        if (rightPage) {
            rightPage.altoBoxes = null;
        }
        if (state !== BookPageState.Success) {
            if (leftPage) {
                leftPage.clear();
            }
            if (rightPage) {
                rightPage.clear();
            }
        }
        this.pageState = state;
        if (state === BookPageState.Success && this.fulltextQuery) {
            this.krameriusApiService.getAlto(leftPage.uuid).subscribe(response => {
                const boxes = this.altoService.getBoxes(response, this.fulltextQuery, leftPage.width, leftPage.height);
                leftPage.altoBoxes = boxes;
                this.subject.next([leftPage, rightPage]);
            }, error => {
                this.subject.next([leftPage, rightPage]);
            });
        } else {
            this.subject.next([leftPage, rightPage]);
        }
    }


    clear() {
        this.pdf = null;
        this.pdfPath = null;
        this.bookState = BookState.None;
        this.pageState = BookPageState.None;
        this.doublePage = false;
        this.activeMobilePanel = 'viewer';
        this.pages = [];
        this.allPages = [];
        this.articles = [];
        this.article = null;
        this.internalParts = [];
        this.internalPart = null;
        this.activeNavigationTab = 'pages';
        this.navigationTabsCount = 0;
        this.showNavigationPanel = false;
        this.viewer = 'none';
        this.dnntMode = false;
        this.dnntFlag = false;
        this.iiifEnabled = false;
    }


    private computeDoublePageBounds(pageCount: number, titlePage: number, lastSingle: number, firstBackSingle: number) {
        const count = pageCount;
        let dblFirst = -1;
        let dblLast = -1;
        if (count < 2) {
          return null;
        }
        if (titlePage === 0) {
          // title page is the very first page - the first left page should be the second page;
          dblFirst = 1;
        } else if (titlePage === -1) {
          // there is no title page
          if (lastSingle === -1) {
            // there are neither single pages nor title pages
            dblFirst = 0;
          } else {
            // there is no title page. Some single pages are presented
            if (lastSingle < count - 1) {
              // the first double page should be the one after the last sigle page
              dblFirst = lastSingle + 1;
            } else {
              // last single page is also the very last page in the document - no double pages
              return null;
            }
          }
        } else {
          // there is at least one title page
          if (lastSingle > titlePage) {
            lastSingle = titlePage - 1;
          }
          let f = lastSingle + 1;
          const d = titlePage - f;
          if (d % 2 === 0) {
            f = f + 1;
          }
          dblFirst = f;
        }
        // handle last double page;
        if (dblFirst === -1 || dblFirst >= count - 1) {
            return null;
        }
        if (firstBackSingle === -1) {
            firstBackSingle = count;
        }
        let l = firstBackSingle - 1;
        const d = l - dblFirst;
        if (d % 2 === 0) {
          l = l - 1;
        }
        dblLast = l;
        if (dblLast - dblFirst < 1) {
            return null;
        }
        return[dblFirst, dblLast];
    }


}


export enum BookPageState {
    Success, Loading, Inaccessible, Failure, NoResults, None
}

export enum BookState {
    Success, Loading, Failure, None
}

export interface BookParams {
    uuid: string;
    pageUuid: string;
    articleUuid: string;
    internalPartUuid: string;
    fulltext: string;
}
